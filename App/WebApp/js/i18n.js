const REGION_MAPPING = {
    cities: {
        'shanghai': 'region.city.shanghai',
        'beijing': 'region.city.beijing',
        'guangzhou': 'region.city.guangzhou',
        'shenzhen': 'region.city.shenzhen',
        'hangzhou': 'region.city.hangzhou',
        'chengdu': 'region.city.chengdu',
        'wuhan': 'region.city.wuhan',
        'nanjing': 'region.city.nanjing',
        'chongqing': 'region.city.chongqing',
        'tianjin': 'region.city.tianjin',
        'suzhou': 'region.city.suzhou',
        'xian': 'region.city.xian',
        "xi'an": 'region.city.xian',
        'new york': 'region.city.new_york',
        'new york city': 'region.city.new_york',
        'london': 'region.city.london',
        'paris': 'region.city.paris',
        'tokyo': 'region.city.tokyo',
        'los angeles': 'region.city.los_angeles',
        'chicago': 'region.city.chicago',
        'toronto': 'region.city.toronto',
        'berlin': 'region.city.berlin',
        'milan': 'region.city.milan',
        'seoul': 'region.city.seoul',
        'bangkok': 'region.city.bangkok',
        'dubai': 'region.city.dubai',
        'mumbai': 'region.city.mumbai',
        'sydney': 'region.city.sydney',
        'singapore': 'region.city.singapore'
    },
    provinces: {
        'shanghai': 'region.province.shanghai',
        'beijing': 'region.province.beijing',
        'guangdong': 'region.province.guangdong',
        'zhejiang': 'region.province.zhejiang',
        'sichuan': 'region.province.sichuan',
        'hubei': 'region.province.hubei',
        'jiangsu': 'region.province.jiangsu',
        'shaanxi': 'region.province.shaanxi',
        'new york': 'region.province.new_york',
        'greater london': 'region.province.greater_london',
        'ile-de-france': 'region.province.ile_de_france',
        'tokyo': 'region.province.tokyo',
        'california': 'region.province.california',
        'illinois': 'region.province.illinois',
        'ontario': 'region.province.ontario',
        'berlin': 'region.province.berlin',
        'lombardy': 'region.province.lombardy',
        'seoul': 'region.province.seoul',
        'bangkok': 'region.province.bangkok',
        'dubai': 'region.province.dubai',
        'maharashtra': 'region.province.maharashtra',
        'new south wales': 'region.province.new_south_wales',
        'singapore': 'region.province.singapore'
    }
};

const I18N_API_REFRESH_MS = 60 * 60 * 1000;
const I18N_API_BACKOFF_MS = 2 * 60 * 1000;
const I18N_API_BACKOFF_UNTIL_KEY = 'sw_api_backoff_until';

