// Smart Wardrobe App Logic

// --- Data ---

let wardrobeItems = [
    { id: 101, name: "White T-Shirt", type: "Top", color: "White", icon: "👕", image: "images/items/101.jpg" },
    { id: 102, name: "Blue Denim Shorts", type: "Bottom", color: "Blue", icon: "🩳", image: "images/items/102.jpg" },
    { id: 103, name: "Navy Blazer", type: "Outerwear", color: "Navy", icon: "🧥", image: "images/items/103.jpg" },
    { id: 104, name: "Beige Trousers", type: "Bottom", color: "Beige", icon: "👖", image: "images/items/1041.jpg" },
    { id: 105, name: "Black Dress", type: "Full Body", color: "Black", icon: "👗", image: "images/items/1050.jpg" },
    { id: 106, name: "Red Heels", type: "Shoes", color: "Red", icon: "👠", image: "images/items/106.jpg" },
    { id: 107, name: "White Sneakers", type: "Shoes", color: "White", icon: "👟", image: "images/items/107.jpg" },
    { id: 108, name: "Straw Hat", type: "Accessory", color: "Beige", icon: "👒", image: "images/items/1083.jpg" },
    { id: 109, name: "Leather Jacket", type: "Outerwear", color: "Black", icon: "🧥", image: "images/items/109.jpg" },
    { id: 110, name: "Grey Hoodie", type: "Top", color: "Grey", icon: "🧥", image: "images/items/1100.jpg" }
];

let wardrobeItemIndex = new Map();

function rebuildWardrobeItemIndex() {
    wardrobeItemIndex = new Map(wardrobeItems.map(item => [item.id, item]));
}

rebuildWardrobeItemIndex();

// Helper to find items by IDs
function getItemsByIds(ids) {
    return ids.map(id => wardrobeItemIndex.get(id)).filter(Boolean);
}

function getI18nText(key, fallback = '') {
    if (window.i18n && typeof window.i18n.get === 'function') {
        const text = window.i18n.get(key);
        if (text) return text;
    }
    return fallback;
}

function getItemTypeKey(type) {
    return `type_${String(type).toLowerCase().replace(/\s+/g, '_')}`;
}

function getItemColorKey(color) {
    return `color_${String(color).toLowerCase()}`;
}

function getItemName(item) {
    return getI18nText(`item_name_${item.id}`, item.name);
}

function getItemType(item) {
    return getI18nText(getItemTypeKey(item.type), item.type);
}

function getItemColor(item) {
    return getI18nText(getItemColorKey(item.color), item.color);
}

function getItemSubtitle(item) {
    return `${getItemType(item)} • ${getItemColor(item)}`;
}

function renderImageOrIcon(image, alt, icon, style = 'width:100%; height:100%; object-fit:cover;') {
    return image ? `<img src="${image}" alt="${alt}" style="${style}">` : icon;
}

function renderItemMedia(item) {
    return renderImageOrIcon(item.image, item.name, item.icon);
}

function getOutfitDisplay(outfit) {
    return {
        ...outfit,
        title: getI18nText(`outfit_title_${outfit.id}`, outfit.title),
        description: getI18nText(`outfit_desc_${outfit.id}`, outfit.description),
        tag: getI18nText(`outfit_tag_${outfit.id}`, outfit.tag)
    };
}

function getPickDisplay(pick) {
    return {
        ...pick,
        title: getI18nText(`pick_title_${pick.id}`, pick.title),
        description: getI18nText(`pick_desc_${pick.id}`, pick.description)
    };
}

