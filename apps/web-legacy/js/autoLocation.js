/**
 * Auto Location Service
 * Handles geolocation, reverse geocoding (simulated), and caching.
 * Implements Singleton pattern for centralized state management.
 */
class AutoLocationService {
    constructor() {
        if (AutoLocationService.instance) {
            return AutoLocationService.instance;
        }
        this.STORAGE_KEY = 'autoLocation_SmartWardrobe';
        this.API_CACHE_KEY = 'autoSelect_translations_cache';
        this.CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
        this.TIMEOUT = 10000; // Increased to 10s for mobile permission dialogs
        
        // State Management
        this.isDetecting = false;
        this.debounceTimer = null;
        
        AutoLocationService.instance = this;
    }

    /**
     * Global entry point for auto location.
     * Handles debounce, cache check, and DOM updates.
     */
    async initAutoLocation() {
        let options = {};
        if (arguments.length === 1 && typeof arguments[0] === 'object' && arguments[0] !== null) {
            options = arguments[0];
        }
        const force = Boolean(options.force);

        // Debounce: Prevent multiple rapid calls
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        
        this.debounceTimer = setTimeout(async () => {
            if (this.isDetecting) return;
            this.isDetecting = true;
            
            try {
                const user = this.getCurrentUser();
                if (!force && user.regionSource === 'manual' && user.regionKey && user.regionKey !== 'region.unknown') {
                    const text = window.t ? window.t(user.regionKey) : user.regionKey;
                    this.updateStatusUI('success', text, user.regionKey);
                    this.isDetecting = false;
                    return;
                }

                // Update UI to loading state if element exists
                this.updateStatusUI('loading');
                
                // 1. Check Cache First (Fast Path)
                const cached = this.getCachedLocation();
                if (cached) {
                    console.log('[AutoLocation] Using cached location:', cached);
                    this.updateGlobalLocationState(cached, { force });
                    // Background refresh translation
                    this.fetchAutoSelectTranslations(cached).catch(() => {});
                    this.isDetecting = false;
                    return;
                }

                // 2. Perform Detection
                const location = await this.detectLocation();
                this.updateGlobalLocationState(location, { force });
                
            } catch (error) {
                console.warn('[AutoLocation] Global init failed:', error);
                this.updateStatusUI('error');
            } finally {
                this.isDetecting = false;
            }
        }, 300); // 300ms debounce
    }

    /**
     * Centralized DOM updater for location display
     */
    updateGlobalLocationState(location, options = {}) {
        const force = Boolean(options.force);
        // 1. Update LocalStorage
        let user = this.getCurrentUser();
        // Handle null/undefined location
        if (!location) {
            console.warn('[AutoLocation Log] Location data is empty or null');
            location = { regionKey: 'region.unknown' };
        }

        if (!force && user.regionSource === 'manual' && user.regionKey && user.regionKey !== 'region.unknown') {
            const text = window.t ? window.t(user.regionKey) : user.regionKey;
            const regionEl = document.getElementById('current-region');
            if (regionEl) {
                regionEl.textContent = text;
                regionEl.setAttribute('data-i18n', user.regionKey);
            }
            this.updateStatusUI('success', text, user.regionKey);
            return;
        }

        if (location.regionKey === 'region.unknown') {
            console.warn('[AutoLocation Log] Region is unknown', location);
        }

        if (user.regionKey !== location.regionKey) {
            user.regionKey = location.regionKey;
            user.regionSource = 'auto';
            this.setCurrentUser(user);
        }

        // 2. Update UI Elements (Right side info area)
        let locationText = this.translateAutoSelect(location);
        
        // Double check if we got a variable name back (should not happen with updated i18n, but safety first)
        if (locationText === 'region.unknown') {
             locationText = window.t('region.unknown');
        }

        // Update span in profile page if exists
        const regionEl = document.getElementById('current-region');
        if (regionEl) {
            regionEl.textContent = locationText;
            if (location.regionKey) regionEl.setAttribute('data-i18n', location.regionKey);
        }

        // Update auto-select button status area if exists
        this.updateStatusUI('success', locationText, location.regionKey);
    }

