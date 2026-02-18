const regionMapping = {
    // Mapping lowercase normalized names to translation keys
    cities: {
        'shanghai': 'city_Shanghai',
        'beijing': 'city_Beijing',
        'guangzhou': 'city_Guangzhou',
        'shenzhen': 'city_Shenzhen',
        'hangzhou': 'city_Hangzhou',
        'chengdu': 'city_Chengdu',
        'wuhan': 'city_Wuhan',
        'nanjing': 'city_Nanjing',
        'chongqing': 'city_Chongqing',
        'tianjin': 'city_Tianjin',
        'suzhou': 'city_Suzhou',
        'xian': 'city_Xian',
        'xi\'an': 'city_Xian',
        'new york': 'city_New_York',
        'new york city': 'city_New_York',
        'london': 'city_London',
        'paris': 'city_Paris',
        'tokyo': 'city_Tokyo',
        'los angeles': 'city_Los_Angeles',
        'chicago': 'city_Chicago',
        'toronto': 'city_Toronto',
        'berlin': 'city_Berlin',
        'milan': 'city_Milan',
        'seoul': 'city_Seoul',
        'bangkok': 'city_Bangkok',
        'dubai': 'city_Dubai',
        'mumbai': 'city_Mumbai',
        'sydney': 'city_Sydney',
        'singapore': 'city_Singapore'
    },
    provinces: {
        'shanghai': 'province_Shanghai',
        'beijing': 'province_Beijing',
        'guangdong': 'province_Guangdong',
        'zhejiang': 'province_Zhejiang',
        'sichuan': 'province_Sichuan',
        'hubei': 'province_Hubei',
        'jiangsu': 'province_Jiangsu',
        'shaanxi': 'province_Shaanxi',
        'new york': 'province_New_York',
        'greater london': 'province_Greater_London',
        'ile-de-france': 'province_Ile_de_France',
        'tokyo': 'province_Tokyo',
        'california': 'province_California',
        'illinois': 'province_Illinois',
        'ontario': 'province_Ontario',
        'berlin': 'province_Berlin',
        'lombardy': 'province_Lombardy',
        'seoul': 'province_Seoul',
        'bangkok': 'province_Bangkok',
        'dubai': 'province_Dubai',
        'maharashtra': 'province_Maharashtra',
        'new south wales': 'province_New_South_Wales',
        'singapore': 'province_Singapore'
    }
};

class I18n {
    constructor() {
        this.translations = {};
        this.regionMapping = regionMapping;
        
        // Detect system language
        const systemLang = navigator.language || navigator.userLanguage;
        // Default to zh-CN only if system is Chinese, otherwise English
        const defaultLang = systemLang.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
        
        this.locale = localStorage.getItem('app_language') || defaultLang;
        this.loaded = false;

        // Start loading translations
        this.loadTranslations(this.locale);
        
        // Setup listener for dynamic content updates
        document.addEventListener('DOMContentLoaded', () => {
            if (this.loaded) {
                this.init();
            }
            // If not loaded yet, init() will be called after loadTranslations
        });
    }