function buildItemCardInnerHTML(item) {
    return `
        <div class="item-image">${renderItemMedia(item)}</div>
        <div class="item-details">
            <div class="item-title">${getItemName(item)}</div>
            <div class="item-subtitle">${getItemSubtitle(item)}</div>
        </div>
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
            <div class="outfit-image-collage">
                ${collageHTML}
            </div>
        </div>
        <div class="outfit-content">
            <div class="outfit-title">${display.title}</div>
            <div class="outfit-meta">
                <span class="item-tag">${display.tag}</span>
                <span>${items.length} ${getI18nText('text_items', 'Items')}</span>
            </div>
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
        title: "Summer Breeze", 
        itemIds: [101, 102, 107, 108], 
        tag: "Casual",
        description: "Perfect for a sunny day out in the park."
    },
    { 
        id: 2, 
        title: "Office Chic", 
        itemIds: [101, 103, 104, 106], 
        tag: "Work",
        description: "Professional yet stylish look for meetings."
    },
    { 
        id: 3, 
        title: "Date Night", 
        itemIds: [105, 109, 106], 
        tag: "Formal",
        description: "Elegant black dress with a touch of edge."
    }
];



const todaysPicks = [
    {
        id: 'p1',
        title: "Morning Coffee",
        description: "Cozy start to the day",
        itemIds: [110, 104, 107],
        icon: "☕️"
    },
    {
        id: 'p2',
        title: "City Walk",
        description: "Explore the streets",
        itemIds: [101, 102, 109, 107],
        icon: "🏙️"
    },
    {
        id: 'p3',
        title: "Dinner Date",
        description: "Impress your partner",
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
    const activeTab = Array.from(document.querySelectorAll('.tab')).find(t => t.textContent.includes(tabName) || t.getAttribute('data-tab') === tabName);
    if (activeTab) activeTab.classList.add('active');

    // Filter content based on tab (for Home page)
    const container = document.getElementById('content-container');
    if (container) {
        if (tabName === 'daily') {
            renderOutfits(outfits);

        } else if (tabName === 'favorites') {
            container.innerHTML = `<div style="text-align:center; color:#999; padding:20px;">${window.i18n.get('text_no_favorites')}</div>`;
        }
    }
}

function renderOutfits(data) {
    const container = document.getElementById('content-container');
    if (!container) return;
    
    container.innerHTML = data.map(outfit => buildOutfitCardHTML(outfit)).join('');
    
    // Attach events after rendering
    data.forEach(outfit => {
        const el = document.getElementById(`outfit-${outfit.id}`);
        if (el) {
            attachCardEvents(el, () => openDetail(outfit.id, 'outfit'));
        }
    });
    
    updateScrollbarVisibility();
}



function renderTodaysPicks() {
    const container = document.getElementById('todays-picks-container');
    if (!container) return;

    container.innerHTML = todaysPicks.map(pick => {
        const display = getPickDisplay(pick);
        const items = getItemsByIds(pick.itemIds);
        // Just show the first item icon or a generic one if missing
        const mainItem = items[0];
        const mainIcon = mainItem ? renderItemMedia(mainItem) : pick.icon;
        
        return `
        <div class="pick-card" id="pick-${pick.id}">
            <div class="pick-image">${mainIcon}</div>
            <div class="pick-info">
                <div class="pick-title">${display.title}</div>
                <div class="pick-desc">${display.description}</div>
            </div>
        </div>
        `;
    }).join('');
    
    // Attach custom tap/scroll events
    todaysPicks.forEach(pick => {
        const el = document.getElementById(`pick-${pick.id}`);
        if (el) {
            attachCardEvents(el, () => openDetail(pick.id, 'pick'));
        }
    });
    
    updateScrollbarVisibility();
}

function renderWardrobe(items = wardrobeItems) {
    const container = document.getElementById('wardrobe-list');
    if (!container) return;

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
        
        // Show FAB in normal mode
        const fab = document.querySelector('.fab');
        if (fab) fab.style.display = 'flex';

        // Init swipe listeners
        items.forEach(item => {
            const el = document.getElementById(`item-${item.id}`);
            if (el) initSwipe(el, item.id);
        });
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
        btn.innerText = window.i18n.get('btn_done');
        footer.classList.add('active');
    } else {
        btn.innerText = window.i18n.get('edit');
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
    
    if (countSpan) countSpan.innerText = `${count} ${window.i18n.get('text_selected_count')}`;
    if (deleteBtn) deleteBtn.disabled = count === 0;
}

function deleteSelected() {
    if (selectedItems.size === 0) return;
    
    showConfirmModal(window.i18n.get('confirm_delete_items', { count: selectedItems.size }), () => {
        wardrobeItems = wardrobeItems.filter(item => !selectedItems.has(item.id));
        rebuildWardrobeItemIndex();
        selectedItems.clear();
        updateEditFooter();
        renderWardrobe();
    });
}

function deleteItem(id) {
    showConfirmModal(window.i18n.get('confirm_delete_item'), () => {
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
    const headerHTML = isWardrobeItem ? `<div class="detail-header-image">${mainIcon}</div>` : '';
    const contentStyle = isWardrobeItem ? '' : 'height: 100%; max-height: 100%; border-radius: 0;';
    const handleHTML = isWardrobeItem ? '<div class="drag-handle-bar"></div>' : '<div style="height: 60px;"></div>';
    
    content.innerHTML = `
        <button class="detail-back-btn" onclick="closeDetail()">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        
        ${headerHTML}
        
        <div class="detail-content" id="swipe-sheet" style="${contentStyle}">
            ${handleHTML}
            <div class="detail-content-scroll" style="${isWardrobeItem ? '' : 'padding-top: 80px;'}">
                <div class="detail-title">${data.title}</div>
                <div class="detail-tags">
                    ${data.tag ? `<span class="tag-badge">${data.tag}</span>` : ''}
                    ${items.length > 0 ? `<span class="tag-badge">${items.length} ${getI18nText('text_items', 'Items')}</span>` : ''}
                </div>
                <p style="color:#666; line-height:1.5; margin-bottom:20px;">
                    ${data.description || getI18nText('text_default_description')}
                </p>

                ${items.length > 0 ? `
                <div class="items-list-title">${getI18nText('text_items_in_look')}</div>
                
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

// Close modal when clicking outside
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            deactivateOverlay(overlay);
        }
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth(); // Check authentication status first
    updateUIForAuth(); // Update UI based on auth status
    updateUserProfile(); // Update user profile info
    updateWeather();
    updateScrollbarVisibility();
    window.addEventListener('resize', updateScrollbarVisibility);

    // Global Auto Location Init (Singleton)
    if (window.autoLocationService) {
        window.autoLocationService.initAutoLocation();
    }

    // Check which page we are on
    if (document.getElementById('content-container')) {
        renderTodaysPicks();
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
        // Re-render Outfits/Collections
        renderCollections();
    }
    
    // Update Profile User Info (e.g. "Unnamed")
    updateUserProfile();
    
    // Update Auth UI (Login prompt text)
    updateUIForAuth();
    
    // Update Edit Mode UI (button text)
    if (typeof isEditing !== 'undefined' && isEditing) {
        const btn = document.getElementById('edit-mode-btn');
        if (btn) btn.innerText = window.i18n.get('btn_done');
        updateEditFooter();
    } else {
        const btn = document.getElementById('edit-mode-btn');
        if (btn) btn.innerText = window.i18n.get('edit');
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

    if (!window.isLoggedIn) {
        // 1. Handle Navigation Lock
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(nav => {
            if (nav.getAttribute('href') && nav.getAttribute('href').includes('wardrobe.html')) {
                 // Add Lock Icon
                 const lockIcon = document.createElement('div');
                 lockIcon.className = 'nav-lock-icon';
                 lockIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
                 nav.appendChild(lockIcon);
            }
        });

        // 2. Handle Profile Page Button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.textContent = window.i18n.get('btn_sign_in') || "Sign In";
            logoutBtn.setAttribute('data-i18n', 'btn_sign_in');
            logoutBtn.onclick = () => window.location.href = 'login.html';
            logoutBtn.classList.add('btn-primary'); 
            // Reset red color if it was set via class
            logoutBtn.style.backgroundColor = 'var(--primary-color)';
            logoutBtn.style.color = 'var(--text-on-primary)';
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
                <h2 style="margin-bottom: 10px; color: #333;">${window.i18n.get('prompt_signin_required')}</h2>
                <p style="color: #666; margin-bottom: 30px;">${window.i18n.get('prompt_signin_desc')}</p>
                <button class="btn-primary" onclick="window.location.href='login.html'" style="padding: 12px 40px; border-radius: 25px;">
                    ${window.i18n.get('btn_sign_in')}
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

function updateUserProfile() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        const user = JSON.parse(userStr);
        
        // Update profile name
        const nameElement = document.getElementById('display-name');
        if (nameElement) {
            let displayName = user.name;
            if (!displayName || displayName === 'undefined' || displayName.trim() === '') {
                // Handle unnamed state
                if (window.i18n && window.i18n.locale === 'zh-CN') {
                    displayName = getI18nText('autoSelect.unnamed');
                } else {
                    // For other languages, keep original behavior (empty or undefined)
                    // Or fallback to 'Unnamed' if desired, but user said "only affect zh"
                    // However, to be safe and consistent, we might want a fallback.
                    // But strictly following "ensure logic only affects lang=zh"
                    displayName = displayName || ''; 
                }
            }
            nameElement.innerText = displayName;
        }

        // Update profile avatar
        if (user.avatar) {
            const avatarElements = document.querySelectorAll('.profile-avatar');
            avatarElements.forEach(img => {
                img.src = user.avatar;
            });
        }

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
}

function renderCollections() {
    const container = document.getElementById('content-container');
    if (!container) return;

    // Check Auth for Content
    if (!window.isLoggedIn) {
        container.innerHTML = `
            <div class="locked-section" onclick="window.location.href='login.html'">
                <div class="locked-icon-large">🔒</div>
                <div class="locked-text">${window.i18n.get('content_locked_title') || "Sign in for recommendations"}</div>
                <div class="locked-subtext">${window.i18n.get('content_locked_desc') || "Get personalized daily outfit suggestions based on your wardrobe."}</div>
                <button class="btn-primary" style="padding: 8px 24px; font-size: 14px;">${window.i18n.get('btn_sign_in') || "Sign In"}</button>
            </div>
        `;
        updateScrollbarVisibility();
        return;
    }

    renderOutfits(outfits);
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
        if (type === 'Bottom') icon = "👖";
        if (type === 'Shoes') icon = "👟";
        if (type === 'Outerwear') icon = "🧥";
        if (type === 'Accessory') icon = "🧢";
        const image = uploadedImage || null;

        wardrobeItems.unshift({ id: Date.now(), name, type, color: "New", icon, image });
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
        showToast(window.i18n ? (window.i18n.get('msg_fill_fields') || 'Please fill in all fields') : 'Please fill in all fields');
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
        <span class="weather-temp">${tempLow}° - ${tempHigh}°C</span>
    `;
}

// --- Filter Logic ---
function filterByType(element, type) {
    // Update active state
    document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
    element.classList.add('active');

    // Filter items
    if (type === 'All') {
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
        activateOverlay(modal, modal);
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
                <div class="modal-title" style="margin-bottom: 12px; justify-content: center;">${window.i18n ? (window.i18n.get('text_confirm') || 'Confirm') : 'Confirm'}</div>
                <p id="confirm-message" style="color: var(--text-sub); margin-bottom: 24px; line-height: 1.5; font-size: 15px;"></p>
                <div class="modal-actions" style="justify-content: center; gap: 12px; margin-top: 0;">
                    <button class="btn btn-cancel" onclick="closeConfirmModal()" style="flex: 1;">${window.i18n ? (window.i18n.get('btn_cancel') || 'Cancel') : 'Cancel'}</button>
                    <button class="btn btn-primary" id="confirm-yes-btn" style="background: var(--error-color, #ff3b30); border: none; flex: 1;">${window.i18n ? (window.i18n.get('btn_confirm') || 'Confirm') : 'Confirm'}</button>
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
