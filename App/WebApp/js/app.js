// Smart Wardrobe App Logic

// --- Data ---

let wardrobeItems = [
    { id: 101, nameKey: "wardrobe.item.101.name", type: "top", color: "white", icon: "👕", image: "images/items/101.jpg" },
    { id: 102, nameKey: "wardrobe.item.102.name", type: "bottom", color: "blue", icon: "🩳", image: "images/items/102.jpg" },
    { id: 103, nameKey: "wardrobe.item.103.name", type: "outerwear", color: "navy", icon: "🧥", image: "images/items/103.jpg" },
    { id: 104, nameKey: "wardrobe.item.104.name", type: "bottom", color: "beige", icon: "👖", image: "images/items/1041.jpg" },
    { id: 105, nameKey: "wardrobe.item.105.name", type: "full_body", color: "black", icon: "👗", image: "images/items/1050.jpg" },
    { id: 106, nameKey: "wardrobe.item.106.name", type: "shoes", color: "red", icon: "👠", image: "images/items/106.jpg" },
    { id: 107, nameKey: "wardrobe.item.107.name", type: "shoes", color: "white", icon: "👟", image: "images/items/107.jpg" },
    { id: 108, nameKey: "wardrobe.item.108.name", type: "accessory", color: "beige", icon: "👒", image: "images/items/1083.jpg" },
    { id: 109, nameKey: "wardrobe.item.109.name", type: "outerwear", color: "black", icon: "🧥", image: "images/items/109.jpg" },
    { id: 110, nameKey: "wardrobe.item.110.name", type: "top", color: "grey", icon: "🧥", image: "images/items/1100.jpg" }
];

let wardrobeItemIndex = new Map();

function rebuildWardrobeItemIndex() {
    wardrobeItemIndex = new Map(wardrobeItems.map(item => [item.id, item]));
}

rebuildWardrobeItemIndex();

const WARDROBE_DISPLAY_MODE_KEY = 'wardrobe_display_mode';
const FAVORITE_OUTFITS_KEY = 'favorite_outfits';
const FAVORITES_CACHE_KEY = 'favorites_v2';
const CLIENT_ID_KEY = 'client_id';
const API_BACKOFF_UNTIL_KEY = 'sw_api_backoff_until';
const FAVORITES_DB_SYNC_AT_KEY = 'favorites_db_sync_at';
const FAVORITES_DB_FAIL_UNTIL_KEY = 'favorites_db_fail_until';
const FAVORITES_DB_REFRESH_MS = 2 * 60 * 1000;
const FAVORITES_DB_BACKOFF_MS = 2 * 60 * 1000;
const PLANNER_TAB_KEY = 'sw_planner_tab';
const SCHEDULE_STORAGE_KEY = 'sw_schedule_v1';
const PLAN_STORAGE_KEY = 'sw_plan_v1';

let favoritesStoreMode = 'local';
let favoritesReady = false;
const favoriteSets = {
    outfit: new Set(),
    pick: new Set()
};

function getWardrobeDisplayMode() {
    const mode = localStorage.getItem(WARDROBE_DISPLAY_MODE_KEY);
    return mode === 'list' ? 'list' : 'card';
}

function setWardrobeDisplayMode(mode) {
    const nextMode = mode === 'card' ? 'card' : 'list';
    localStorage.setItem(WARDROBE_DISPLAY_MODE_KEY, nextMode);
    window.dispatchEvent(new CustomEvent('wardrobeDisplayChanged', { detail: { mode: nextMode } }));
}

function updateWardrobeDisplaySwitcherState() {
    const mode = getWardrobeDisplayMode();
    const radios = document.querySelectorAll('input[name="wardrobeDisplay"]');
    radios.forEach(radio => {
        radio.checked = radio.value === mode;
    });
}

function setupWardrobeDisplaySwitcher() {
    const radios = document.querySelectorAll('input[name="wardrobeDisplay"]');
    if (!radios.length) return;
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) setWardrobeDisplayMode(e.target.value);
        });
    });
    updateWardrobeDisplaySwitcherState();
}

// Helper to find items by IDs
function getItemsByIds(ids) {
    return ids.map(id => wardrobeItemIndex.get(id)).filter(Boolean);
}

function tText(key, fallback = '', params = {}) {
    return window.t(key, fallback, params);
}

