window.ClosetTwinRewrite = window.ClosetTwinRewrite || {};
window.ClosetTwinRewrite.services = window.ClosetTwinRewrite.services || {};

window.ClosetTwinRewrite.services.storage = {
    get(key, fallbackValue) {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallbackValue : raw;
    },
    set(key, value) {
        window.localStorage.setItem(key, value);
        return value;
    }
};
