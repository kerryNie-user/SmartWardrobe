window.ClosetTwinRewrite = window.ClosetTwinRewrite || {};
window.ClosetTwinRewrite.store = window.ClosetTwinRewrite.store || {};

window.ClosetTwinRewrite.store.preferencesStore = {
    getState() {
        return {
            locale: 'zh-CN',
            theme: 'light',
            temperatureUnit: 'celsius',
            wardrobeLayout: 'cards'
        };
    }
};