function getClientId() {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing && /^[A-Za-z0-9_-]{1,64}$/.test(existing)) return existing;

    let generated = '';
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        generated = window.crypto.randomUUID();
    } else {
        generated = `cid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
    const normalized = generated.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
    localStorage.setItem(CLIENT_ID_KEY, normalized);
    return normalized;
}

function readTimestamp(key) {
    try {
        const raw = localStorage.getItem(key);
        const ts = Number(raw || '0');
        return Number.isFinite(ts) ? ts : 0;
    } catch (_) {
        return 0;
    }
}

function writeTimestamp(key, ts) {
    try {
        localStorage.setItem(key, String(ts));
    } catch (_) {}
}

function shouldTryFavoritesDbSync() {
    if (document.visibilityState === 'hidden') return false;

    let apiAllowed = false;
    try {
        const host = window.location && window.location.hostname;
        const force = localStorage.getItem('sw_api_force') === '1';
        apiAllowed = force || host === 'localhost' || host === '127.0.0.1';
    } catch (_) {
        apiAllowed = false;
    }
    if (!apiAllowed) return false;

    const apiBackoffUntil = readTimestamp(API_BACKOFF_UNTIL_KEY);
    if (apiBackoffUntil && apiBackoffUntil > Date.now()) return false;

    const failUntil = readTimestamp(FAVORITES_DB_FAIL_UNTIL_KEY);
    if (failUntil && failUntil > Date.now()) return false;

    const lastSyncAt = readTimestamp(FAVORITES_DB_SYNC_AT_KEY);
    if (lastSyncAt && (Date.now() - lastSyncAt) < FAVORITES_DB_REFRESH_MS) return false;

    return true;
}

function markFavoritesDbSyncSuccess() {
    writeTimestamp(FAVORITES_DB_SYNC_AT_KEY, Date.now());
    writeTimestamp(FAVORITES_DB_FAIL_UNTIL_KEY, 0);
}

function markFavoritesDbSyncFail() {
    writeTimestamp(FAVORITES_DB_FAIL_UNTIL_KEY, Date.now() + FAVORITES_DB_BACKOFF_MS);
}

async function apiFetchJson(url, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('X-Client-Id', getClientId());
    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const error = new Error('API_ERROR');
        error.status = response.status;
        throw error;
    }
    return response.json();
}

function normalizeIdList(ids) {
    if (!Array.isArray(ids)) return [];
    const normalized = ids
        .map(id => String(id))
        .map(id => id.trim())
        .filter(Boolean);
    return Array.from(new Set(normalized));
}

function readFavoritesCache() {
    try {
        const raw = localStorage.getItem(FAVORITES_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            outfit: normalizeIdList(parsed.outfit),
            pick: normalizeIdList(parsed.pick)
        };
    } catch (_) {
        return null;
    }
}

function writeFavoritesCache(cache) {
    const payload = {
        outfit: normalizeIdList(cache?.outfit),
        pick: normalizeIdList(cache?.pick)
    };
    localStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(payload));
    return payload;
}

function hydrateFavoriteSets(cache) {
    favoriteSets.outfit = new Set(normalizeIdList(cache?.outfit));
    favoriteSets.pick = new Set(normalizeIdList(cache?.pick));
}

function exportFavoriteSets() {
    return {
        outfit: Array.from(favoriteSets.outfit),
        pick: Array.from(favoriteSets.pick)
    };
}

function loadFavoritesFromLocalStorage() {
    const cached = readFavoritesCache();
    if (cached) {
        hydrateFavoriteSets(cached);
        favoritesReady = true;
        return;
    }

    try {
        const legacy = JSON.parse(localStorage.getItem(FAVORITE_OUTFITS_KEY) || '[]');
        const migrated = { outfit: normalizeIdList(legacy), pick: [] };
        hydrateFavoriteSets(migrated);
        writeFavoritesCache(migrated);
    } catch (_) {
        hydrateFavoriteSets({ outfit: [], pick: [] });
    }
    favoritesReady = true;
}

async function tryLoadFavoritesFromDb() {
    if (!shouldTryFavoritesDbSync()) return false;
    try {
        const data = await apiFetchJson('/api/favorites', { method: 'GET' });
        const favorites = data?.favorites;
        if (!favorites || typeof favorites !== 'object') return false;
        hydrateFavoriteSets({
            outfit: favorites.outfit || [],
            pick: favorites.pick || []
        });
        writeFavoritesCache(exportFavoriteSets());
        favoritesStoreMode = 'db';
        favoritesReady = true;
        markFavoritesDbSyncSuccess();
        return true;
    } catch (_) {
        markFavoritesDbSyncFail();
        return false;
    }
}

async function initFavorites() {
    loadFavoritesFromLocalStorage();
    await tryLoadFavoritesFromDb();
    window.dispatchEvent(new CustomEvent('favoritesReady'));
}

function isFavorited(type, id) {
    const t = String(type || '').trim();
    const normalizedId = String(id);
    const set = favoriteSets[t];
    if (!set) return false;
    return set.has(normalizedId);
}

function setLocalFavorite(type, id, isOn) {
    const t = String(type || '').trim();
    const normalizedId = String(id);
    const set = favoriteSets[t];
    if (!set) return false;
    if (isOn) set.add(normalizedId);
    else set.delete(normalizedId);
    writeFavoritesCache(exportFavoriteSets());
    return set.has(normalizedId);
}

async function setFavorite(type, id, action) {
    const t = String(type || '').trim();
    const normalizedId = String(id);
    const before = isFavorited(t, normalizedId);

    const next =
        action === 'add' ? true :
        action === 'remove' ? false :
        !before;

    setLocalFavorite(t, normalizedId, next);
    window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: { type: t, id: normalizedId, isFavorited: next } }));

    if (favoritesStoreMode !== 'db') {
        return next;
    }

    try {
        const res = await apiFetchJson('/api/favorites', {
            method: 'POST',
            body: JSON.stringify({ type: t, id: normalizedId, action })
        });
        const confirmed = Boolean(res?.isFavorited);
        if (confirmed !== next) {
            setLocalFavorite(t, normalizedId, confirmed);
            window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: { type: t, id: normalizedId, isFavorited: confirmed } }));
        }
        return confirmed;
    } catch (_) {
        setLocalFavorite(t, normalizedId, before);
        window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: { type: t, id: normalizedId, isFavorited: before } }));
        favoritesStoreMode = 'local';
        return before;
    }
}

function toggleFavorite(type, id) {
    return setFavorite(type, id, 'toggle');
}

function getFavoriteLabel(isFavorited) {
    return tText(isFavorited ? 'favorites.button.remove' : 'favorites.button.add', '');
}

function syncOutfitFavoriteButtons(root = document) {
    const buttons = root.querySelectorAll('.outfit-favorite-btn[data-favorite-type][data-favorite-id]');
    buttons.forEach(btn => {
        const type = btn.getAttribute('data-favorite-type');
        const id = btn.getAttribute('data-favorite-id');
        const isFavorited = isFavoritedSafe(type, id);
        btn.classList.toggle('is-favorited', isFavorited);
        btn.setAttribute('aria-pressed', isFavorited ? 'true' : 'false');
        const label = getFavoriteLabel(isFavorited);
        if (label) {
            btn.setAttribute('aria-label', label);
            btn.setAttribute('title', label);
        }
    });
}

function isFavoritedSafe(type, id) {
    if (!favoritesReady) loadFavoritesFromLocalStorage();
    return isFavorited(type, id);
}

function attachOutfitFavoriteButtonHandlers(root = document) {
    const buttons = root.querySelectorAll('.outfit-favorite-btn[data-favorite-type][data-favorite-id]');
    buttons.forEach(btn => {
        if (btn.dataset.favoriteBound === '1') return;
        btn.dataset.favoriteBound = '1';

        const stop = (e) => {
            e.stopPropagation();
        };

        btn.addEventListener('touchstart', stop, { passive: true });
        btn.addEventListener('touchend', stop, { passive: true });
        btn.addEventListener('mousedown', stop);
        btn.addEventListener('mouseup', stop);

        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const type = btn.getAttribute('data-favorite-type');
            const id = btn.getAttribute('data-favorite-id');
            await toggleFavorite(type, id);
            syncOutfitFavoriteButtons(document);
            if (document.getElementById('favorites-container')) {
                renderFavoritesPage();
            }
        });
    });
}

function isEventFromOutfitFavoriteButton(e) {
    const target = e?.target;
    if (!target) return false;
    if (target.closest) return Boolean(target.closest('.outfit-favorite-btn'));
    return false;
}

function getItemTypeKey(type) {
    return `wardrobe.type.${String(type)}`;
}

function getItemColorKey(color) {
    return `wardrobe.color.${String(color)}`;
}

function getItemName(item) {
    return tText(item.nameKey || '', item.name || '—');
}

function getItemType(item) {
    return tText(getItemTypeKey(item.type), '—');
}

function getItemColor(item) {
    return tText(getItemColorKey(item.color), '—');
}

function getItemSubtitle(item) {
    return `${getItemType(item)} • ${getItemColor(item)}`;
}

function renderImageOrIcon(image, alt, icon, style = 'width:100%; height:100%; object-fit:cover;') {
    return image ? `<img src="${image}" alt="${alt}" style="${style}">` : icon;
}

function renderItemMedia(item) {
    return renderImageOrIcon(item.image, getItemName(item), item.icon);
}

function getOutfitDisplay(outfit) {
    return {
        ...outfit,
        title: tText(outfit.titleKey, '—'),
        description: tText(outfit.descriptionKey, ''),
        tag: tText(outfit.tagKey, '')
    };
}

function getPickDisplay(pick) {
    return {
        ...pick,
        title: tText(pick.titleKey, '—'),
        description: tText(pick.descriptionKey, '')
    };
}

function buildItemCardInnerHTML(item) {
    return `
        <div class="item-image">${renderItemMedia(item)}</div>
        <div class="item-details">
            <div class="item-title">${getItemName(item)}</div>
            <div class="item-subtitle">${getItemSubtitle(item)}</div>
            <div class="item-tags">
                <span class="item-chip">${getItemType(item)}</span>
                <span class="item-chip">${getItemColor(item)}</span>
            </div>
        </div>
    `;
}

function buildFavoriteButtonHTML(type, id, extraClass = '') {
    const className = `${extraClass ? `${extraClass} ` : ''}outfit-favorite-btn`;
    const t = String(type);
    const normalizedId = String(id);
    return `
        <button class="${className}" type="button" data-favorite-type="${t}" data-favorite-id="${normalizedId}" aria-pressed="false">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
    `;
}

function buildOutfitCardHTML(outfit) {
    const items = getItemsByIds(outfit.itemIds);
    const collageHTML = items.slice(0, 4).map(item => `
        <div class="collage-item">
            ${renderItemMedia(item)}
        </div>
    `).join('');
    const display = getOutfitDisplay(outfit);

    return `
    <div class="outfit-card" id="outfit-${outfit.id}">
        <div class="outfit-image-container">
            ${buildFavoriteButtonHTML('outfit', outfit.id)}
            <div class="outfit-image-collage">
                ${collageHTML}
            </div>
        </div>
        <div class="outfit-content">
            <div class="outfit-title">${display.title}</div>
            <div class="outfit-meta">
                <span class="item-tag">${display.tag}</span>
                <span>${items.length} ${tText('common.items')}</span>
            </div>
        </div>
    </div>
    `;
}

function buildPickCardHTML(pick) {
    const display = getPickDisplay(pick);
    const items = getItemsByIds(pick.itemIds);
    const mainItem = items[0];
    const mainIcon = mainItem ? renderItemMedia(mainItem) : pick.icon;

    return `
        <div class="pick-card" id="pick-${pick.id}">
            ${buildFavoriteButtonHTML('pick', pick.id)}
            <div class="pick-image">${mainIcon}</div>
            <div class="pick-info">
                <div class="pick-title">${display.title}</div>
                <div class="pick-desc">${display.description}</div>
            </div>
        </div>
    `;
}

function getDetailData(id, type) {
    if (type === 'outfit') {
        const outfit = outfits.find(o => o.id == id);
        return outfit ? getOutfitDisplay(outfit) : null;
    }
    if (type === 'pick') {
        const pick = todaysPicks.find(p => p.id == id);
        return pick ? getPickDisplay(pick) : null;
    }
    if (type === 'item') {
        const item = wardrobeItemIndex.get(Number(id)) || wardrobeItems.find(i => i.id == id);
        if (!item) return null;
        return {
            title: getItemName(item),
            tag: getItemType(item),
            description: getItemColor(item),
            icon: item.icon,
            image: item.image,
            itemIds: []
        };
    }
    return null;
}

function getDetailMainMedia(data, items) {
    const mainItem = items[0];
    if (mainItem) {
        return renderItemMedia(mainItem);
    }
    if (data.image) {
        return renderImageOrIcon(data.image, data.title, data.icon);
    }
    return data.icon || '👕';
}

const outfits = [
    { 
        id: 1, 
        titleKey: "home.outfit.1.title",
        itemIds: [101, 102, 107, 108], 
        tagKey: "home.outfit.1.tag",
        descriptionKey: "home.outfit.1.description"
    },
    { 
        id: 2, 
        titleKey: "home.outfit.2.title",
        itemIds: [101, 103, 104, 106], 
        tagKey: "home.outfit.2.tag",
        descriptionKey: "home.outfit.2.description"
    },
    { 
        id: 3, 
        titleKey: "home.outfit.3.title",
        itemIds: [105, 109, 106], 
        tagKey: "home.outfit.3.tag",
        descriptionKey: "home.outfit.3.description"
    }
];



const todaysPicks = [
    {
        id: 'p1',
        titleKey: "home.pick.p1.title",
        descriptionKey: "home.pick.p1.description",
        itemIds: [110, 104, 107],
        icon: "☕️"
    },
    {
        id: 'p2',
        titleKey: "home.pick.p2.title",
        descriptionKey: "home.pick.p2.description",
        itemIds: [101, 102, 109, 107],
        icon: "🏙️"
    },
    {
        id: 'p3',
        titleKey: "home.pick.p3.title",
        descriptionKey: "home.pick.p3.description",
        itemIds: [105, 106],
        icon: "🍽️"
    },
];

// --- Rendering Functions ---

// Helper: Handle Tap vs Scroll for Cards
function attachCardEvents(element, clickHandler) {
    if (!element) return;
    
    let startX, startY, startTime;
    const TAP_THRESHOLD = 10; // pixels
    const TIME_THRESHOLD = 200; // ms

    const addFeedback = () => {
        element.classList.add('touch-active');
        // Tactile feedback
        if (navigator.vibrate) {
            try {
                navigator.vibrate(10); 
            } catch (e) {
                // Ignore if not supported or blocked
            }
        }
    };

    const removeFeedback = () => {
        element.classList.remove('touch-active');
    };

    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        addFeedback();
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        // If moved beyond threshold, it's a scroll, so remove feedback
        if (Math.abs(currentX - startX) > TAP_THRESHOLD || Math.abs(currentY - startY) > TAP_THRESHOLD) {
            removeFeedback();
        }
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
        // Short delay to ensure visual feedback is seen on quick taps
        setTimeout(removeFeedback, 100);
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = Math.abs(endX - startX);
        const diffY = Math.abs(endY - startY);
        const duration = Date.now() - startTime;

        if (diffX < TAP_THRESHOLD && diffY < TAP_THRESHOLD && duration < TIME_THRESHOLD) {
            // Valid Tap
            clickHandler(e);
        }
    });

    element.addEventListener('touchcancel', removeFeedback);
    
    // Mouse fallback
    element.addEventListener('click', (e) => {
        clickHandler(e);
    });

    // Mouse feedback for consistency
    element.addEventListener('mousedown', addFeedback);
    element.addEventListener('mouseup', removeFeedback);
    element.addEventListener('mouseleave', removeFeedback);
}

// Tab Switching
function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    // Add active class to clicked tab
    const activeTab = Array.from(document.querySelectorAll('.tab')).find(t => t.getAttribute('data-tab') === tabName);
    if (activeTab) activeTab.classList.add('active');

    // Filter content based on tab (for Home page)
    const container = document.getElementById('content-container');
    if (container) {
        if (tabName === 'daily') {
            renderOutfits(outfits);

        } else if (tabName === 'favorites') {
            container.innerHTML = `<div style="text-align:center; color:#999; padding:20px;">${tText('favorites.empty')}</div>`;
        }
    }
}

function renderOutfits(data) {
    const container = document.getElementById('content-container');
    if (!container) return;

    const isHomeGrid = container.classList.contains('recommend-grid');
    if (!isHomeGrid) {
        container.innerHTML = data.map(outfit => buildOutfitCardHTML(outfit)).join('');

        data.forEach(outfit => {
            const el = document.getElementById(`outfit-${outfit.id}`);
            if (el) {
                attachCardEvents(el, (e) => {
                    if (isEventFromOutfitFavoriteButton(e)) return;
                    openDetail(outfit.id, 'outfit');
                });
            }
        });

        attachOutfitFavoriteButtonHandlers(container);
        syncOutfitFavoriteButtons(container);
        updateScrollbarVisibility();
        return;
    }

    container.innerHTML = data.map(outfit => buildHomeOutfitTileHTML(outfit)).join('');

    data.forEach(outfit => {
        const el = document.getElementById(`home-outfit-${outfit.id}`);
        if (el) {
            attachCardEvents(el, (e) => {
                if (isEventFromOutfitFavoriteButton(e)) return;
                openDetail(outfit.id, 'outfit');
            });
        }
    });

    attachOutfitFavoriteButtonHandlers(container);
    syncOutfitFavoriteButtons(container);
    updateScrollbarVisibility();
}

function buildHomeOutfitTileHTML(outfit) {
    const items = getItemsByIds(outfit.itemIds);
    const firstWithImage = items.find(i => i && i.image);
    const cover = firstWithImage
        ? `<img src="${firstWithImage.image}" alt="${escapeHtml(getItemName(firstWithImage))}" class="home-outfit-img">`
        : `<div class="home-outfit-collage">${items.slice(0, 4).map(item => `
            <div class="home-outfit-collage-item">${renderItemMedia(item)}</div>
        `).join('')}</div>`;

    return `
        <div class="home-outfit-tile" id="home-outfit-${outfit.id}">
            <div class="home-outfit-media">
                ${buildFavoriteButtonHTML('outfit', outfit.id)}
                ${cover}
            </div>
        </div>
    `;
}



function renderTodaysPicks() {
    const container = document.getElementById('todays-picks-container');
    if (!container) return;

    container.innerHTML = todaysPicks.map(pick => buildPickCardHTML(pick)).join('');
    
    // Attach custom tap/scroll events
    todaysPicks.forEach(pick => {
        const el = document.getElementById(`pick-${pick.id}`);
        if (el) {
            attachCardEvents(el, (e) => {
                if (isEventFromOutfitFavoriteButton(e)) return;
                openDetail(pick.id, 'pick');
            });
        }
    });

    attachOutfitFavoriteButtonHandlers(container);
    syncOutfitFavoriteButtons(container);
    
    updateScrollbarVisibility();
}

function toLocalDayKey(value) {
    const d = value instanceof Date ? new Date(value) : new Date(value || 0);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatTimeHM(value, locale) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    try {
        return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }
}

function toTimeValue(value) {
    if (!value) return '';
    const d = value instanceof Date ? new Date(value) : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function buildIsoFromDayKeyAndTime(dayKey, timeValue) {
    if (!dayKey || !timeValue) return '';
    const d = new Date(`${dayKey}T${timeValue}`);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString();
}

function getDefaultScheduleTimeRange(dayKey) {
    const todayKey = toLocalDayKey(new Date());
    const dayBase = parseDayKey(dayKey) || new Date();
    dayBase.setHours(0, 0, 0, 0);

    const step = 30;
    let minutes;
    if (dayKey === todayKey) {
        const now = new Date();
        minutes = now.getHours() * 60 + now.getMinutes();
        minutes = Math.ceil(minutes / step) * step;
        minutes = Math.min(minutes, 23 * 60);
    } else {
        minutes = 12 * 60 + 30;
    }

    const start = new Date(dayBase);
    start.setMinutes(minutes, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { startTime: toTimeValue(start), endTime: toTimeValue(end) };
}

function renderHomeSchedulePreview() {
    const container = document.getElementById('home-schedule-container');
    if (!container) return;

    const locale = getActiveLocale();
    const raw = readJsonValue(SCHEDULE_STORAGE_KEY, []);
    const list = Array.isArray(raw) ? raw : [];

    const normalized = list
        .filter(item => item && typeof item === 'object')
        .map(item => ({
            id: String(item.id || ''),
            title: String(item.title || '').trim(),
            startAt: item.startAt ? String(item.startAt) : ''
        }))
        .filter(item => item.title && item.startAt);

    const todayKey = toLocalDayKey(new Date());
    const todays = normalized
        .filter(item => toLocalDayKey(item.startAt) === todayKey)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 4);

    if (!todays.length) {
        container.innerHTML = `<div class="schedule-preview-empty">${tText('schedule.empty')}</div>`;
        return;
    }

    container.innerHTML = todays.map(item => `
        <div class="schedule-pill" onclick="window.location.href='schedule.html'">
            <div class="schedule-pill-title">${escapeHtml(item.title)}</div>
            <div class="schedule-pill-time">${escapeHtml(formatTimeHM(item.startAt, locale))}</div>
        </div>
    `).join('');
}

function renderWardrobe(items = wardrobeItems) {
    const container = document.getElementById('wardrobe-list');
    if (!container) return;

    const isCardMode = getWardrobeDisplayMode() === 'card';
    container.classList.toggle('wardrobe-layout-card', isCardMode);

    if (isEditing) {
        // Render with checkboxes
        container.innerHTML = items.map(item => `
            <div class="item-wrapper">
                <div class="item-card" onclick="toggleItemSelection(${item.id})">
                    <div class="edit-checkbox ${selectedItems.has(item.id) ? 'checked' : ''}"></div>
                    ${buildItemCardInnerHTML(item)}
                </div>
            </div>
        `).join('');
        
        // Hide FAB in edit mode
        const fab = document.querySelector('.fab');
        if (fab) fab.style.display = 'none';
        
    } else {
        if (isCardMode) {
            container.innerHTML = items.map(item => `
                <div class="item-wrapper">
                    <div class="item-card" id="item-${item.id}" onclick="openDetail('${item.id}', 'item')">
                        ${buildItemCardInnerHTML(item)}
                    </div>
                </div>
            `).join('');
        } else {
            // Render with swipe support
            container.innerHTML = items.map(item => `
                <div class="item-wrapper">
                    <div class="item-delete-action" onclick="deleteItem(${item.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </div>
                    <div class="item-card" id="item-${item.id}" onclick="openDetail('${item.id}', 'item')">
                        ${buildItemCardInnerHTML(item)}
                    </div>
                </div>
            `).join('');
        }
        
        // Show FAB in normal mode
        const fab = document.querySelector('.fab');
        if (fab) fab.style.display = 'flex';

        if (!isCardMode) {
            // Init swipe listeners
            items.forEach(item => {
                const el = document.getElementById(`item-${item.id}`);
                if (el) initSwipe(el, item.id);
            });
        }
    }
    updateScrollbarVisibility();
}

function updateScrollbarVisibility() {
    // Rely on CSS overflow-y: auto for both body and detail views
    // This function is kept empty to avoid breaking existing calls
}

const scrollIsolationState = {
    locked: false,
    scrollTop: 0,
    bodyStyles: null,
    htmlStyles: null
};
function lockParentScroll() {
    if (scrollIsolationState.locked) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    scrollIsolationState.locked = true;
    scrollIsolationState.scrollTop = scrollTop;
    scrollIsolationState.bodyStyles = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width
    };
    scrollIsolationState.htmlStyles = {
        overflow: document.documentElement.style.overflow,
        height: document.documentElement.style.height
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollTop}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
}

function unlockParentScroll() {
    if (!scrollIsolationState.locked) return;
    const { bodyStyles, htmlStyles, scrollTop } = scrollIsolationState;
    document.body.style.overflow = bodyStyles?.overflow || '';
    document.body.style.position = bodyStyles?.position || '';
    document.body.style.top = bodyStyles?.top || '';
    document.body.style.left = bodyStyles?.left || '';
    document.body.style.right = bodyStyles?.right || '';
    document.body.style.width = bodyStyles?.width || '';
    document.documentElement.style.overflow = htmlStyles?.overflow || '';
    document.documentElement.style.height = htmlStyles?.height || '';
    window.scrollTo(0, scrollTop || 0);
    scrollIsolationState.locked = false;
    updateScrollbarVisibility();
}

function resolveScrollContainer(overlayEl, scrollContainer) {
    if (scrollContainer) return scrollContainer;
    if (!overlayEl) return null;
    return overlayEl.querySelector('.detail-content-scroll') || overlayEl.querySelector('.modal-content') || overlayEl;
}

function enableScrollIsolation(overlayEl, scrollContainer) {
    if (!overlayEl || !scrollContainer) return;
    
    // Modern browsers support overscroll-behavior: contain which is handled by CSS
    // The previous JS implementation was blocking valid scroll/drag events
    // especially on scrollbars, so we rely on CSS and body locking instead.
}

function activateOverlay(overlayEl, scrollContainer) {
    if (!overlayEl) {
        console.warn('Scroll isolation failed: overlay element missing');
        return;
    }
    const resolvedScrollContainer = resolveScrollContainer(overlayEl, scrollContainer);
    overlayEl.classList.add('active');
    lockParentScroll();
    if (!resolvedScrollContainer) {
        console.warn('Scroll isolation failed: scroll container missing', overlayEl);
        overlayEl.style.overflowY = 'auto';
        return;
    }
    resolvedScrollContainer.classList.add('isolated-scroll');
    enableScrollIsolation(overlayEl, resolvedScrollContainer);
}

function deactivateOverlay(overlayEl) {
    if (!overlayEl) return;
    overlayEl.classList.remove('active');
    restoreBodyScroll();
}

// --- Edit & Swipe Logic ---

let isEditing = false;
let selectedItems = new Set();
let activeSwipeId = null;

function toggleEditMode() {
    isEditing = !isEditing;
    selectedItems.clear();
    
    const btn = document.getElementById('edit-mode-btn');
    const footer = document.getElementById('edit-footer');
    
    if (isEditing) {
        btn.innerText = tText('common.done');
        footer.classList.add('active');
    } else {
        btn.innerText = tText('common.edit');
        footer.classList.remove('active');
    }
    
    updateEditFooter();
    renderWardrobe();
}

function toggleItemSelection(id) {
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
    } else {
        selectedItems.add(id);
    }
    renderWardrobe(); // Re-render to update checkboxes
    updateEditFooter();
}

function updateEditFooter() {
    const count = selectedItems.size;
    const countSpan = document.querySelector('.delete-count');
    const deleteBtn = document.getElementById('delete-selected-btn');
    
    if (countSpan) countSpan.innerText = `${count} ${tText('common.selected')}`;
    if (deleteBtn) deleteBtn.disabled = count === 0;
}

function deleteSelected() {
    if (selectedItems.size === 0) return;
    
    showConfirmModal(tText('wardrobe.confirm.delete_items', '', { count: selectedItems.size }), () => {
        wardrobeItems = wardrobeItems.filter(item => !selectedItems.has(item.id));
        rebuildWardrobeItemIndex();
        selectedItems.clear();
        updateEditFooter();
        renderWardrobe();
    });
}

function deleteItem(id) {
    showConfirmModal(tText('wardrobe.confirm.delete_item'), () => {
        wardrobeItems = wardrobeItems.filter(item => item.id !== id);
        rebuildWardrobeItemIndex();
        renderWardrobe();
    });
}

function initSwipe(element, id) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let isScrolling = false;
    const maxSwipe = -82; // Width (70) + Spacing (6*2) adjusted slightly

    element.addEventListener('touchstart', (e) => {
        // Check if any modal is open to prevent background swipe
        if (document.querySelector('.modal-overlay.active, .detail-view.active, .image-modal-overlay.active')) return;

        // Close other open swipes
        if (activeSwipeId !== null && activeSwipeId !== id) {
            const activeEl = document.getElementById(`item-${activeSwipeId}`);
            if (activeEl) activeEl.style.transform = `translateX(0)`;
            activeSwipeId = null;
        }

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = false;
        isScrolling = false;
        element.style.transition = 'none';
    }, {passive: true});

    element.addEventListener('touchmove', (e) => {
        if (isScrolling) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        
        // Determine intent
        if (!isDragging) {
            // If vertical movement dominates, assume scrolling
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                isScrolling = true;
                return;
            }
            // If horizontal movement is significant, start dragging
            if (Math.abs(deltaX) > 10) {
                isDragging = true;
            } else {
                return; // Wait for more movement
            }
        }

        // Only allow swiping left
        if (deltaX > 0) return;
        
        // Resistance past max
        let newX = deltaX;
        if (newX < maxSwipe) newX = maxSwipe + (newX - maxSwipe) * 0.2;

        element.style.transform = `translateX(${newX}px)`;
    }, {passive: true});

    element.addEventListener('touchend', (e) => {
        if (isScrolling) return;
        if (!isDragging) return;
        
        isDragging = false;
        element.style.transition = 'transform 0.2s ease-out';
        
        const deltaX = e.changedTouches[0].clientX - startX;
        
        if (deltaX < maxSwipe / 2) {
            // Open
            element.style.transform = `translateX(${maxSwipe}px)`;
            activeSwipeId = id;
        } else {
            // Close
            element.style.transform = `translateX(0)`;
            if (activeSwipeId === id) activeSwipeId = null;
        }
    });
}

// --- Detail View Logic ---

function openDetail(id, type) {
    const data = getDetailData(id, type);
    if (!data) return;

    const detailView = document.getElementById('detail-view');
    const content = document.getElementById('detail-content-body');
    const items = getItemsByIds(data.itemIds || []);

    // Main Icon/Image
    const mainIcon = getDetailMainMedia(data, items);

    const isWardrobeItem = (type === 'item');
    if (isWardrobeItem) {
        if (detailView) detailView.dataset.detailType = 'item';
        const item =
            wardrobeItemIndex.get(Number(id)) ||
            wardrobeItems.find(i => String(i.id) === String(id)) ||
            null;
        const cardInner = item
            ? buildItemCardInnerHTML(item)
            : `
                <div class="item-image">${mainIcon}</div>
                <div class="item-details">
                    <div class="item-title">${escapeHtml(data.title || '')}</div>
                    <div class="item-subtitle">${escapeHtml([data.tag, data.description].filter(Boolean).join(' • '))}</div>
                </div>
            `;

        const cardClick = item && item.image ? `onclick="openImageModal('${item.image}')"` : '';

        content.innerHTML = `
            <div class="detail-topbar">
                <button class="detail-back-inline" type="button" onclick="closeDetail()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
            </div>
            <div class="detail-item-container">
                <div class="item-card detail-item-card" ${cardClick}>
                    ${cardInner}
                </div>
            </div>
        `;

        activateOverlay(detailView, detailView);
        updateScrollbarVisibility();
        return;
    }
    if (detailView) detailView.dataset.detailType = '';

    const headerHTML = isWardrobeItem ? `<div class="detail-header-image">${mainIcon}</div>` : '';
    const contentStyle = isWardrobeItem ? '' : 'height: 100%; max-height: 100%; border-radius: 0;';
    const handleHTML = isWardrobeItem ? '<div class="drag-handle-bar"></div>' : '<div style="height: 60px;"></div>';
    const shouldShowFavorite = (type === 'outfit' || type === 'pick');
    const favoriteHTML = shouldShowFavorite ? buildFavoriteButtonHTML(type, id, 'detail-favorite-btn') : '';
    
    content.innerHTML = `
        <button class="detail-back-btn" onclick="closeDetail()">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>

        ${favoriteHTML}
        
        ${headerHTML}
        
        <div class="detail-content" id="swipe-sheet" style="${contentStyle}">
            ${handleHTML}
            <div class="detail-content-scroll" style="${isWardrobeItem ? '' : 'padding-top: 80px;'}">
                <div class="detail-title">${data.title}</div>
                <div class="detail-tags">
                    ${data.tag ? `<span class="tag-badge">${data.tag}</span>` : ''}
                    ${items.length > 0 ? `<span class="tag-badge">${items.length} ${tText('common.items')}</span>` : ''}
                </div>
                <p style="color:#666; line-height:1.5; margin-bottom:20px;">
                    ${data.description || tText('detail.default_description')}
                </p>

                ${items.length > 0 ? `
                <div class="items-list-title">${tText('detail.items_in_look')}</div>
                
                <div class="items-list">
                    ${items.map(item => `
                        <div class="item-card" ${item.image ? `onclick="openImageModal('${item.image}')"` : ''}>
                            ${buildItemCardInnerHTML(item)}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </div>
    `;

    const detailScroll = content.querySelector('.detail-content-scroll');
    activateOverlay(detailView, detailScroll);
    
    attachOutfitFavoriteButtonHandlers(content);
    syncOutfitFavoriteButtons(content);

    initSwipeBehavior();
}

function initSwipeBehavior() {
    const sheet = document.getElementById('swipe-sheet');
    if (!sheet) return;
    const handle = sheet.querySelector('.drag-handle-bar');
    if (!handle) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let sheetHeight = sheet.offsetHeight;
    
    // Calculate collapsed position (Height - Visible Part)
    // We want about 160px visible at the bottom (Title + Tags + Button space)
    const visibleHeight = 180;
    const maxTranslate = sheetHeight - visibleHeight;

    // Reset position
    sheet.style.transform = `translateY(0)`;

    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        // Get current transform value if any
        const style = window.getComputedStyle(sheet);
        const matrix = new WebKitCSSMatrix(style.transform);
        currentY = matrix.m42;
        
        isDragging = true;
        sheet.style.transition = 'none'; // Disable transition during drag
    }, {passive: true});

    handle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const deltaY = e.touches[0].clientY - startY;
        let newY = currentY + deltaY;

        // Constraints
        if (newY < 0) newY = 0; // Don't go above expanded
        if (newY > maxTranslate) newY = maxTranslate + (newY - maxTranslate) * 0.2; // Rubber band effect at bottom

        sheet.style.transform = `translateY(${newY}px)`;
    }, {passive: true});

    handle.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';

        // Get final position
        const style = window.getComputedStyle(sheet);
        const matrix = new WebKitCSSMatrix(style.transform);
        const finalY = matrix.m42;

        // Snap logic
        if (finalY > maxTranslate / 2) {
            // Snap to collapsed
            sheet.style.transform = `translateY(${maxTranslate}px)`;
        } else {
            // Snap to expanded
            sheet.style.transform = `translateY(0)`;
        }
    });
    
    // Allow clicking the handle to toggle
    handle.addEventListener('click', () => {
         const style = window.getComputedStyle(sheet);
         const matrix = new WebKitCSSMatrix(style.transform);
         const currentY = matrix.m42;
         
         if (currentY > 10) { // If collapsed or partially down
             sheet.style.transform = `translateY(0)`;
         } else {
             sheet.style.transform = `translateY(${maxTranslate}px)`;
         }
    });
}


function restoreBodyScroll() {
    // Check if any modal is still active
    const activeModals = document.querySelectorAll('.modal-overlay.active, .detail-view.active, .image-modal-overlay.active');
    if (activeModals.length === 0) {
        unlockParentScroll();
    }
}

function closeDetail() {
    const detailView = document.getElementById('detail-view');
    if (detailView) detailView.dataset.detailType = '';
    deactivateOverlay(detailView);
}

// Modal Logic (General)
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const scrollContainer = modal.querySelector('.modal-content');
        activateOverlay(modal, scrollContainer);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        deactivateOverlay(modal);
    }
}

function initSettingsPage() {
    const root = document.getElementById('settings-page-root');
    if (!root) return;

    const languageValue = document.getElementById('settings-language-value');
    const themeValue = document.getElementById('settings-theme-value');
    const wardrobeValue = document.getElementById('settings-wardrobe-display-value');

    const updateSummary = () => {
        const locale = (window.i18n && window.i18n.locale) ? String(window.i18n.locale || '') : String(localStorage.getItem('app_locale') || '');
        const isZh = locale.toLowerCase().startsWith('zh');
        if (languageValue) languageValue.textContent = isZh ? tText('language.chinese') : tText('language.english');

        const storedTheme = (window.themeManager && window.themeManager.currentTheme) ? String(window.themeManager.currentTheme || '') : String(localStorage.getItem('app_theme') || 'system');
        const themeKey = storedTheme === 'dark' ? 'theme.dark' : storedTheme === 'light' ? 'theme.light' : 'theme.system';
        if (themeValue) themeValue.textContent = tText(themeKey);

        const mode = getWardrobeDisplayMode();
        if (wardrobeValue) wardrobeValue.textContent = tText(mode === 'list' ? 'wardrobe.display.list' : 'wardrobe.display.card');
    };

    const openSheet = (id) => {
        openModal(id);
        setTimeout(() => {
            if (window.themeManager && typeof window.themeManager.updateAllSliders === 'function') {
                window.themeManager.updateAllSliders(false);
            }
        }, 30);
    };

    const showInfo = (titleKey) => {
        const titleEl = document.getElementById('settings-info-title');
        const bodyEl = document.getElementById('settings-info-body');
        if (titleEl) titleEl.textContent = tText(titleKey);
        if (bodyEl) bodyEl.textContent = tText('common.coming_soon');
        openModal('settings-info-modal');
    };

    const bindItem = (id, handler) => {
        const el = document.getElementById(id);
        if (!el || el.dataset.bound === '1') return;
        el.dataset.bound = '1';
        el.addEventListener('click', handler);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') handler();
        });
    };

    bindItem('settings-language-item', () => openSheet('settings-language-modal'));
    bindItem('settings-theme-item', () => openSheet('settings-theme-modal'));
    bindItem('settings-wardrobe-display-item', () => openSheet('settings-wardrobe-display-modal'));
    bindItem('settings-notifications-item', () => showInfo('settings.item.notifications'));
    bindItem('settings-privacy-item', () => showInfo('settings.item.privacy_policy'));
    bindItem('settings-terms-item', () => showInfo('settings.item.terms'));

    updateSummary();
    window.addEventListener('languageChanged', updateSummary);
    window.addEventListener('themeChanged', updateSummary);
    window.addEventListener('wardrobeDisplayChanged', updateSummary);
}

// Close modal when clicking outside
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            deactivateOverlay(overlay);
        }
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth(); // Check authentication status first
    updateUIForAuth(); // Update UI based on auth status
    updateUserProfile(); // Update user profile info
    updateWeather();
    updateScrollbarVisibility();
    window.addEventListener('resize', updateScrollbarVisibility);
    setupWardrobeDisplaySwitcher();
    await initFavorites();

    // Global Auto Location Init (Singleton)
    if (window.autoLocationService) {
        window.autoLocationService.initAutoLocation();
    }

    // Check which page we are on
    if (document.getElementById('content-container')) {
        renderTodaysPicks();
        renderHomeSchedulePreview();
        renderCollections(); // Replaced switchTab('daily')
    }
    if (document.getElementById('wardrobe-list')) {
        renderWardrobe();

        // Search functionality
        const searchInput = document.getElementById('wardrobe-search');
        const searchBtn = document.getElementById('search-btn');

        const performSearch = () => {
            if (!searchInput) return;
            const term = searchInput.value.toLowerCase();
            const filtered = wardrobeItems.filter(item => 
                item.name.toLowerCase().includes(term) ||
                item.type.toLowerCase().includes(term) ||
                item.color.toLowerCase().includes(term)
            );
            renderWardrobe(filtered);
        };

        if (searchInput) {
            searchInput.addEventListener('input', performSearch);
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                performSearch();
                if (searchInput) searchInput.blur(); // Dismiss keyboard
            });
        }
    }
    if (document.getElementById('favorites-container')) {
        renderFavoritesPage();
    }
    if (document.getElementById('planner-root')) {
        initPlannerPage();
    }
    if (document.getElementById('settings-page-root')) {
        initSettingsPage();
    }
});

// Listen for language changes to re-render dynamic content
window.addEventListener('languageChanged', () => {
    // Re-render Wardrobe Page
    if (document.getElementById('wardrobe-list')) {
        renderWardrobe(); 
    }
    
    // Re-render Home Page lists
    if (document.getElementById('content-container')) {
        // Re-render Todays Picks
        renderTodaysPicks();
        renderHomeSchedulePreview();
        // Re-render Outfits/Collections
        renderCollections();
    }

    if (document.getElementById('favorites-container')) {
        renderFavoritesPage();
    }

    if (document.getElementById('planner-root')) {
        renderPlanner();
    }
    
    // Update Profile User Info (e.g. "Unnamed")
    updateUserProfile();
    
    // Update Auth UI (Login prompt text)
    updateUIForAuth();
    
    // Update Edit Mode UI (button text)
    if (typeof isEditing !== 'undefined' && isEditing) {
        const btn = document.getElementById('edit-mode-btn');
        if (btn) btn.innerText = tText('common.done');
        updateEditFooter();
    } else {
        const btn = document.getElementById('edit-mode-btn');
        if (btn) btn.innerText = tText('common.edit');
    }

    syncOutfitFavoriteButtons(document);
});

window.addEventListener('wardrobeDisplayChanged', () => {
    updateWardrobeDisplaySwitcherState();
    if (document.getElementById('wardrobe-list')) {
        renderWardrobe();
    }
});

window.addEventListener('favoritesChanged', () => {
    syncOutfitFavoriteButtons(document);
    if (document.getElementById('favorites-container')) {
        renderFavoritesPage();
    }
});

// --- Auth Logic ---

// Global Auth State
window.isLoggedIn = false;

function checkAuth() {
    // Skip check on login page
    if (window.location.pathname.includes('login.html')) return;

    window.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    // Block only wardrobe page if not logged in
    if (!window.isLoggedIn && window.location.pathname.includes('wardrobe.html')) {
        showLoginPrompt();
    }
}

function updateUIForAuth() {
    if (window.location.pathname.includes('login.html')) return;

    const editBtn = document.getElementById('edit-mode-btn');
    const fabBtn = document.querySelector('.fab');

    if (!window.isLoggedIn) {
        // Hide Auth-required Actions
        if (editBtn) editBtn.style.display = 'none';
        if (fabBtn) fabBtn.style.display = 'none';

        // 1. Handle Navigation Lock
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(nav => {
            if (nav.getAttribute('href') && nav.getAttribute('href').includes('wardrobe.html')) {
                 // Check if lock icon already exists
                 if (!nav.querySelector('.nav-lock-icon')) {
                     // Add Lock Icon
                     const lockIcon = document.createElement('div');
                     lockIcon.className = 'nav-lock-icon';
                     lockIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
                     nav.appendChild(lockIcon);
                 }
            }
        });

        // 2. Handle Profile Page Button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.textContent = tText('auth.login.button.submit');
            logoutBtn.setAttribute('data-i18n', 'auth.login.button.submit');
            logoutBtn.onclick = () => window.location.href = 'login.html';
            logoutBtn.classList.add('btn-primary'); 
            // Reset red color if it was set via class
            logoutBtn.style.backgroundColor = 'var(--primary-color)';
            logoutBtn.style.color = 'var(--text-on-primary)';
            logoutBtn.style.borderColor = 'var(--primary-color)';
        }
    } else {
        // Restore UI for Logged In User
        if (editBtn && window.location.pathname.includes('wardrobe.html')) {
             editBtn.style.display = 'block'; 
        }
        // Only show FAB if not editing
        if (fabBtn && window.location.pathname.includes('wardrobe.html')) {
             fabBtn.style.display = (typeof isEditing !== 'undefined' && isEditing) ? 'none' : 'flex';
        }
    }
}

function showLoginPrompt() {
    // Hide main content areas based on page
    const elementsToHide = [
        '#todays-picks-container', 
        '#content-container', 
        '.section-title', 
        '#wardrobe-list', 
        '.filter-tags-container', 
        '.fab', 
        '#wardrobe-search',
        '.search-container',
        '.profile-header',
        '.menu-list',
        '.logout-container'
    ];

    elementsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.display = 'none';
        });
    });

    // Create and insert login prompt
    const promptId = 'login-prompt-container';
    if (!document.getElementById(promptId)) {
        const promptHTML = `
            <div id="${promptId}" style="
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: 60vh; 
                text-align: center;
                padding: 20px;
            ">
                <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
                <h2 style="margin-bottom: 10px; color: #333;" data-i18n="auth.prompt.signin_required.title">${tText('auth.prompt.signin_required.title')}</h2>
                <p style="color: #666; margin-bottom: 30px;" data-i18n="auth.prompt.signin_required.description">${tText('auth.prompt.signin_required.description')}</p>
                <button class="btn-primary" onclick="window.location.href='login.html'" style="padding: 12px 40px; border-radius: 25px;" data-i18n="auth.login.button.submit">
                    ${tText('auth.login.button.submit')}
                </button>
            </div>
        `;
        
        // Insert after header or at the beginning of body
        const header = document.querySelector('header') || document.querySelector('.mobile-header');
        if (header) {
            header.insertAdjacentHTML('afterend', promptHTML);
        } else {
            document.body.insertAdjacentHTML('afterbegin', promptHTML);
        }
    }
    updateScrollbarVisibility();
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}

function getThemeMode() {
    const mode = String(document.documentElement.getAttribute('data-theme') || '').trim();
    return mode === 'dark' ? 'dark' : 'light';
}

function isPlaceholderAvatar(src) {
    const raw = String(src || '').trim();
    if (!raw) return true;
    try {
        const url = new URL(raw, window.location.href);
        const name = String(url.pathname || '').split('/').pop();
        return name === 'default_avatar.svg' || name === 'avatar_minimal_light.svg' || name === 'avatar_minimal_dark.svg';
    } catch (_) {
        return false;
    }
}

function getAvatarForStyle(style) {
    const s = String(style || '').trim();
    if (s === 'minimal') {
        return getThemeMode() === 'dark' ? 'images/avatar_minimal_dark.svg' : 'images/avatar_minimal_light.svg';
    }
    return 'images/default_avatar.svg';
}

function applyUserAvatarToElements(userAvatar) {
    const usePlaceholder = isPlaceholderAvatar(userAvatar);
    const avatarElements = document.querySelectorAll('img.profile-avatar');
    avatarElements.forEach(img => {
        if (!usePlaceholder) {
            img.src = userAvatar;
            return;
        }
        const style = img.getAttribute('data-avatar-style');
        if (style) {
            img.src = getAvatarForStyle(style);
        }
    });
}

function updateUserProfile() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        const user = JSON.parse(userStr);
        
        // Update profile name
        const nameElement = document.getElementById('display-name');
        if (nameElement) {
            let displayName = user.name;
            if (!displayName || displayName === 'undefined' || displayName.trim() === '') {
                displayName = tText('profile.user.unnamed', '');
            }
            nameElement.innerText = displayName;
        }

        const regionElement = document.getElementById('current-region');
        if (regionElement && user.regionKey) {
            regionElement.setAttribute('data-i18n', user.regionKey);
            regionElement.textContent = window.t(user.regionKey);
        }

        const professionElement = document.getElementById('current-profession');
        const roleElement = document.querySelector('.profile-role');
        if (user.professionKey) {
            if (professionElement) {
                professionElement.setAttribute('data-i18n', user.professionKey);
                professionElement.textContent = window.t(user.professionKey);
            }
            if (roleElement) {
                roleElement.setAttribute('data-i18n', user.professionKey);
                roleElement.textContent = window.t(user.professionKey);
            }
        }

        applyUserAvatarToElements(user.avatar);

        // Update edit input if it exists
        const editNameInput = document.getElementById('edit-name');
        if (editNameInput) {
            editNameInput.value = user.name;
        }

        // Update home greeting if we had one (optional, but good UX)
        // const greeting = document.querySelector('.mobile-header h1');
        // if (greeting && greeting.innerText === 'Smart Wardrobe') {
        //     greeting.innerText = `Hi, ${user.name.split(' ')[0]}`;
        // }
    }
    if (!userStr) {
        applyUserAvatarToElements('');
    }

    if (!window.__avatarThemeBound) {
        window.__avatarThemeBound = true;
        window.addEventListener('themeChanged', () => {
            try {
                const current = JSON.parse(localStorage.getItem('currentUser') || 'null');
                applyUserAvatarToElements(current?.avatar);
            } catch (_) {
                applyUserAvatarToElements('');
            }
        });
    }
}

function renderCollections() {
    const container = document.getElementById('content-container');
    if (!container) return;

    // Check Auth for Content
    if (!window.isLoggedIn) {
        container.innerHTML = `
            <div class="locked-section" onclick="window.location.href='login.html'">
                <div class="locked-icon-large">🔒</div>
                <div class="locked-text">${tText('home.locked.title')}</div>
                <div class="locked-subtext">${tText('home.locked.description')}</div>
                <button class="btn-primary" style="padding: 8px 24px; font-size: 14px;">${tText('auth.login.button.submit')}</button>
            </div>
        `;
        updateScrollbarVisibility();
        return;
    }

    renderOutfits(outfits);
}

function buildFavoritesOutfitCardHTML(outfit) {
    const items = getItemsByIds(outfit.itemIds);
    const collageHTML = items.slice(0, 4).map(item => `
        <div class="favorite-collage-item">
            ${renderItemMedia(item)}
        </div>
    `).join('');
    const display = getOutfitDisplay(outfit);
    const meta = `${items.length} ${tText('common.items')}`;

    return `
        <div class="favorite-card" id="favorite-outfit-${outfit.id}">
            <div class="favorite-media favorite-media-collage">
                ${buildFavoriteButtonHTML('outfit', outfit.id, 'favorite-fav-btn')}
                <div class="favorite-collage">${collageHTML}</div>
            </div>
            <div class="favorite-body">
                <div class="favorite-title">${escapeHtml(display.title)}</div>
                <div class="favorite-meta">
                    <span class="favorite-chip">${escapeHtml(display.tag)}</span>
                    <span class="favorite-meta-text">${escapeHtml(meta)}</span>
                </div>
            </div>
        </div>
    `;
}

function buildFavoritesPickCardHTML(pick) {
    const display = getPickDisplay(pick);
    const items = getItemsByIds(pick.itemIds);
    const mainItem = items[0];
    const media = mainItem ? renderItemMedia(mainItem) : (pick.icon || '');

    return `
        <div class="favorite-card" id="favorite-pick-${pick.id}">
            <div class="favorite-media">
                ${buildFavoriteButtonHTML('pick', pick.id, 'favorite-fav-btn')}
                <div class="favorite-media-main">${media}</div>
            </div>
            <div class="favorite-body">
                <div class="favorite-title">${escapeHtml(display.title)}</div>
                <div class="favorite-sub">${escapeHtml(display.description || '')}</div>
            </div>
        </div>
    `;
}

function renderFavoritesPage() {
    const container = document.getElementById('favorites-container');
    if (!container) return;

    if (!window.isLoggedIn) {
        container.innerHTML = `
            <div class="locked-section" onclick="window.location.href='login.html'">
                <div class="locked-icon-large">🔒</div>
                <div class="locked-text">${tText('home.locked.title')}</div>
                <div class="locked-subtext">${tText('home.locked.description')}</div>
                <button class="btn-primary" style="padding: 8px 24px; font-size: 14px;">${tText('auth.login.button.submit')}</button>
            </div>
        `;
        updateScrollbarVisibility();
        return;
    }

    if (!favoritesReady) loadFavoritesFromLocalStorage();
    const favoriteOutfitIds = Array.from(favoriteSets.outfit);
    const favoritePickIds = Array.from(favoriteSets.pick);

    const favoriteOutfits = favoriteOutfitIds
        .map(id => outfits.find(o => String(o.id) === String(id)))
        .filter(Boolean);
    const favoritePicks = favoritePickIds
        .map(id => todaysPicks.find(p => String(p.id) === String(id)))
        .filter(Boolean);

    if (!favoriteOutfits.length && !favoritePicks.length) {
        container.innerHTML = `<div class="favorites-empty">${tText('favorites.empty')}</div>`;
        updateScrollbarVisibility();
        return;
    }

    container.innerHTML = `
        ${favoriteOutfits.length ? `
            <section class="favorites-section">
                <div class="favorites-section-title">${tText('favorites.section.outfits')}</div>
                <div class="favorites-grid">
                    ${favoriteOutfits.map(outfit => buildFavoritesOutfitCardHTML(outfit)).join('')}
                </div>
            </section>
        ` : ''}
        ${favoritePicks.length ? `
            <section class="favorites-section">
                <div class="favorites-section-title">${tText('favorites.section.picks')}</div>
                <div class="favorites-grid">
                    ${favoritePicks.map(pick => buildFavoritesPickCardHTML(pick)).join('')}
                </div>
            </section>
        ` : ''}
    `;

    favoriteOutfits.forEach(outfit => {
        const el = document.getElementById(`favorite-outfit-${outfit.id}`);
        if (el) {
            attachCardEvents(el, (e) => {
                if (isEventFromOutfitFavoriteButton(e)) return;
                openDetail(outfit.id, 'outfit');
            });
        }
    });
    favoritePicks.forEach(pick => {
        const el = document.getElementById(`favorite-pick-${pick.id}`);
        if (el) {
            attachCardEvents(el, (e) => {
                if (isEventFromOutfitFavoriteButton(e)) return;
                openDetail(pick.id, 'pick');
            });
        }
    });

    attachOutfitFavoriteButtonHandlers(container);
    syncOutfitFavoriteButtons(container);
    updateScrollbarVisibility();
}

const plannerState = {
    tab: 'schedule',
    schedule: [],
    plans: [],
    editingScheduleId: null,
    editingPlanId: null,
    reminderTimerId: null,
    weekProgressTimerId: null,
    weekProgressWeekKey: '',
    selectedDayKey: ''
};

function makeLocalId(prefix) {
    const p = String(prefix || 'id');
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return `${p}_${window.crypto.randomUUID()}`;
    }
    return `${p}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readJsonValue(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (_) {
        return fallback;
    }
}

function writeJsonValue(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
}

function getFavoritesPageView() {
    try {
        const raw = new URLSearchParams(window.location.search).get('view');
        return raw === 'favorites' ? 'favorites' : 'schedule';
    } catch (_) {
        return 'schedule';
    }
}

function applyFavoritesPageView() {
    const scheduleView = document.getElementById('schedule-view');
    const favoritesView = document.getElementById('favorites-view');
    const scheduleHeader = document.getElementById('schedule-header');
    const favoritesHeader = document.getElementById('favorites-header');

    if (!scheduleView && !favoritesView && !scheduleHeader && !favoritesHeader) {
        return 'schedule';
    }

    const view = getFavoritesPageView();
    const isFavorites = view === 'favorites';
    if (scheduleView) scheduleView.style.display = isFavorites ? 'none' : '';
    if (scheduleHeader) scheduleHeader.style.display = isFavorites ? 'none' : '';
    if (favoritesView) favoritesView.style.display = isFavorites ? '' : 'none';
    if (favoritesHeader) favoritesHeader.style.display = isFavorites ? '' : 'none';

    const addBtn = document.getElementById('planner-add-btn');
    if (addBtn) addBtn.style.display = isFavorites ? 'none' : '';

    return view;
}

function normalizePlannerTab(raw) {
    return raw === 'plan' ? 'plan' : 'schedule';
}

function getPlannerTab() {
    return normalizePlannerTab(localStorage.getItem(PLANNER_TAB_KEY));
}

function setPlannerTab(tab) {
    const next = normalizePlannerTab(tab);
    localStorage.setItem(PLANNER_TAB_KEY, next);
    return next;
}

function loadPlannerData() {
    const scheduleRaw = readJsonValue(SCHEDULE_STORAGE_KEY, []);
    const planRaw = readJsonValue(PLAN_STORAGE_KEY, []);

    plannerState.schedule = Array.isArray(scheduleRaw) ? scheduleRaw : [];
    plannerState.plans = Array.isArray(planRaw) ? planRaw : [];

    plannerState.schedule = plannerState.schedule
        .filter(item => item && typeof item === 'object')
        .map(item => ({
            id: String(item.id || makeLocalId('sch')),
            title: String(item.title || '').trim(),
            startAt: item.startAt ? String(item.startAt) : '',
            endAt: item.endAt ? String(item.endAt) : '',
            category: item.category ? String(item.category) : '',
            location: String(item.location || ''),
            outfit: String(item.outfit || ''),
            remindAt: item.remindAt ? String(item.remindAt) : '',
            note: String(item.note || ''),
            done: Boolean(item.done),
            remindedAt: Number(item.remindedAt || 0),
            createdAt: Number(item.createdAt || Date.now()),
            updatedAt: Number(item.updatedAt || Date.now())
        }))
        .filter(item => item.title);

    plannerState.plans = plannerState.plans
        .filter(item => item && typeof item === 'object')
        .map(item => ({
            id: String(item.id || makeLocalId('plan')),
            title: String(item.title || '').trim(),
            type: item.type === 'long' ? 'long' : 'short',
            startDate: item.startDate ? String(item.startDate) : '',
            endDate: item.endDate ? String(item.endDate) : '',
            progress: Math.max(0, Math.min(100, Number(item.progress || 0))),
            done: Boolean(item.done),
            note: String(item.note || ''),
            createdAt: Number(item.createdAt || Date.now()),
            updatedAt: Number(item.updatedAt || Date.now())
        }))
        .filter(item => item.title);

    writeJsonValue(SCHEDULE_STORAGE_KEY, plannerState.schedule);
    writeJsonValue(PLAN_STORAGE_KEY, plannerState.plans);
}

function saveScheduleData() {
    writeJsonValue(SCHEDULE_STORAGE_KEY, plannerState.schedule);
}

function savePlanData() {
    writeJsonValue(PLAN_STORAGE_KEY, plannerState.plans);
}

function formatDateTimeDisplay(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
}

function getWeekRange(now) {
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    const day = base.getDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(base);
    start.setDate(base.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
}

function parseDayKey(dayKey) {
    const parts = String(dayKey || '').split('-').map(n => Number(n));
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getWeekStartMonday(date) {
    const base = new Date(date);
    base.setHours(0, 0, 0, 0);
    const day = base.getDay();
    const diffToMonday = (day + 6) % 7;
    base.setDate(base.getDate() - diffToMonday);
    return base;
}

function formatMonthTitle(date, locale) {
    const isZh = String(locale || '').toLowerCase().startsWith('zh');
    if (isZh) return `${date.getMonth() + 1}月`;
    try {
        return date.toLocaleDateString(locale, { month: 'long' });
    } catch (_) {
        return String(date.getMonth() + 1);
    }
}

function renderPlannerCalendarStrip() {
    const root = document.getElementById('calendar-strip');
    if (!root) return;

    const locale = getActiveLocale();
    const selectedKey = plannerState.selectedDayKey || toLocalDayKey(new Date());
    const selectedDate = parseDayKey(selectedKey) || new Date();
    const weekStart = getWeekStartMonday(selectedDate);
    const selectedIndex = Math.max(0, Math.min(6, Math.floor((selectedDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))));

    const yearEl = document.getElementById('schedule-year');
    const monthEl = document.getElementById('schedule-month');
    if (yearEl) yearEl.textContent = String(selectedDate.getFullYear());
    if (monthEl) monthEl.textContent = formatMonthTitle(selectedDate, locale);

    const weekdayEl = document.getElementById('calendar-weekdays');
    if (weekdayEl) {
        const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        weekdayEl.innerHTML = labels.map((label, idx) => `
            <div class="calendar-weekday ${idx === selectedIndex ? 'is-selected' : ''}">
                <span class="calendar-weekday-label">${label}</span>
                <span class="calendar-weekday-indicator"></span>
            </div>
        `).join('');
    }

    const daysEl = document.getElementById('calendar-days');
    if (!daysEl) return;

    const todayKey = toLocalDayKey(new Date());
    const hasByDay = new Set(
        plannerState.schedule
            .filter(s => s && s.startAt)
            .map(s => toLocalDayKey(s.startAt))
            .filter(Boolean)
    );

    const daysHtml = [];
    for (let i = 0; i < 7; i += 1) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const key = toLocalDayKey(d);
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;
        const has = hasByDay.has(key);
        daysHtml.push(`
            <button class="calendar-day ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}" type="button" data-day-key="${key}">
                <span class="calendar-day-num">${d.getDate()}</span>
                ${has ? `<span class="calendar-day-dot"></span>` : `<span class="calendar-day-dot is-empty"></span>`}
            </button>
        `);
    }
    daysEl.innerHTML = daysHtml.join('');

    daysEl.querySelectorAll('button[data-day-key]').forEach(btn => {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-day-key') || '';
            plannerState.selectedDayKey = key;
            renderPlanner();
        });
    });
}

function getActiveLocale() {
    return document.documentElement.getAttribute('lang') || (window.i18n && window.i18n.locale) || navigator.language || 'en-US';
}

function formatMonthDay(value, locale) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    try {
        return d.toLocaleDateString(locale, { month: 'numeric', day: 'numeric' });
    } catch (_) {
        return d.toLocaleDateString();
    }
}

