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
        // Debounce: Prevent multiple rapid calls
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        
        this.debounceTimer = setTimeout(async () => {
            if (this.isDetecting) return;
            this.isDetecting = true;
            
            try {
                // Update UI to loading state if element exists
                this.updateStatusUI('loading');
                
                // 1. Check Cache First (Fast Path)
                const cached = this.getCachedLocation();
                if (cached) {
                    console.log('[AutoLocation] Using cached location:', cached);
                    this.updateGlobalLocationState(cached);
                    // Background refresh translation
                    this.fetchAutoSelectTranslations(cached).catch(() => {});
                    this.isDetecting = false;
                    return;
                }

                // 2. Perform Detection
                const location = await this.detectLocation();
                this.updateGlobalLocationState(location);
                
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
    updateGlobalLocationState(location) {
        // 1. Update LocalStorage
        let user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        // Handle null/undefined location
        if (!location) {
            console.warn('[AutoLocation Log] Location data is empty or null');
            location = { regionKey: 'region_unknown' }; // Fallback to unknown
        }

        if (location.regionKey === 'region_unknown') {
            console.warn('[AutoLocation Log] Region is unknown', location);
        }

        if (user.regionKey !== location.regionKey) {
            user.regionKey = location.regionKey;
            localStorage.setItem('currentUser', JSON.stringify(user));
        }

        // 2. Update UI Elements (Right side info area)
        let locationText = this.translateAutoSelect(location);
        
        // Double check if we got a variable name back (should not happen with updated i18n, but safety first)
        if (locationText === 'region_unknown') {
             locationText = window.i18n?.get('region_unknown') || 'Unknown Region';
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
            const detectingText = window.i18n?.get('detecting_location') || 'Detecting...';
            statusEl.innerHTML = `<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> <span data-i18n="detecting_location" style="font-size:12px;color:var(--text-sub);">${detectingText}</span>`;
            
        } else if (status === 'success') {
            const dynamicSpan = document.createElement('span');
            dynamicSpan.className = 'location-highlight';
            dynamicSpan.style.color = 'var(--text-main)';
            dynamicSpan.style.fontWeight = '500';
            
            if (regionKey && regionKey !== 'region_unknown') {
                 dynamicSpan.setAttribute('data-i18n', regionKey);
            }
            dynamicSpan.textContent = text;
            
            statusEl.innerHTML = '';
            statusEl.appendChild(dynamicSpan);
        } else if (status === 'error') {
            const errorText = window.i18n?.get('location_failed') || 'Failed';
            // Add a refresh hint/button for better UX
            const refreshHint = window.i18n?.get('click_to_retry') || 'Tap to retry';
            statusEl.innerHTML = `
                <span class="location-error" style="color:var(--danger-color);font-size:12px;" data-i18n="location_failed">${errorText}</span>
                <span style="font-size:10px;color:var(--text-sub);margin-left:4px;">(<span data-i18n="click_to_retry">${refreshHint}</span>)</span>
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
            
            // 3. Reverse Geocode
            const locationData = await this.reverseGeocode(coords.latitude, coords.longitude);
            
            // 4. Cache Result
            this.cacheLocation(locationData);
            
            // Trigger translation fetch
            await this.fetchAutoSelectTranslations(locationData);
            
            return locationData;
        } catch (error) {
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
                throw error; 
            }
        }
    }

    /**
      * Simulate IP Location Fallback
      */
     async getIPLocation() {
         try {
             // Use a free IP Geolocation API (e.g., ipapi.co)
             // Added timeout to prevent hanging
             const controller = new AbortController();
             const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

             const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
             clearTimeout(timeoutId);

             if (!response.ok) {
                 throw new Error('IP Geolocation failed');
             }
             const data = await response.json();
             
             // Validate data
             if (!data.city && !data.region) {
                 throw new Error('Incomplete IP location data');
             }
             
             // Try to find a matching region key from known regions (naive matching)
            // In a real app, you'd have a mapping table or use geocoding API that returns standard codes
            let regionKey = 'region_unknown';
            
            // Try to match city name to a region key
            if (data.city) {
                const potentialKey = `region_${data.city.toLowerCase().replace(/\s+/g, '_')}`;
                // Check if this key exists in i18n (check EN as base)
                if (window.i18n && window.i18n.translations && window.i18n.translations['en'] && window.i18n.translations['en'][potentialKey]) {
                    regionKey = potentialKey;
                }
            }
            
            return {
                regionKey: regionKey,
                 label: data.city || data.region,
                 province: data.region || '',
                 city: data.city || '',
                 district: ''
             };
         } catch (error) {
             console.warn('[AutoLocation] IP Location API failed, falling back to mock:', error);
             
             // Fallback if API fails (e.g., ad blocker, rate limit, network error)
             // Return null or empty strings to indicate failure to UI, rather than "Unknown"
             // Or throw error to let UI handle "Location failed"
             throw error; 
         }
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
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock Logic based on simple coordinate ranges or random for demo
        // This is where you'd call: fetch(`/api/v1/weather/geocode?lat=${lat}&lon=${lon}`)
        
        // For demonstration, we'll return a fixed location or random based on inputs
        // to show the UI update.
        
        // Simulate a successful lookup for "Shanghai" if coordinates are roughly in China/East
        // Otherwise default to New York or similar.
        
        // Simple heuristic: 
        // Lat > 30 && Lat < 32 && Lon > 120 && Lon < 122 -> Shanghai
        
        let result = {
            regionKey: 'region_new_york',
            label: 'New York',
            province: 'New York',
            city: 'New York City',
            district: 'Manhattan'
        };

        // If we are actually in the browser and not mocking coords, this might vary.
        // For the purpose of the user request, we return a structured object.
        
        // Note: The user requested "Province - City - District".
        
        // Let's verify if we can fetch from the mock backend endpoint we defined in API docs
        // Since there is no real backend, we will simulate the response structure here.
        
        // Mock response for Shanghai (approx coords)
        if ((lat > 30 && lat < 32 && lon > 120 && lon < 122) || (lat === undefined)) {
             result = {
                regionKey: 'region_shanghai',
                label: 'Shanghai',
                province: 'Shanghai',
                city: 'Shanghai',
                district: 'Huangpu'
            };
        }

        return result;
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
             return i18n?.get('location_empty') || 'Location info not acquired';
        }
        
        // Use i18n system as our "cache" and translation service
        if (!i18n) return locationData.label || '';
        
        // 1. Check if we have a direct regionKey translation
        if (locationData.regionKey && i18n.get(locationData.regionKey) !== locationData.regionKey) {
            return i18n.get(locationData.regionKey);
        }
        
        // If regionKey is region_unknown but no translation found (should be covered by step 1 if JSON is correct)
        if (locationData.regionKey === 'region_unknown') {
            return i18n.get('region_unknown');
        }
        
        // 2. Translate components
        let city = locationData.city;
        let province = locationData.province;
        
        // Get API Cache
        const cache = this.getTranslationCache();

        const mapTerm = (term, type) => {
            if (!term) return term;
            
            // Special cases
            if (term === 'IP City' || term === 'Unknown City' || term === 'IP 城市') return i18n.get('location_ip_city') || term;
            if (term === 'Unknown Province' || term === 'Unknown Region' || term === '未知省份') return i18n.get('location_unknown_province') || term;
            
            const lower = term.toLowerCase();
            
            // A. Check API Cache
            const cacheKey = `${type === 'city' ? 'city_' : 'prov_'}${lower}`;
            if (cache[cacheKey]) return cache[cacheKey];
            
            // B. Check Static Map (regionMapping)
            const mapKey = i18n.regionMapping?.[type === 'city' ? 'cities' : 'provinces']?.[lower];
            if (mapKey && i18n.get(mapKey)) return i18n.get(mapKey);

            return term;
        };

        city = mapTerm(city, 'city');
        province = mapTerm(province, 'province');
        
        // If we have both city and province
        if (city && province) {
             if (city === province) return city;
             return `${city}·${province}`;
        }
        
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
