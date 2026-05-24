const DISCOVERY_SCROLL_KEY = 'ct_discovery_scroll_state';
const DISCOVERY_SCROLL_TTL_MS = 10 * 60 * 1000;

let restoredStateKey = '';
let restoreToken = 0;

function getWindow() {
    return typeof window === 'undefined' ? null : window;
}

function readState() {
    const activeWindow = getWindow();
    if (!activeWindow?.sessionStorage) return null;
    try {
        const raw = activeWindow.sessionStorage.getItem(DISCOVERY_SCROLL_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const y = Number(parsed?.y);
        const savedAt = Number(parsed?.savedAt);
        if (!Number.isFinite(y) || y < 0 || !Number.isFinite(savedAt)) return null;
        if (Date.now() - savedAt > DISCOVERY_SCROLL_TTL_MS) {
            activeWindow.sessionStorage.removeItem(DISCOVERY_SCROLL_KEY);
            return null;
        }
        return {
            y,
            savedAt,
            postId: String(parsed?.postId || '')
        };
    } catch {
        return null;
    }
}

function clearState() {
    const activeWindow = getWindow();
    try {
        activeWindow?.sessionStorage?.removeItem(DISCOVERY_SCROLL_KEY);
    } catch {
    }
}

function escapeAttributeSelector(value) {
    return String(value || '').replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

export function saveDiscoveryScrollState({ postId = '' } = {}) {
    const activeWindow = getWindow();
    if (!activeWindow?.sessionStorage) return;
    const y = Math.max(0, Math.round(activeWindow.scrollY || activeWindow.pageYOffset || 0));
    try {
        activeWindow.sessionStorage.setItem(DISCOVERY_SCROLL_KEY, JSON.stringify({
            y,
            postId: String(postId || ''),
            savedAt: Date.now()
        }));
    } catch {
    }
}

export function restoreDiscoveryScrollState(root = document) {
    const activeWindow = getWindow();
    if (!activeWindow) return false;

    const state = readState();
    if (!state || (!state.y && !state.postId)) return false;

    if (state.postId) {
        const selector = `[data-post-id="${escapeAttributeSelector(state.postId)}"]`;
        if (!root?.querySelector?.(selector)) return false;
    }

    const stateKey = `${state.postId}:${state.y}:${state.savedAt}`;
    if (stateKey === restoredStateKey) return true;
    restoredStateKey = stateKey;
    restoreToken += 1;

    const token = restoreToken;
    const restore = () => {
        if (token !== restoreToken) return;
        activeWindow.scrollTo(0, state.y);
    };

    [0, 50, 150, 350, 700, 1200].forEach((delay) => {
        activeWindow.setTimeout(restore, delay);
    });
    activeWindow.setTimeout(() => {
        if (token === restoreToken) clearState();
    }, 1500);

    return true;
}