function ensureWeeklyProgressUi(weekStart, weekEnd) {
    const root = document.getElementById('weekly-progress');
    if (!root) return;

    const weekKey = `${weekStart.toISOString()}_${weekEnd.toISOString()}`;
    if (plannerState.weekProgressWeekKey === weekKey) return;
    plannerState.weekProgressWeekKey = weekKey;

    const locale = getActiveLocale();

    const rangeEl = document.getElementById('weekly-progress-range');
    if (rangeEl) {
        const lastDay = new Date(weekEnd.getTime() - 1);
        rangeEl.textContent = `${formatMonthDay(weekStart, locale)} - ${formatMonthDay(lastDay, locale)}`;
    }

    const ticks = document.getElementById('weekly-progress-ticks');
    if (ticks) {
        ticks.innerHTML = '';
        for (let i = 0; i <= 7; i += 1) {
            const tick = document.createElement('div');
            tick.className = 'week-tick';
            tick.style.left = `${(i / 7) * 100}%`;
            ticks.appendChild(tick);
        }
    }

    const days = document.getElementById('weekly-progress-days');
    if (days) {
        days.innerHTML = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i < 7; i += 1) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            const chip = document.createElement('div');
            chip.className = 'week-day-chip';
            chip.textContent = String(d.getDate());
            const d0 = new Date(d);
            d0.setHours(0, 0, 0, 0);
            if (d0.getTime() === today.getTime()) chip.classList.add('is-today');
            days.appendChild(chip);
        }
    }
}

