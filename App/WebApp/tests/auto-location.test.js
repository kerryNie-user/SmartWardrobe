
describe('Auto Location & i18n Tests', () => {
    // Setup
    window.localStorage.clear();
    // Initialize services
    window.i18n = new I18n(); 
    window.autoLocationService = new AutoLocationService();

    it('should translate "Unnamed" correctly in zh-CN', () => {
        window.i18n.setLanguage('zh-CN');
        const key = 'autoSelect.unnamed';
        const translation = window.i18n.get(key);
        if (translation !== '未命名') throw new Error(`Expected "未命名", got "${translation}"`);
        
        // Simulate app.js logic
        let displayName = ''; // empty
        let display = displayName;
        if (!displayName || displayName === 'undefined' || displayName.trim() === '') {
            if (window.i18n.locale === 'zh-CN') {
                display = window.i18n.get('autoSelect.unnamed');
            }
        }
        if (display !== '未命名') throw new Error(`Logic failed for empty name in zh-CN`);
    });

    it('should handle empty or unknown location gracefully', () => {
        window.i18n.setLanguage('zh-CN');
        
        // 1. Empty data
        const emptyResult = window.autoLocationService.translateAutoSelect(null);
        if (emptyResult !== '未获取到区域信息') throw new Error(`Expected "未获取到区域信息" for null input, got "${emptyResult}"`);

        // 2. Unknown region
        const unknownResult = window.autoLocationService.translateAutoSelect({ regionKey: 'region_unknown' });
        if (unknownResult !== '未知地区') throw new Error(`Expected "未知地区" for region_unknown, got "${unknownResult}"`);
        
        // Switch to English
        window.i18n.setLanguage('en');
        const emptyResultEn = window.autoLocationService.translateAutoSelect(null);
        if (emptyResultEn !== 'Location info not acquired') throw new Error(`Expected "Location info not acquired" for null input (EN), got "${emptyResultEn}"`);

        const unknownResultEn = window.autoLocationService.translateAutoSelect({ regionKey: 'region_unknown' });
        if (unknownResultEn !== 'Unknown Region') throw new Error(`Expected "Unknown Region" for region_unknown (EN), got "${unknownResultEn}"`);
    });

    it('should NOT translate "Unnamed" in en', () => {
        window.i18n.setLanguage('en');
        const key = 'autoSelect.unnamed';
        const translation = window.i18n.get(key);
        if (translation !== 'Unnamed') throw new Error(`Expected "Unnamed", got "${translation}"`);
        
        let displayName = '';
        let display = displayName;
        if (!displayName || displayName === 'undefined' || displayName.trim() === '') {
            if (window.i18n.locale === 'zh-CN') {
                display = window.i18n.get('autoSelect.unnamed');
            } else {
                display = displayName || ''; 
            }
        }
        if (display !== '') throw new Error(`Logic failed for empty name in en. Expected empty string.`);
    });

    it('should translate "IP City" correctly', () => {
        window.i18n.setLanguage('zh-CN');
        const result = window.autoLocationService.translateAutoSelect({
            city: 'IP City',
            province: 'Unknown Province'
        });
        if (result !== 'IP 城市·未知省份') throw new Error(`Expected "IP 城市·未知省份", got "${result}"`);
    });

    it('should use regionMapping for "Shanghai"', () => {
        window.i18n.setLanguage('zh-CN');
        const result = window.autoLocationService.translateAutoSelect({
            city: 'Shanghai',
            province: 'Shanghai'
        });
        // regionMapping: Shanghai -> city_Shanghai -> 上海
        if (result !== '上海') throw new Error(`Expected "上海", got "${result}"`);
    });
    
    it('should use regionMapping for "New York"', () => {
        window.i18n.setLanguage('zh-CN');
        const result = window.autoLocationService.translateAutoSelect({
            city: 'New York',
            province: 'New York'
        });
        if (result !== '纽约') throw new Error(`Expected "纽约", got "${result}"`);
    });

    it('should use regionMapping for "Los Angeles"', () => {
        window.i18n.setLanguage('zh-CN');
        const result = window.autoLocationService.translateAutoSelect({
            city: 'Los Angeles',
            province: 'California'
        });
        if (result !== '洛杉矶·加利福尼亚') throw new Error(`Expected "洛杉矶·加利福尼亚", got "${result}"`);
    });

    it('should cache translations via fetchAutoSelectTranslations', async () => {
        window.i18n.setLanguage('zh-CN');
        // Clear cache
        window.localStorage.removeItem('autoSelect_translations_cache');
        
        const loc = { city: 'London', province: 'Greater London' };
        
        // Initial fetch
        await window.autoLocationService.fetchAutoSelectTranslations(loc);
        
        const cache = JSON.parse(window.localStorage.getItem('autoSelect_translations_cache') || '{}');
        if (!cache['city_london']) throw new Error('Cache not populated for city_london');
        if (cache['city_london'] !== '伦敦') throw new Error(`Expected cached "伦敦", got "${cache['city_london']}"`);
    });

    it('should prioritize API cache over original text', () => {
        window.i18n.setLanguage('zh-CN');
        // Manually inject a cache entry for a term not in static map
        const cacheKey = 'city_foobar';
        const cacheValue = '福巴';
        const cache = {};
        cache[cacheKey] = cacheValue;
        window.localStorage.setItem('autoSelect_translations_cache', JSON.stringify(cache));
        
        const result = window.autoLocationService.translateAutoSelect({
            city: 'Foobar',
            province: ''
        });
        
        if (result !== '福巴') throw new Error(`Expected "福巴" from cache, got "${result}"`);
    });

    it('should maintain zh-CN consistency across 10 simulated startups', () => {
        for (let i = 0; i < 10; i++) {
            window.localStorage.clear();
            // Simulate startup
            const i18n = new I18n();
            // Default should be zh-CN as per app logic (forced default)
            if (i18n.locale !== 'zh-CN') throw new Error(`Startup ${i+1}: Locale is not zh-CN`);
            
            // Check default unnamed
            const unnamed = i18n.get('autoSelect.unnamed');
            if (unnamed !== '未命名') throw new Error(`Startup ${i+1}: Unnamed translation failed`);
            
            // Check region mapping availability
            if (!i18n.regionMapping) throw new Error(`Startup ${i+1}: Region mapping missing`);
        }
    });
});