    updateStatusUI(status, text = '', regionKey = '') {
        const statusEl = document.getElementById('auto-location-status');
        if (!statusEl) return;

        if (status === 'loading') {
            // Only show spinner if not already showing something useful
            // Force spinner when reloading
            const detectingText = window.t('region.status.detecting');
            statusEl.innerHTML = `<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> <span data-i18n="region.status.detecting" style="font-size:12px;color:var(--text-sub);">${detectingText}</span>`;
            
        } else if (status === 'success') {
            const dynamicSpan = document.createElement('span');
            dynamicSpan.className = 'location-highlight';
            dynamicSpan.style.color = 'var(--text-main)';
            dynamicSpan.style.fontWeight = '500';
            
            if (regionKey && regionKey !== 'region.unknown') {
                 dynamicSpan.setAttribute('data-i18n', regionKey);
            }
            dynamicSpan.textContent = text;
            
            statusEl.innerHTML = '';
            statusEl.appendChild(dynamicSpan);
        } else if (status === 'error') {
            const errorText = window.t('region.status.failed');
            // Add a refresh hint/button for better UX
            const refreshHint = window.t('common.tap_to_retry');
            statusEl.innerHTML = `
                <span class="location-error" style="color:var(--danger-color);font-size:12px;" data-i18n="region.status.failed">${errorText}</span>
                <span style="font-size:10px;color:var(--text-sub);margin-left:4px;">(<span data-i18n="common.tap_to_retry">${refreshHint}</span>)</span>
            `;
        }
    }

    /**
     * Core detection logic with retry and timeout
     */
    async detectLocation(retryCount = 0) {
        // 1. Check Cache (Double check in case called directly)
        const cached = this.getCachedLocation();
        if (cached) return cached;

        // 2. Get Coordinates
        try {
            const coordsPromise = this.getCoordinates();
            const coords = await Promise.race([
                coordsPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Geolocation Timeout')), this.TIMEOUT))
            ]);
            
            // 3. Reverse Geocode (soft-fail to keep coords usable for weather)
            let locationData = null;
            try {
                locationData = await this.reverseGeocode(coords.latitude, coords.longitude);
            } catch (reverseError) {
                window.__swAutoLocationDebug = {
                    source: 'reverse_geocode_failed',
                    error: String(reverseError?.message || reverseError),
                    at: Date.now()
                };
                locationData = {
                    regionKey: 'region.unknown',
                    label: '',
                    province: '',
                    city: '',
                    district: '',
                    latitude: coords.latitude,
                    longitude: coords.longitude
                };
            }
            
            // 4. Cache Result
            this.cacheLocation(locationData);
            
            // Trigger translation fetch
            await this.fetchAutoSelectTranslations(locationData);
            
            return locationData;
        } catch (error) {
            window.__swAutoLocationDebug = {
                source: 'geolocation_failed',
                error: String(error?.message || error),
                at: Date.now(),
                retryCount
            };
            // Retry Logic (Max 1 retry)
            if (retryCount < 1) {
                return this.detectLocation(retryCount + 1);
            }
            
            // Degrade to IP Location
            try {
                const ipLocation = await this.getIPLocation();
                this.cacheLocation(ipLocation); 
                await this.fetchAutoSelectTranslations(ipLocation);
                return ipLocation;
            } catch (ipError) {
                window.__swAutoLocationDebug = {
                    source: 'ip_location_failed',
                    error: String(ipError?.message || ipError),
                    at: Date.now()
                };
                throw error; 
            }
        }
    }

    /**
      * Simulate IP Location Fallback
      */
     async getIPLocation() {
         try {
            const requestJson = async (url, timeoutMs) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
                    if (!response.ok) throw new Error(`HTTP_${response.status}`);
                    return await response.json();
                } finally {
                    clearTimeout(timeoutId);
                }
            };

            let data = null;
            let provider = '';

            try {
                provider = 'ipapi.co';
                data = await requestJson('https://ipapi.co/json/', 3500);
            } catch (_) {
                provider = 'ipwho.is';
                data = await requestJson('https://ipwho.is/', 3500);
            }

            const city = data?.city || '';
            const province = data?.region || data?.region_name || data?.state || '';
            const label = city || province || '';
            const latitude = Number(data?.latitude ?? data?.lat ?? NaN);
            const longitude = Number(data?.longitude ?? data?.lon ?? NaN);

            if (!label) throw new Error('Incomplete IP location data');