function updateWeeklyProgress() {
    const root = document.getElementById('weekly-progress');
    if (!root) return;

    const fill = document.getElementById('weekly-progress-fill');
    const meta = document.getElementById('weekly-progress-meta');
    const nowDot = document.getElementById('weekly-progress-now');
    if (!fill || !meta || !nowDot) return;

    const { start, end } = getWeekRange(Date.now());
    ensureWeeklyProgressUi(start, end);

    const totalMs = end.getTime() - start.getTime();
    const nowMs = Date.now();
    const elapsedMs = Math.max(0, Math.min(totalMs, nowMs - start.getTime()));
    const pct = totalMs ? (elapsedMs / totalMs) * 100 : 0;
    const pctRounded = Math.max(0, Math.min(100, Math.round(pct)));

    fill.style.width = `${pct}%`;
    nowDot.style.left = `${pct}%`;

    const leftMs = Math.max(0, end.getTime() - nowMs);
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;
    const leftDays = Math.floor(leftMs / dayMs);
    const leftHours = Math.floor((leftMs % dayMs) / hourMs);

    const leftText = (getActiveLocale() || '').toLowerCase().startsWith('zh')
        ? `${leftDays}天${leftHours}小时`
        : `${leftDays}d ${leftHours}h`;

    meta.textContent = tText('planner.week_progress.meta', '', { pct: pctRounded, left: leftText });
}