class I18n {
    constructor() {
        this.translations = {};
        this.regionMapping = REGION_MAPPING;

        const systemLang = navigator.language || navigator.userLanguage || '';
        const defaultLocale = systemLang.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';

        this.locale = localStorage.getItem('app_locale') || defaultLocale;
        this.loaded = false;

        this.installErrorGuards();
        const cached = this.readCache(this.locale);
        if (cached) {
            this.translations[this.locale] = cached;
            this.loaded = true;
        }

        const boot = () => {
            this.init();
            setTimeout(() => {
                this.load(this.locale).catch(() => {});
            }, 0);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
    }

    getCacheKey(locale) {
        return `i18n_pack_${locale}`;
    }

    readCache(locale) {
        try {
            const raw = localStorage.getItem(this.getCacheKey(locale));
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (_) {
            return null;
        }
    }

    writeCache(locale, data) {
        try {
            localStorage.setItem(this.getCacheKey(locale), JSON.stringify(data));
            localStorage.setItem(`${this.getCacheKey(locale)}_at`, String(Date.now()));
        } catch (_) {}
    }

    getCacheTimestamp(locale) {
        try {
            const raw = localStorage.getItem(`${this.getCacheKey(locale)}_at`);
            const ts = Number(raw || '0');
            return Number.isFinite(ts) ? ts : 0;
        } catch (_) {
            return 0;
        }
    }

    isCacheFresh(locale) {
        const ts = this.getCacheTimestamp(locale);
        if (!ts) return false;
        return (Date.now() - ts) < I18N_API_REFRESH_MS;
    }

    getApiBackoffUntil() {
        try {
            const raw = localStorage.getItem(I18N_API_BACKOFF_UNTIL_KEY);
            const ts = Number(raw || '0');
            return Number.isFinite(ts) ? ts : 0;
        } catch (_) {
            return 0;
        }
    }

    setApiBackoff(ms) {
        try {
            localStorage.setItem(I18N_API_BACKOFF_UNTIL_KEY, String(Date.now() + ms));
        } catch (_) {}
    }

    shouldTryApi(locale) {
        let apiAllowed = false;
        try {
            const host = window.location && window.location.hostname;
            const force = localStorage.getItem('sw_api_force') === '1';
            apiAllowed = force || host === 'localhost' || host === '127.0.0.1';
        } catch (_) {
            apiAllowed = false;
        }
        if (!apiAllowed) return false;

        const backoffUntil = this.getApiBackoffUntil();
        if (backoffUntil && backoffUntil > Date.now()) return false;
        if (this.isCacheFresh(locale)) return false;
        return true;
    }

    async fetchFromApi(locale) {
        if (!this.shouldTryApi(locale)) {
            const skipped = new Error('I18N_API_SKIPPED');
            skipped.code = 'SKIPPED';
            throw skipped;
        }
        let response;
        try {
            response = await fetch(`/api/i18n?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' });
        } catch (err) {
            if (err && (err.name === 'AbortError' || String(err).includes('ERR_ABORTED'))) {
                this.setApiBackoff(I18N_API_BACKOFF_MS);
                const aborted = new Error('I18N_ABORTED');
                aborted.code = 'ABORTED';
                throw aborted;
            }
            this.setApiBackoff(I18N_API_BACKOFF_MS);
            throw err;
        }
        if (!response.ok) {
            const error = new Error('I18N_API_ERROR');
            error.status = response.status;
            if (response.status >= 500) {
                this.setApiBackoff(I18N_API_BACKOFF_MS);
            }
            throw error;
        }
        return response.json();
    }

    async fetchFromFile(locale) {
        const filename = locale === 'en-US' ? 'en-US.json' : `${locale}.json`;
        const response = await fetch(filename, { cache: 'no-store' });
        if (!response.ok) {
            const error = new Error('I18N_FILE_ERROR');
            error.status = response.status;
            throw error;
        }
        return response.json();
    }

    async load(locale) {
        const normalized = locale === 'en' ? 'en-US' : locale;

        let data = null;
        try {
            data = await this.fetchFromApi(normalized);
        } catch (err) {
            data = this.readCache(normalized);
            if (!data) {
                try {
                    data = await this.fetchFromFile(normalized);
                } catch (_) {}
            }
        }

        if (!data && normalized !== 'en-US') {
            return this.load('en-US');
        }

        if (!data) return;

        try {
            const fromFile = await this.fetchFromFile(normalized);
            if (fromFile && typeof fromFile === 'object' && data && typeof data === 'object') {
                data = { ...fromFile, ...data };
            }
        } catch (_) {}

        this.translations[normalized] = data;
        this.locale = normalized;
        this.loaded = true;
        localStorage.setItem('app_locale', normalized);
        this.writeCache(normalized, data);

        if (document.readyState !== 'loading') {
            this.updatePage();
            this.updateSwitcherState();
        }

        window.dispatchEvent(new CustomEvent('i18nReady', { detail: { locale: normalized } }));
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: normalized } }));
    }

    installErrorGuards() {
        if (window.__i18n_error_guard_installed) return;
        window.__i18n_error_guard_installed = true;

        const shouldIgnore = (reasonOrMessage) => {
            const msg = String(reasonOrMessage || '');
            if (!msg) return false;
            if (msg.includes('ERR_ABORTED') && msg.includes('/api/i18n')) return true;
            if (msg.includes('ERR_ABORTED') && msg.includes('/api/favorites')) return true;
            if (msg.includes('I18N_ABORTED')) return true;
            if (msg.includes('/api/i18n') && msg.toLowerCase().includes('aborted')) return true;
            return false;
        };

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event && event.reason;
            const msg = reason && (reason.message || String(reason));
            const name = reason && reason.name;
            if (name === 'AbortError' || shouldIgnore(msg)) {
                event.preventDefault();
            }
        });

        window.addEventListener('error', (event) => {
            const msg = event && (event.message || '');
            if (shouldIgnore(msg)) {
                event.preventDefault();
            }
        });
    }

    init() {
        this.setupLanguageSwitcher();
        if (this.loaded) {
            this.updatePage();
            this.updateSwitcherState();
        }
    }

    setLanguage(locale) {
        const normalized = locale === 'en' ? 'en-US' : locale;
        if (normalized === this.locale) return;
        if (this.translations[normalized]) {
            this.locale = normalized;
            localStorage.setItem('app_locale', normalized);
            this.updatePage();
            this.updateSwitcherState();
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: normalized } }));
            return;
        }
        this.load(normalized).catch(() => {});
    }

    t(key, fallback = '', params = {}) {
        const pack = this.translations[this.locale];
        let text = pack ? pack[key] : null;
        if (text == null || text === '') {
            text = fallback || '';
        }
        if (!text) return '';

        let rendered = String(text);
        for (const prop in params) {
            rendered = rendered.replace(new RegExp(`\\{${prop}\\}`, 'g'), String(params[prop]));
        }
        return rendered;
    }

    get(key, params = {}) {
        return this.t(key, '', params);
    }

    updatePage() {
        if (!this.translations[this.locale]) return;

        document.documentElement.setAttribute('lang', this.locale);

        const elements = document.querySelectorAll(
            [
                '[data-i18n]',
                '[data-i18n-placeholder]',
                '[data-i18n-aria-label]',
                '[data-i18n-alt]',
                '[data-i18n-title]',
                '[data-i18n-value]'
            ].join(', ')
        );

        elements.forEach(el => {
            const textKey = el.getAttribute('data-i18n');
            const placeholderKey = el.getAttribute('data-i18n-placeholder');
            const ariaLabelKey = el.getAttribute('data-i18n-aria-label');
            const altKey = el.getAttribute('data-i18n-alt');
            const titleKey = el.getAttribute('data-i18n-title');
            const valueKey = el.getAttribute('data-i18n-value');

            if (textKey) {
                const translation = this.t(textKey);
                if (translation) el.textContent = translation;
            }
            if (placeholderKey) {
                const translation = this.t(placeholderKey);
                if (translation) el.setAttribute('placeholder', translation);
            }
            if (ariaLabelKey) {
                const translation = this.t(ariaLabelKey);
                if (translation) el.setAttribute('aria-label', translation);
            }
            if (altKey) {
                const translation = this.t(altKey);
                if (translation) el.setAttribute('alt', translation);
            }
            if (titleKey) {
                const translation = this.t(titleKey);
                if (translation) el.setAttribute('title', translation);
            }
            if (valueKey) {
                const translation = this.t(valueKey);
                if (translation) el.setAttribute('value', translation);
            }
        });
    }

    setupLanguageSwitcher() {
        const radios = document.querySelectorAll('input[name="language"]');
        if (!radios.length) return;

        let debounceTimer;
        radios.forEach(radio => {
            radio.addEventListener('change', e => {
                if (!e.target.checked) return;
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => this.setLanguage(e.target.value), 150);
            });
        });
        this.updateSwitcherState();
    }

    updateSwitcherState() {
        const radios = document.querySelectorAll('input[name="language"]');
        radios.forEach(radio => {
            radio.checked = radio.value === this.locale;
        });
    }
}

window.i18n = new I18n();
window.t = (key, fallback = '', params = {}) => {
    if (window.i18n && typeof window.i18n.t === 'function') return window.i18n.t(key, fallback, params);
    return fallback || '';
};
