const installedDocuments = new WeakMap();
const DRAG_THRESHOLD = 8;

function isIgnoredTarget(target) {
    return Boolean(target?.closest?.('button, input, textarea, select, option, [contenteditable="true"], [data-ct-no-drag-scroll]'));
}

function getPoint(event) {
    return {
        x: Number(event.clientX || 0),
        y: Number(event.clientY || 0)
    };
}

function scrollPage(activeWindow, deltaY) {
    if (!deltaY) return;
    if (typeof activeWindow.scrollBy === 'function') {
        activeWindow.scrollBy({ top: deltaY, left: 0, behavior: 'auto' });
        return;
    }
    const scroller = activeWindow.document?.scrollingElement || activeWindow.document?.documentElement;
    if (scroller) {
        scroller.scrollTop += deltaY;
    }
}

export function installVerticalDragScroll(activeDocument = globalThis.document) {
    if (!activeDocument?.addEventListener || !activeDocument.defaultView) {
        return { teardown() {} };
    }
    if (installedDocuments.has(activeDocument)) {
        return installedDocuments.get(activeDocument);
    }

    const activeWindow = activeDocument.defaultView;
    let drag = null;
    let suppressClick = false;

    const startDrag = (event, source) => {
        if (event.defaultPrevented || isIgnoredTarget(event.target)) return;
        if (source === 'mouse' && event.button !== 0) return;
        if (drag) return;

        const point = getPoint(event);
        drag = {
            source,
            startX: point.x,
            startY: point.y,
            lastY: point.y,
            moved: false
        };
    };

    const moveDrag = (event, source) => {
        if (!drag || drag.source !== source) return;

        const point = getPoint(event);
        const dx = point.x - drag.startX;
        const dy = point.y - drag.startY;

        if (!drag.moved) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_THRESHOLD) return;
            if (Math.abs(dx) > Math.abs(dy)) {
                drag = null;
                return;
            }
            drag.moved = true;
            suppressClick = true;
        }

        scrollPage(activeWindow, drag.lastY - point.y);
        drag.lastY = point.y;
        event.preventDefault();
    };

    const endDrag = (event, source) => {
        if (!drag || drag.source !== source) return;
        drag = null;
    };

    const stopSuppressedClick = (event) => {
        if (!suppressClick) return;
        suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
    };

    const stopNativeDrag = (event) => {
        if (isIgnoredTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
    };

    const eventOptions = { capture: true, passive: false };
    const clickOptions = { capture: true };
    const onPointerDown = (event) => startDrag(event, 'pointer');
    const onPointerMove = (event) => moveDrag(event, 'pointer');
    const onPointerUp = (event) => endDrag(event, 'pointer');
    const onMouseDown = (event) => startDrag(event, 'mouse');
    const onMouseMove = (event) => moveDrag(event, 'mouse');
    const onMouseUp = (event) => endDrag(event, 'mouse');

    activeDocument.addEventListener('pointerdown', onPointerDown, eventOptions);
    activeDocument.addEventListener('pointermove', onPointerMove, eventOptions);
    activeDocument.addEventListener('pointerup', onPointerUp, eventOptions);
    activeDocument.addEventListener('pointercancel', onPointerUp, eventOptions);
    activeDocument.addEventListener('mousedown', onMouseDown, eventOptions);
    activeDocument.addEventListener('mousemove', onMouseMove, eventOptions);
    activeDocument.addEventListener('mouseup', onMouseUp, eventOptions);
    activeDocument.addEventListener('dragstart', stopNativeDrag, eventOptions);
    activeDocument.addEventListener('click', stopSuppressedClick, clickOptions);

    const api = {
        teardown() {
            activeDocument.removeEventListener('pointerdown', onPointerDown, eventOptions);
            activeDocument.removeEventListener('pointermove', onPointerMove, eventOptions);
            activeDocument.removeEventListener('pointerup', onPointerUp, eventOptions);
            activeDocument.removeEventListener('pointercancel', onPointerUp, eventOptions);
            activeDocument.removeEventListener('mousedown', onMouseDown, eventOptions);
            activeDocument.removeEventListener('mousemove', onMouseMove, eventOptions);
            activeDocument.removeEventListener('mouseup', onMouseUp, eventOptions);
            activeDocument.removeEventListener('dragstart', stopNativeDrag, eventOptions);
            activeDocument.removeEventListener('click', stopSuppressedClick, clickOptions);
            installedDocuments.delete(activeDocument);
        }
    };
    installedDocuments.set(activeDocument, api);
    return api;
}