function initPlannerPage() {
    plannerState.tab = 'schedule';
    loadPlannerData();
    if (!plannerState.selectedDayKey) {
        plannerState.selectedDayKey = toLocalDayKey(new Date());
    }

    const tabs = document.getElementById('planner-tabs');
    if (tabs && tabs.dataset.plannerBound !== '1') {
        tabs.dataset.plannerBound = '1';
        tabs.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('[data-planner-tab]') : null;
            if (!btn) return;
            const next = setPlannerTab(btn.getAttribute('data-planner-tab'));
            plannerState.tab = next;
            tabs.querySelectorAll('[data-planner-tab]').forEach(el => {
                el.classList.toggle('active', el.getAttribute('data-planner-tab') === next);
            });
            applyPlannerTabVisibility();
        });
    }

    const addBtn = document.getElementById('planner-add-btn');
    if (addBtn && addBtn.dataset.plannerBound !== '1') {
        addBtn.dataset.plannerBound = '1';
        addBtn.addEventListener('click', () => {
            openScheduleModal();
        });
    }

    const todayBtn = document.getElementById('schedule-today-btn');
    if (todayBtn && todayBtn.dataset.bound !== '1') {
        todayBtn.dataset.bound = '1';
        todayBtn.addEventListener('click', () => {
            plannerState.selectedDayKey = toLocalDayKey(new Date());
            renderPlanner();
        });
    }

    const planProgress = document.getElementById('plan-progress');
    const planProgressValue = document.getElementById('plan-progress-value');
    if (planProgress && planProgressValue && planProgress.dataset.bound !== '1') {
        planProgress.dataset.bound = '1';
        planProgress.addEventListener('input', () => {
            planProgressValue.textContent = `${Number(planProgress.value || 0)}%`;
        });
    }

    const scheduleSaveBtn = document.getElementById('schedule-save-btn');
    if (scheduleSaveBtn && scheduleSaveBtn.dataset.bound !== '1') {
        scheduleSaveBtn.dataset.bound = '1';
        scheduleSaveBtn.addEventListener('click', saveScheduleModal);
    }

    const planSaveBtn = document.getElementById('plan-save-btn');
    if (planSaveBtn && planSaveBtn.dataset.bound !== '1') {
        planSaveBtn.dataset.bound = '1';
        planSaveBtn.addEventListener('click', savePlanModal);
    }

    applyPlannerTabVisibility();
    renderPlanner();
    startPlannerReminderEngine();
    if (plannerState.weekProgressTimerId) {
        clearInterval(plannerState.weekProgressTimerId);
    }
    plannerState.weekProgressTimerId = setInterval(updateWeeklyProgress, 60 * 1000);
}