    async loadTranslations(lang) {
        const filename = lang === 'en' ? 'en-US.json' : `${lang}.json`;
        try {
            const response = await fetch(filename);
            if (!response.ok) throw new Error(`Failed to load ${filename}`);
            const data = await response.json();
            
            this.translations[lang] = data;
            this.locale = lang;
            this.loaded = true;
            localStorage.setItem('app_language', lang);
            
            // If DOM is ready, initialize
            if (document.readyState !== 'loading') {
                this.init();
            }
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('i18nReady', { detail: { language: lang } }));
            
        } catch (error) {
            console.error('[I18n] Load error:', error);
            // Fallback to en if zh-CN fails, or just log error
            if (lang !== 'en') {
                console.log('[I18n] Falling back to en');
                this.loadTranslations('en');
            }
        }
    }

    init() {
        this.updatePage();
        this.setupLanguageSwitcher();
        // Post-load consistency check
        setTimeout(() => this.consistencyCheck(), 100);
    }
    
    consistencyCheck() {
        if (!this.translations[this.locale]) return;
        
        // Scan for untranslated elements and force update
        const elements = document.querySelectorAll('[data-i18n], [data-i18n-placeholder]');
        let fixCount = 0;
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const placeholderKey = el.getAttribute('data-i18n-placeholder');
            
            if (key) {
                const translation = this.translations[this.locale][key];
                const currentText = el.tagName === 'INPUT' ? el.placeholder : el.innerText;
                
                if (translation && currentText !== translation) {
                    if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                        el.placeholder = translation;
                    } else {
                        el.innerText = translation;
                    }
                    fixCount++;
                }
            }
            
            if (placeholderKey) {
                const translation = this.translations[this.locale][placeholderKey];
                if (translation && el.getAttribute('placeholder') !== translation) {
                    el.setAttribute('placeholder', translation);
                    fixCount++;
                }
            }
        });
        
        if (fixCount > 0) {
            console.log(`[I18n] Consistency check: Fixed ${fixCount} untranslated elements.`);
        }
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.locale = lang;
            localStorage.setItem('app_language', lang);
            this.updatePage();
            this.updateSwitcherState();
        } else {
            this.loadTranslations(lang);
        }
    }

    updatePage() {
        if (!this.translations[this.locale]) return;

        // Update document title if needed
        // document.title = this.translations[this.locale]['page_title_' + document.body.dataset.pageId] || document.title;
        
        // Use fresh query selector to catch dynamically added elements
        const elements = document.querySelectorAll('[data-i18n], [data-i18n-placeholder]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const placeholderKey = el.getAttribute('data-i18n-placeholder');
            
            if (key) {
                const translation = this.translations[this.locale][key];
                if (translation) {
                    if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                        el.placeholder = translation;
                    } else {
                        el.innerText = translation;
                    }
                }
            }
            
            if (placeholderKey) {
                const translation = this.translations[this.locale][placeholderKey];
                if (translation) {
                    el.setAttribute('placeholder', translation);
                }
            }
        });
        
        // Handle dynamic location text
        const dynamicElements = document.querySelectorAll('[data-i18n-dynamic="true"]');
        dynamicElements.forEach(el => {
            const prefixKey = el.getAttribute('data-prefix-key');
            let locationText = el.getAttribute('data-location-text');
            
            // If the element has a stored region key, use that
            if (el.dataset.regionKey && this.translations[this.locale][el.dataset.regionKey]) {
                locationText = this.translations[this.locale][el.dataset.regionKey];
            }

            const prefix = (prefixKey && this.translations[this.locale][prefixKey]) || '';
            el.innerHTML = `${prefix}${locationText}`;
        });
        
        // Dispatch event for other components to listen
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: this.locale } }));
    }

    get(key, params = {}) {
        if (!this.translations[this.locale]) return key;
        
        let text = this.translations[this.locale][key] || key;
        for (const prop in params) {
            text = text.replace(new RegExp('{' + prop + '}', 'g'), params[prop]);
        }
        return text;
    }

    setupLanguageSwitcher() {
        const radios = document.querySelectorAll('input[name="language"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.setLanguage(e.target.value);
                }
            });
        });
        this.updateSwitcherState();
        
        // Legacy button support (optional/cleanup)
        const switchBtn = document.getElementById('language-switch-btn');
        if (switchBtn) {
            switchBtn.onclick = () => {
                const newLang = this.locale === 'en' ? 'zh-CN' : 'en';
                this.setLanguage(newLang);
            };
        }
    }
    
    updateSwitcherState() {
        const radios = document.querySelectorAll('input[name="language"]');
        radios.forEach(radio => {
            if (radio.value === this.locale) {
                radio.checked = true;
            }
        });

        const switchBtn = document.getElementById('language-switch-btn');
        const statusText = document.getElementById('language-status');
        if (switchBtn && statusText) {
            statusText.innerText = this.locale === 'en' ? 'English' : '中文';
        }
    }
}

// Initialize immediately so window.i18n is available for other scripts
window.i18n = new I18n();