            let regionKey = 'region.unknown';
            if (city) {
                const potentialKey = `region.preset.${city.toLowerCase().replace(/\s+/g, '_')}`;
                if (window.i18n && window.i18n.translations && window.i18n.translations['en-US'] && window.i18n.translations['en-US'][potentialKey]) {
                    regionKey = potentialKey;
                }
            }

            return {
                regionKey,
                label,
                province,
                city,
                district: '',
                latitude: Number.isFinite(latitude) ? latitude : undefined,
                longitude: Number.isFinite(longitude) ? longitude : undefined,
                ipProvider: provider
            };
         } catch (error) {
             console.warn('[AutoLocation] IP Location API failed, falling back to mock:', error);
             
             // Fallback if API fails (e.g., ad blocker, rate limit, network error)
             // Return null or empty strings to indicate failure to UI, rather than "Unknown"
             // Or throw error to let UI handle "Location failed"
             throw error; 
         }
     }

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('currentUser') || '{}') || {};
        } catch (_) {
            return {};
        }
    }

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user || {}));
    }

    /**
     * Get current coordinates using Geolocation API
     */
    getCoordinates() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('GEOLOCATION_NOT_SUPPORTED'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: this.TIMEOUT,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position.coords),
                (error) => {
                    let code = 'UNKNOWN_ERROR';
                    switch(error.code) {
                        case error.PERMISSION_DENIED: code = 'PERMISSION_DENIED'; break;
                        case error.POSITION_UNAVAILABLE: code = 'POSITION_UNAVAILABLE'; break;
                        case error.TIMEOUT: code = 'TIMEOUT'; break;
                    }
                    reject(new Error(code));
                },
                options
            );
        });
    }

    /**
     * Simulate Reverse Geocoding (Lat/Lon -> Address)
     * In a real app, this would call Google Maps/Amaps/Baidu Maps API
     */
    async reverseGeocode(lat, lon) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`;
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Reverse geocoding failed');
            const data = await response.json();
            const address = data?.address || {};

            const city =
                address.city ||
                address.town ||
                address.village ||
                address.municipality ||
                address.county ||
                '';

            const province =
                address.state ||
                address.region ||
                address.province ||
                '';

            const district =
                address.suburb ||
                address.neighbourhood ||
                address.city_district ||
                address.borough ||
                address.district ||
                '';

            let regionKey = 'region.unknown';
            if (city) {
                const potentialKey = `region.preset.${String(city).toLowerCase().replace(/\s+/g, '_')}`;
                if (window.i18n && window.i18n.translations && window.i18n.translations['en-US'] && window.i18n.translations['en-US'][potentialKey]) {
                    regionKey = potentialKey;
                }
            }

            const labelParts = [district, city, province].filter(Boolean);
            const label = labelParts.length ? labelParts.join('·') : (data?.display_name || '');

            return {
                regionKey,
                label,
                province,
                city,
                district,
                latitude: lat,
                longitude: lon
            };
        } catch (error) {
            clearTimeout(timeoutId);
            await new Promise(resolve => setTimeout(resolve, 800));

            let result = {
                regionKey: 'region.preset.new_york',
                label: '',
                province: 'new york',
                city: 'new york',
                district: '',
                latitude: lat,
                longitude: lon
            };

            if ((lat > 30 && lat < 32 && lon > 120 && lon < 122) || (lat === undefined)) {
                result = {
                    regionKey: 'region_shanghai',
                    label: 'Shanghai',
                    province: 'Shanghai',
                    city: 'Shanghai',
                    district: 'Huangpu',
                    latitude: lat,
                    longitude: lon
                };
            }

            return result;
        }
    }

    /**
     * Cache the location result
     */
    cacheLocation(data) {
        const cacheEntry = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheEntry));
    }

    /**
     * Translate auto-selected location result (Simulates backend /api/v1/i18n/auto-select)
     * @param {Object} locationData
     * @returns {string}
     */
    translateAutoSelect(locationData) {
        const i18n = window.i18n;
        
        if (!locationData) {
             return window.t('region.status.empty');
        }
        
        // Use i18n system as our "cache" and translation service
        if (!i18n) return locationData.label || '';
        
        // 1. Check if we have a direct regionKey translation
        if (locationData.regionKey) {
            const direct = window.t(locationData.regionKey);
            if (direct) return direct;
        }
        
        if (locationData.regionKey === 'region.unknown') {
            return window.t('region.unknown');
        }
        
        // 2. Translate components
        let city = locationData.city;
        let province = locationData.province;
        const district = locationData.district;
        
        // Get API Cache
        const cache = this.getTranslationCache();

        const mapTerm = (term, type) => {
            if (!term) return term;
            
            // Special cases
            if (term === 'IP City' || term === 'IP 城市') return window.t('region.ip_city') || term;
            if (term === 'Unknown City' || term === '未知城市') return window.t('region.unknown_city') || term;
            if (term === 'Unknown Province' || term === 'Unknown Region' || term === '未知省份') return window.t('region.unknown_province') || term;
            
            const lower = term.toLowerCase();
            
            // A. Check API Cache
            const cacheKey = `${type === 'city' ? 'city_' : 'prov_'}${lower}`;
            if (cache[cacheKey]) return cache[cacheKey];
            
            // B. Check Static Map (regionMapping)
            const mapKey = i18n.regionMapping?.[type === 'city' ? 'cities' : 'provinces']?.[lower];
            if (mapKey) {
                const mapped = window.t(mapKey);
                if (mapped) return mapped;
            }

            return term;
        };

        city = mapTerm(city, 'city');
        province = mapTerm(province, 'province');
        
        const parts = [];
        if (district) parts.push(district);
        if (city) parts.push(city);
        if (province && province !== city) parts.push(province);

        if (parts.length) return parts.join('·');

        return city || province || locationData.label || '';
    }

    /**
     * Simulate fetching translations from /api/v1/i18n/auto-select
     * and caching them.
     */
    async fetchAutoSelectTranslations(locationData) {
        if (!locationData) return;
        
        const cache = this.getTranslationCache();
        const cityKey = `city_${locationData.city?.toLowerCase()}`;
        const provKey = `prov_${locationData.province?.toLowerCase()}`;
        
        // If already cached, skip
        if ((!locationData.city || cache[cityKey]) && (!locationData.province || cache[provKey])) {
            return;
        }
        
        console.log('[AutoLocation] Fetching translations from API...');
        // Simulate network delay
        await new Promise(r => setTimeout(r, 500));
        
        const newTranslations = {};
        const i18n = window.i18n;
        
        // Helper to simulate backend translation logic
        const simulateBackendTranslate = (term, type) => {
            if (!term) return null;
            const lower = term.toLowerCase();
            // In a real backend, this would query a DB. Here we use our static map.
            const mapKey = i18n?.regionMapping?.[type === 'city' ? 'cities' : 'provinces']?.[lower];
            if (mapKey && i18n?.translations?.['zh-CN']?.[mapKey]) {
                return i18n.translations['zh-CN'][mapKey];
            }
            return term; // Return original if no translation found
        };

        if (locationData.city) {
            newTranslations[cityKey] = simulateBackendTranslate(locationData.city, 'city');
        }
        if (locationData.province) {
            newTranslations[provKey] = simulateBackendTranslate(locationData.province, 'province');
        }
        
        this.updateTranslationCache(newTranslations);
        console.log('[AutoLocation] Translations cached:', newTranslations);
        
        // Force update UI if needed (optional, but good for UX)
        if (window.i18n && window.i18n.updatePage) {
            window.i18n.updatePage();
        }
    }

    getTranslationCache() {
        try {
            return JSON.parse(localStorage.getItem(this.API_CACHE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    updateTranslationCache(newData) {
        const current = this.getTranslationCache();
        const updated = { ...current, ...newData };
        localStorage.setItem(this.API_CACHE_KEY, JSON.stringify(updated));
    }

    /**
     * Retrieve cached location if valid
     */
    getCachedLocation() {
        const json = localStorage.getItem(this.STORAGE_KEY);
        if (!json) return null;

        try {
            const { data, timestamp } = JSON.parse(json);
            if (Date.now() - timestamp < this.CACHE_DURATION) {
                return data;
            } else {
                localStorage.removeItem(this.STORAGE_KEY);
                return null;
            }
        } catch (e) {
            localStorage.removeItem(this.STORAGE_KEY);
            return null;
        }
    }
    
    /**
     * Clear cache (e.g., when user manually selects a region)
     */
    clearCache() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

// Export singleton
window.autoLocationService = new AutoLocationService();