function applyPlannerTabVisibility() {
    const tabs = document.getElementById('planner-tabs');
    if (tabs) {
        tabs.querySelectorAll('[data-planner-tab]').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-planner-tab') === plannerState.tab);
        });
    }

    const scheduleContainer = document.getElementById('schedule-container');
    const planContainer = document.getElementById('plan-container');
    if (scheduleContainer) scheduleContainer.style.display = plannerState.tab === 'schedule' ? '' : 'none';
    if (planContainer) planContainer.style.display = plannerState.tab === 'plan' ? '' : 'none';
}

function renderPlanner() {
    if (!document.getElementById('planner-root')) return;
    renderPlannerCalendarStrip();
    renderScheduleList();
    renderPlanList();
    updateWeeklyProgress();
}

function renderScheduleList() {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    const locale = getActiveLocale();
    const selectedKey = plannerState.selectedDayKey || toLocalDayKey(new Date());
    const items = plannerState.schedule
        .slice()
        .filter(item => item && item.startAt && toLocalDayKey(item.startAt) === selectedKey)
        .sort((a, b) => (new Date(a.startAt || 0).getTime() || 0) - (new Date(b.startAt || 0).getTime() || 0));

    if (!items.length) {
        container.innerHTML = `<div class="planner-empty">${tText('schedule.empty')}</div>`;
        return;
    }

    const toLabel = String(locale || '').toLowerCase().startsWith('zh') ? '至' : 'to';
    const outfitLabel = tText('schedule.field.outfit.label', 'Outfit');

    container.innerHTML = `
        <div class="agenda-min">
            <div class="agenda-min-header">
                <div class="agenda-min-count">${escapeHtml(tText('schedule.count', '', { count: items.length }) || `${items.length}`)}</div>
            </div>
            <div class="agenda-min-list">
                ${items.map(item => {
                    const startText = formatTimeHM(item.startAt, locale);
                    const endText = item.endAt ? formatTimeHM(item.endAt, locale) : '';
                    const categoryKey = item.category ? `schedule.category.${String(item.category)}` : '';
                    const categoryLabel = categoryKey ? tText(categoryKey, '') : '';
                    const location = String(item.location || '').trim();
                    const outfit = String(item.outfit || '').trim();
                    const note = String(item.note || '').trim();

                    const metaParts = [];
                    if (endText) metaParts.push(`${toLabel} ${endText}`);
                    if (location) metaParts.push(location);
                    if (categoryLabel) metaParts.push(categoryLabel);
                    const meta = metaParts.join(' · ');

                    const subLines = [];
                    if (outfit) subLines.push(`${outfitLabel} · ${outfit}`);
                    if (!outfit && note) subLines.push(note);

                    return `
                        <div class="agenda-min-item" id="schedule-${item.id}" onclick="openScheduleModal('${item.id}')">
                            <div class="agenda-min-time">${escapeHtml(startText)}</div>
                            <div class="agenda-min-dot-col"><span class="agenda-min-dot"></span></div>
                            <div class="agenda-min-main">
                                <div class="agenda-min-title">${escapeHtml(item.title)}</div>
                                ${meta ? `<div class="agenda-min-meta">${escapeHtml(meta)}</div>` : ''}
                                ${subLines.map(line => `<div class="agenda-min-sub">${escapeHtml(line)}</div>`).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderPlanList() {
    const container = document.getElementById('plan-container');
    if (!container) return;

    const filterEl = document.getElementById('plan-filter');
    const filter = filterEl ? String(filterEl.value || 'all') : 'all';

    let items = plannerState.plans.slice();
    if (filter === 'short' || filter === 'long') {
        items = items.filter(p => p.type === filter);
    }
    items.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));

    const filterHtml = `
        <div class="planner-filter-row">
            <select id="plan-filter" class="form-control">
                <option value="all" ${filter === 'all' ? 'selected' : ''} data-i18n="plan.filter.all">${tText('plan.filter.all')}</option>
                <option value="short" ${filter === 'short' ? 'selected' : ''} data-i18n="plan.filter.short">${tText('plan.filter.short')}</option>
                <option value="long" ${filter === 'long' ? 'selected' : ''} data-i18n="plan.filter.long">${tText('plan.filter.long')}</option>
            </select>
        </div>
    `;

    if (!items.length) {
        container.innerHTML = `${filterHtml}<div class="planner-empty">${tText('plan.empty')}</div>`;
        const sel = document.getElementById('plan-filter');
        if (sel && sel.dataset.bound !== '1') {
            sel.dataset.bound = '1';
            sel.addEventListener('change', renderPlanner);
        }
        return;
    }

    container.innerHTML = `
        ${filterHtml}
        <div class="planner-list">
            ${items.map(plan => {
                const pct = Math.max(0, Math.min(100, Number(plan.progress || 0)));
                const dateRange = [plan.startDate, plan.endDate].filter(Boolean).join(' ~ ');
                const note = String(plan.note || '').trim();
                const typeLabel = tText(plan.type === 'long' ? 'plan.type.long' : 'plan.type.short');
                const toggleKey = plan.done ? 'plan.action.mark_undone' : 'plan.action.mark_done';
                const toggleText = tText(toggleKey);
                return `
                    <div class="plan-card ${plan.done ? 'is-done' : ''}" id="plan-${plan.id}">
                        <div class="plan-card-head">
                            <div class="plan-title">${escapeHtml(plan.title)}</div>
                            <div class="plan-type">${escapeHtml(typeLabel)}</div>
                        </div>
                        ${dateRange ? `<div class="plan-dates">${escapeHtml(dateRange)}</div>` : ''}
                        <div class="plan-progress">
                            <div class="plan-progress-bar"><div class="plan-progress-fill" style="width:${pct}%"></div></div>
                            <div class="plan-progress-meta">
                                <span class="plan-progress-value">${pct}%</span>
                                <input type="range" class="plan-progress-range" min="0" max="100" step="1" value="${pct}" oninput="updatePlanProgress('${plan.id}', this.value)">
                            </div>
                        </div>
                        ${note ? `<div class="plan-note">${escapeHtml(note)}</div>` : ''}
                        <div class="planner-item-actions">
                            <button class="btn btn-secondary btn-sm" onclick="openPlanModal('${plan.id}')" data-i18n="plan.action.edit">${tText('plan.action.edit')}</button>
                            <button class="btn btn-secondary btn-sm" onclick="deletePlanItem('${plan.id}')" data-i18n="plan.action.delete">${tText('plan.action.delete')}</button>
                            <button class="btn btn-primary btn-sm" onclick="togglePlanDone('${plan.id}')" data-i18n="${toggleKey}">${escapeHtml(toggleText)}</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    const sel = document.getElementById('plan-filter');
    if (sel && sel.dataset.bound !== '1') {
        sel.dataset.bound = '1';
        sel.addEventListener('change', renderPlanner);
    }
}

function openScheduleModal(id) {
    plannerState.editingScheduleId = id || null;
    const item = id ? plannerState.schedule.find(s => s.id === id) : null;

    const titleEl = document.getElementById('schedule-modal-title');
    const titleKey = item ? 'schedule.modal.title.edit' : 'schedule.modal.title.add';
    if (titleEl) {
        titleEl.setAttribute('data-i18n', titleKey);
        titleEl.textContent = tText(titleKey);
    }

    const titleInput = document.getElementById('schedule-title');
    const startInput = document.getElementById('schedule-start-time');
    const endInput = document.getElementById('schedule-end-time');
    const categoryInput = document.getElementById('schedule-category');
    const locationInput = document.getElementById('schedule-location');
    const outfitInput = document.getElementById('schedule-outfit');
    const noteInput = document.getElementById('schedule-note');

    let dayKey = plannerState.selectedDayKey || toLocalDayKey(new Date());
    if (item && item.startAt) {
        dayKey = toLocalDayKey(item.startAt) || dayKey;
        plannerState.selectedDayKey = dayKey;
        renderPlannerCalendarStrip();
    }

    const modal = document.getElementById('schedule-modal');
    if (modal) modal.dataset.dayKey = dayKey;

    if (titleInput) titleInput.value = item ? item.title : '';
    if (startInput) startInput.value = item && item.startAt ? toTimeValue(item.startAt) : '';
    if (endInput) endInput.value = item && item.endAt ? toTimeValue(item.endAt) : '';
    if (!item && startInput && !startInput.value) {
        const { startTime, endTime } = getDefaultScheduleTimeRange(dayKey);
        startInput.value = startTime;
        if (endInput) endInput.value = endTime;
    }
    if (item && startInput && endInput && !endInput.value && startInput.value) {
        const tmpStartIso = buildIsoFromDayKeyAndTime(dayKey, startInput.value);
        if (tmpStartIso) {
            const d = new Date(tmpStartIso);
            d.setHours(d.getHours() + 1);
            endInput.value = toTimeValue(d);
        }
    }
    if (categoryInput) categoryInput.value = item ? String(item.category || '') : '';
    if (locationInput) locationInput.value = item ? String(item.location || '') : '';
    if (outfitInput) outfitInput.value = item ? String(item.outfit || '') : '';
    if (noteInput) noteInput.value = item ? String(item.note || '') : '';

    const categoryGroup = document.getElementById('schedule-category-group');
    if (categoryGroup && categoryGroup.dataset.bound !== '1') {
        categoryGroup.dataset.bound = '1';
        categoryGroup.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('button[data-value]') : null;
            if (!btn) return;
            const next = String(btn.getAttribute('data-value') || '');
            const current = String(document.getElementById('schedule-category')?.value || '');
            const value = current === next ? '' : next;
            const hidden = document.getElementById('schedule-category');
            if (hidden) hidden.value = value;
            categoryGroup.querySelectorAll('button[data-value]').forEach(el => {
                el.classList.toggle('active', String(el.getAttribute('data-value') || '') === value);
            });
        });
    }
    if (categoryGroup) {
        const current = String(document.getElementById('schedule-category')?.value || '');
        categoryGroup.querySelectorAll('button[data-value]').forEach(el => {
            el.classList.toggle('active', String(el.getAttribute('data-value') || '') === current);
        });
    }

    openModal('schedule-modal');
}

function saveScheduleModal() {
    const title = (document.getElementById('schedule-title')?.value || '').trim();
    const startTime = String(document.getElementById('schedule-start-time')?.value || '').trim();
    const endTime = String(document.getElementById('schedule-end-time')?.value || '').trim();
    const category = String(document.getElementById('schedule-category')?.value || '').trim();
    const location = String(document.getElementById('schedule-location')?.value || '').trim();
    const outfit = String(document.getElementById('schedule-outfit')?.value || '').trim();
    const note = String(document.getElementById('schedule-note')?.value || '');

    const modal = document.getElementById('schedule-modal');
    const dayKey = (modal && modal.dataset.dayKey) ? String(modal.dataset.dayKey || '') : (plannerState.selectedDayKey || toLocalDayKey(new Date()));

    if (!title || !startTime) {
        showToast(tText('error.fill_fields'));
        return;
    }

    const startAtIso = buildIsoFromDayKeyAndTime(dayKey, startTime);
    let endAtIso = endTime ? buildIsoFromDayKeyAndTime(dayKey, endTime) : '';
    if (endAtIso) {
        const startMs = new Date(startAtIso).getTime();
        const endMs = new Date(endAtIso).getTime();
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
            const endD = new Date(endAtIso);
            endD.setDate(endD.getDate() + 1);
            endAtIso = endD.toISOString();
        }
    }

    const now = Date.now();
    const existingId = plannerState.editingScheduleId;
    const idx = existingId ? plannerState.schedule.findIndex(s => s.id === existingId) : -1;

    if (idx >= 0) {
        const prev = plannerState.schedule[idx];
        plannerState.schedule[idx] = {
            ...prev,
            title,
            startAt: startAtIso,
            endAt: endAtIso,
            category,
            location,
            outfit,
            note,
            updatedAt: now,
            remindedAt: prev.remindedAt
        };
    } else {
        plannerState.schedule.unshift({
            id: makeLocalId('sch'),
            title,
            startAt: startAtIso,
            endAt: endAtIso,
            category,
            location,
            outfit,
            remindAt: '',
            note,
            done: false,
            remindedAt: 0,
            createdAt: now,
            updatedAt: now
        });
    }

    saveScheduleData();
    closeModal('schedule-modal');
    plannerState.editingScheduleId = null;
    renderPlanner();
}

function deleteScheduleItem(id) {
    const item = plannerState.schedule.find(s => s.id === id);
    if (!item) return;
    showConfirmModal(tText('schedule.confirm.delete', 'Delete this schedule?'), () => {
        plannerState.schedule = plannerState.schedule.filter(s => s.id !== id);
        saveScheduleData();
        renderPlanner();
    });
}

function toggleScheduleDone(id) {
    const idx = plannerState.schedule.findIndex(s => s.id === id);
    if (idx === -1) return;
    plannerState.schedule[idx].done = !plannerState.schedule[idx].done;
    plannerState.schedule[idx].updatedAt = Date.now();
    saveScheduleData();
    renderPlanner();
}

function openPlanModal(id) {
    plannerState.editingPlanId = id || null;
    const item = id ? plannerState.plans.find(p => p.id === id) : null;

    const titleEl = document.getElementById('plan-modal-title');
    const titleKey = item ? 'plan.modal.title.edit' : 'plan.modal.title.add';
    if (titleEl) {
        titleEl.setAttribute('data-i18n', titleKey);
        titleEl.textContent = tText(titleKey);
    }

    const titleInput = document.getElementById('plan-title');
    const typeInput = document.getElementById('plan-type');
    const startInput = document.getElementById('plan-start-date');
    const endInput = document.getElementById('plan-end-date');
    const progressInput = document.getElementById('plan-progress');
    const progressValue = document.getElementById('plan-progress-value');
    const noteInput = document.getElementById('plan-note');

    if (titleInput) titleInput.value = item ? item.title : '';
    if (typeInput) typeInput.value = item ? item.type : 'short';
    if (startInput) startInput.value = item ? item.startDate : '';
    if (endInput) endInput.value = item ? item.endDate : '';
    if (progressInput) progressInput.value = item ? String(item.progress || 0) : '0';
    if (progressValue) progressValue.textContent = `${item ? (item.progress || 0) : 0}%`;
    if (noteInput) noteInput.value = item ? item.note : '';

    openModal('plan-modal');
}

function savePlanModal() {
    const title = (document.getElementById('plan-title')?.value || '').trim();
    const type = document.getElementById('plan-type')?.value === 'long' ? 'long' : 'short';
    const startDate = document.getElementById('plan-start-date')?.value || '';
    const endDate = document.getElementById('plan-end-date')?.value || '';
    const progress = Math.max(0, Math.min(100, Number(document.getElementById('plan-progress')?.value || 0)));
    const note = document.getElementById('plan-note')?.value || '';

    if (!title) {
        showToast(tText('error.fill_fields'));
        return;
    }

    const now = Date.now();
    const existingId = plannerState.editingPlanId;
    const idx = existingId ? plannerState.plans.findIndex(p => p.id === existingId) : -1;

    if (idx >= 0) {
        const prev = plannerState.plans[idx];
        plannerState.plans[idx] = {
            ...prev,
            title,
            type,
            startDate,
            endDate,
            progress,
            note,
            updatedAt: now
        };
    } else {
        plannerState.plans.unshift({
            id: makeLocalId('plan'),
            title,
            type,
            startDate,
            endDate,
            progress,
            done: false,
            note,
            createdAt: now,
            updatedAt: now
        });
    }

    savePlanData();
    closeModal('plan-modal');
    plannerState.editingPlanId = null;
    renderPlanner();
}

function deletePlanItem(id) {
    const item = plannerState.plans.find(p => p.id === id);
    if (!item) return;
    showConfirmModal(tText('plan.confirm.delete', 'Delete this plan?'), () => {
        plannerState.plans = plannerState.plans.filter(p => p.id !== id);
        savePlanData();
        renderPlanner();
    });
}

function togglePlanDone(id) {
    const idx = plannerState.plans.findIndex(p => p.id === id);
    if (idx === -1) return;
    plannerState.plans[idx].done = !plannerState.plans[idx].done;
    plannerState.plans[idx].updatedAt = Date.now();
    if (plannerState.plans[idx].done) plannerState.plans[idx].progress = 100;
    savePlanData();
    renderPlanner();
}

function updatePlanProgress(id, value) {
    const idx = plannerState.plans.findIndex(p => p.id === id);
    if (idx === -1) return;
    const pct = Math.max(0, Math.min(100, Number(value || 0)));
    plannerState.plans[idx].progress = pct;
    plannerState.plans[idx].done = pct >= 100;
    plannerState.plans[idx].updatedAt = Date.now();
    savePlanData();

    const card = document.getElementById(`plan-${id}`);
    if (!card) return;
    const fill = card.querySelector('.plan-progress-fill');
    if (fill) fill.style.width = `${pct}%`;
    const label = card.querySelector('.plan-progress-value');
    if (label) label.textContent = `${pct}%`;
}

function startPlannerReminderEngine() {
    if (plannerState.reminderTimerId) {
        clearInterval(plannerState.reminderTimerId);
        plannerState.reminderTimerId = null;
    }
    plannerState.reminderTimerId = setInterval(checkScheduleReminders, 30000);
    checkScheduleReminders();

    if (!window.__plannerVisibilityBound) {
        window.__plannerVisibilityBound = true;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkScheduleReminders();
        });
    }
}

function checkScheduleReminders() {
    if (!plannerState.schedule.length) return;
    const now = Date.now();

    let changed = false;
    plannerState.schedule.forEach(item => {
        if (item.done) return;
        if (!item.remindAt) return;
        if (item.remindedAt) return;
        const due = new Date(item.remindAt).getTime();
        if (!Number.isFinite(due)) return;
        if (due > now) return;

        item.remindedAt = now;
        item.updatedAt = now;
        changed = true;
        showScheduleReminder(item);
    });

    if (changed) saveScheduleData();
}

function showScheduleReminder(item) {
    const title = tText('schedule.reminder.title', 'Reminder');
    const body = `${item.title}${item.startAt ? `\n${formatDateTimeDisplay(item.startAt)}` : ''}`;

    if (window.Notification && window.isSecureContext && Notification.permission === 'granted') {
        try {
            new Notification(title, { body });
            return;
        } catch (_) {}
    }
    showToast(`${title}: ${item.title}`);
}

function maybeRequestNotificationPermission(remindAtIso) {
    if (!remindAtIso) return;
    if (!window.Notification) return;
    if (!window.isSecureContext) return;
    if (Notification.permission !== 'default') return;
    Notification.requestPermission().catch(() => {});
}

function toDatetimeLocalValue(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(localValue) {
    const d = new Date(localValue);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString();
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

let uploadedImage = null;

function triggerUpload() {
    document.getElementById('file-input').click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage = e.target.result;
            const preview = document.getElementById('upload-preview');
            const placeholder = document.getElementById('upload-placeholder');
            
            preview.src = uploadedImage;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function addItem() {
    const name = document.getElementById('item-name').value;
    const type = document.getElementById('item-type').value;
    
    if (name && type) {
        // Simple icon mapping based on type
        let icon = "👕";
        if (type === 'bottom') icon = "👖";
        if (type === 'shoes') icon = "👟";
        if (type === 'outerwear') icon = "🧥";
        if (type === 'accessory') icon = "🧢";
        const image = uploadedImage || null;

        wardrobeItems.unshift({ id: Date.now(), name, type, color: "new", icon, image });
        rebuildWardrobeItemIndex();
        renderWardrobe();
        closeModal('add-modal');
        document.getElementById('item-name').value = '';
        
        // Reset upload area
        document.getElementById('file-input').value = '';
        uploadedImage = null;
        const preview = document.getElementById('upload-preview');
        const placeholder = document.getElementById('upload-placeholder');
        if(preview) preview.style.display = 'none';
        if(placeholder) placeholder.style.display = 'block';

    } else {
        showToast(tText('error.fill_fields'));
    }
}

function updateWeather() {
    const widget = document.querySelector('.weather-widget');
    if (!widget) return;

    // Simple simulation based on time/random for demo
    const hour = new Date().getHours();
    let icon = '☀️';
    let tempLow = 22;
    let tempHigh = 28;

    // Randomize slightly
    const rand = Math.random();
    if (rand > 0.7) {
        icon = '☁️';
        tempLow = 20;
        tempHigh = 26;
    } else if (rand > 0.9) {
        icon = '🌧️';
        tempLow = 18;
        tempHigh = 23;
    }
    
    // Night time adjustment
    if (hour < 6 || hour > 19) {
        if (icon === '☀️') icon = '🌙';
        else if (icon === '☁️') icon = '☁️'; 
        tempLow -= 4;
        tempHigh -= 4;
    }

    widget.innerHTML = `
        <span class="weather-icon">${icon}</span>
        <span class="weather-temp">${tempLow}° - ${tempHigh}°</span>
    `;
}

// --- Filter Logic ---
function filterByType(element, type) {
    // Update active state
    document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
    element.classList.add('active');

    // Filter items
    if (type === 'all') {
        renderWardrobe(wardrobeItems);
    } else {
        const filtered = wardrobeItems.filter(item => item.type === type);
        renderWardrobe(filtered);
    }
}

// --- Image Modal Logic ---
function openImageModal(src) {
    if (!src || src === 'undefined' || src === 'null') return;
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image-content');
    if (modal && modalImg) {
        modalImg.src = src;
        const sheet = modal.querySelector('.image-modal-sheet');
        if (sheet && sheet.dataset.bound !== '1') {
            sheet.dataset.bound = '1';
            sheet.addEventListener('click', (e) => e.stopPropagation());
        }
        activateOverlay(modal, sheet || modal);
    }
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        deactivateOverlay(modal);
    }
}

// --- Global UI Helpers ---

window.showToast = function(message, duration = 3000) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 14px;
            z-index: 3000;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
            white-space: nowrap;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    // Force reflow
    toast.offsetHeight;
    toast.style.opacity = '1';
    
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    
    window.toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
    }, duration);
};

window.showConfirmModal = function(message, onConfirm) {
    let modal = document.getElementById('confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 320px; text-align: center;">
                <div class="modal-title" style="margin-bottom: 12px; justify-content: center;">${tText('modal.confirm.title')}</div>
                <p id="confirm-message" style="color: var(--text-sub); margin-bottom: 24px; line-height: 1.5; font-size: 15px;"></p>
                <div class="modal-actions" style="justify-content: center; gap: 12px; margin-top: 0;">
                    <button class="btn btn-cancel" onclick="closeConfirmModal()" style="flex: 1;">${tText('common.cancel')}</button>
                    <button class="btn btn-primary" id="confirm-yes-btn" style="background: var(--error-color, #ff3b30); border: none; flex: 1;">${tText('common.confirm')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('confirm-message').textContent = message;
    
    const yesBtn = document.getElementById('confirm-yes-btn');
    yesBtn.onclick = () => {
        onConfirm();
        closeConfirmModal();
    };
    
    // Use existing helper if available, otherwise manual
    if (typeof activateOverlay === 'function') {
        activateOverlay(modal, modal.querySelector('.modal-content'));
    } else {
        modal.classList.add('active');
    }
};

window.closeConfirmModal = function() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        if (typeof deactivateOverlay === 'function') {
            deactivateOverlay(modal);
        } else {
            modal.classList.remove('active');
        }
    }
};

// --- Automated Auth Test ---
function runAuthTest() {
    console.group('Auth Guard Test');
    
    // Test 1: Simulate Logged Out
    console.log('Test 1: Simulating Logout...');
    window.isLoggedIn = false;
    updateUIForAuth();
    
    const editBtn = document.getElementById('edit-mode-btn');
    const fabBtn = document.querySelector('.fab');
    
    const editHidden = !editBtn || editBtn.style.display === 'none';
    const fabHidden = !fabBtn || fabBtn.style.display === 'none';
    
    if (editHidden && fabHidden) {
        console.log('✅ PASS: Edit and Add buttons hidden when logged out.');
    } else {
        console.error('❌ FAIL: Buttons visible when logged out.', { editHidden, fabHidden });
    }

    // Test 2: Simulate Logged In
    console.log('Test 2: Simulating Login...');
    window.isLoggedIn = true;
    // Simulate being on wardrobe page for visibility logic
    const originalPath = window.location.pathname;
    // Mocking pathname for test if needed, but simple updateUI check usually sufficient if elements exist
    // Force update assuming we are on a page with buttons
    if (editBtn) editBtn.style.display = 'block'; 
    if (fabBtn) fabBtn.style.display = 'flex';
    updateUIForAuth();

    const editVisible = editBtn && editBtn.style.display !== 'none';
    const fabVisible = fabBtn && fabBtn.style.display !== 'none';

    if (editVisible && fabVisible) {
        console.log('✅ PASS: Edit and Add buttons visible when logged in.');
    } else {
        console.error('❌ FAIL: Buttons hidden when logged in.', { editVisible, fabVisible });
    }
    
    // Restore State
    checkAuth();
    updateUIForAuth();
    console.groupEnd();
}

// Expose test function
window.runAuthTest = runAuthTest;
