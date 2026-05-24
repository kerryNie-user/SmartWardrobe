import { getLocale, getSharedCopy, getUiCopy } from '../lib/locale.js'

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function escapeAttr(value) {
    return escapeHtml(value).replaceAll('\n', ' ')
}

function normalizeCaption(value) {
    if (Array.isArray(value)) {
        for (const item of value) {
            const text = normalizeCaption(item)
            if (text) return text
        }
        return ''
    }
    if (value && typeof value === 'object') {
        const preferredKeys = ['zh-CN', 'zh_CN', 'zh', 'caption_zh', 'image_caption_zh', 'caption', 'image_caption', 'text', 'en-US', 'en_US', 'en']
        for (const key of preferredKeys) {
            const text = normalizeCaption(value[key])
            if (text) return text
        }
        return ''
    }
    return String(value ?? '').trim()
}

function renderParagraphText(text) {
    const safe = escapeHtml(text)
    const parts = safe.split(/\n{2,}/g).map((part) => part.trim()).filter(Boolean)
    if (!parts.length) return ''
    return parts.map((part) => `<p>${part.replaceAll('\n', '<br>')}</p>`).join('')
}

function getTextSignalLength(text) {
    return Array.from(String(text || '').replace(/\s+/g, '')).length
}

function isCompactSplitText(text) {
    const value = String(text || '').trim()
    if (!value) return false
    return getTextSignalLength(value) <= 140 && value.split(/\n{2,}/g).filter((part) => part.trim()).length <= 1
}

function renderCaption(text) {
    const safe = normalizeCaption(text)
    if (!safe) return ''
    return `<p class="ct-ai-media__caption">${escapeHtml(safe)}</p>`
}

function renderMedia(url, alt, className, caption = '', variant = 'content') {
    const safeUrl = String(url || '').trim()
    if (!safeUrl) return ''
    const locale = getLocale()
    const fallbackLabel = getUiCopy(locale).image.unavailable
    const safeAlt = String(alt || '').trim()
    const safeCaption = normalizeCaption(caption)
    const mediaVariant = String(variant || '').trim()
    const variantClass = mediaVariant ? ` ct-ai-media--${escapeAttr(mediaVariant)}` : ''
    return `
        <figure class="ct-ai-media${variantClass}">
            <div class="ct-ai-media__frame">
                <img
                    class="${className} ct-ai-media__image"
                    src="${escapeAttr(safeUrl)}"
                    alt="${escapeAttr(safeAlt || safeCaption)}"
                    loading="lazy"
                    onerror="this.hidden=true; const figure=this.closest('figure'); if (figure) { figure.classList.add('is-broken'); const fallback=figure.querySelector('[data-ct-image-fallback]'); if (fallback) fallback.hidden=false; }"
                >
                <div class="ct-ai-media__fallback" data-ct-image-fallback hidden>${escapeHtml(fallbackLabel)}</div>
            </div>
            ${safeCaption ? renderCaption(safeCaption) : ''}
        </figure>
    `
}

function renderListBullets(text) {
    const lines = String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean)
    const items = lines
        .filter((line) => /^[-•·]\s*/.test(line))
        .map((line) => escapeHtml(line.replace(/^[-•·]\s*/, '')))
        .filter(Boolean)
    if (items.length) {
        return `<ul class="ct-ai-bullets">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
    }
    return renderParagraphText(text)
}

function renderGallery(urls = [], alts = [], captions = [], columns = 3, defaultAlt = '') {
    const safeUrls = (urls || []).map((url) => String(url || '').trim()).filter(Boolean)
    if (!safeUrls.length) return ''
    const safeAlts = (alts || []).map((alt) => String(alt || '').trim())
    const safeCaptions = captions || []
    const className = columns === 2 ? 'ct-ai-gallery ct-ai-gallery--2' : 'ct-ai-gallery ct-ai-gallery--3'
    return `
        <div class="${className}">
            ${safeUrls.map((url, idx) => `
                ${renderMedia(url, safeAlts[idx] || String(defaultAlt || '').trim(), 'ct-ai-image', safeCaptions[idx] || '', 'gallery')}
            `).join('')}
        </div>
    `
}

function renderBlock(block, defaultAlt = '') {
    const rawLayout = String(block?.layout || 'text_dense')
    const layout = rawLayout === 'pull_quote_center'
        ? 'quote_pull'
        : rawLayout === 'split_image_text'
            ? 'split_image_left'
            : rawLayout === 'float_left_photo'
                ? 'split_image_left'
                : rawLayout === 'float_right_photo'
                    ? 'split_image_right'
                    : rawLayout === 'lookbook_cards_3'
                        ? 'gallery_3'
                        : rawLayout === 'image_mosaic_3'
                            ? 'gallery_3'
                            : rawLayout
    const text = String(block?.text || '')
    const urls = block?.image_urls || []
    const alts = block?.image_alts || []
    const captions = block?.image_captions || block?.imageCaptions || block?.captions || []
    const firstUrl = String(urls?.[0] || '').trim()
    const firstAlt = String(alts?.[0] || '').trim() || String(defaultAlt || '').trim()
    const firstCaption = captions?.[0] || ''
    const contentMedia = firstUrl ? renderMedia(firstUrl, firstAlt, 'ct-ai-image', firstCaption, 'content') : ''

    if (layout === 'hero_full_bleed') {
        return `
            <section class="ct-ai-block ct-ai-block--hero">
                ${firstUrl ? renderMedia(firstUrl, firstAlt, 'ct-ai-hero', firstCaption, 'hero') : ''}
                <div class="ct-ai-text">${renderParagraphText(text)}</div>
            </section>
        `
    }

    if (layout === 'split_image_left' || layout === 'split_image_right') {
        const media = firstUrl ? renderMedia(firstUrl, firstAlt, 'ct-ai-image ct-ai-split__image', firstCaption, 'split') : ''
        const body = `<div class="ct-ai-split__text">${renderParagraphText(text)}</div>`
        const densityClass = firstUrl && isCompactSplitText(text) ? ' ct-ai-block--split-compact' : ''
        return `
            <section class="ct-ai-block ct-ai-block--split ct-ai-block--${layout}${densityClass}">
                <div class="ct-ai-split">
                    ${layout === 'split_image_left' ? `${media}${body}` : `${body}${media}`}
                </div>
            </section>
        `
    }

    if (layout === 'quote_pull') {
        return `
            <section class="ct-ai-block ct-ai-block--quote">
                <blockquote class="ct-ai-quote">${escapeHtml(text)}</blockquote>
            </section>
        `
    }

    if (layout === 'gallery_2') {
        return `<section class="ct-ai-block ct-ai-block--gallery">${renderGallery(urls, alts, captions, 2, defaultAlt)}</section>`
    }

    if (layout === 'gallery_3') {
        return `<section class="ct-ai-block ct-ai-block--gallery">${renderGallery(urls, alts, captions, 3, defaultAlt)}</section>`
    }

    if (layout === 'list_bullets') {
        return `
            <section class="ct-ai-block ct-ai-block--bullets">
                ${contentMedia}
                ${renderListBullets(text)}
            </section>
        `
    }

    if (layout === 'tip_box_rules') {
        return `
            <section class="ct-ai-block ct-ai-block--tip">
                ${contentMedia}
                <div class="ct-ai-tip">
                    ${renderParagraphText(text)}
                </div>
            </section>
        `
    }

    if (layout === 'text_dense') {
        return `
            <section class="ct-ai-block ct-ai-block--text">
                ${contentMedia}
                <div class="ct-ai-text">${renderParagraphText(text)}</div>
            </section>
        `
    }

    return `
        <section class="ct-ai-block ct-ai-block--fallback" data-ct-ai-layout="${escapeHtml(rawLayout)}">
            ${contentMedia}
            <div class="ct-ai-text">${renderParagraphText(text)}</div>
        </section>
    `
}

export function renderAiPost(post, ai, social, detailState = {}) {
    const locale = getLocale()
    const sharedCopy = getSharedCopy(locale)
    const uiCopy = getUiCopy(locale)
    const heroUrl = String(ai?.hero?.image_url || post.heroImage || post.images?.[0] || '').trim()
    const heroAlt = String(ai?.hero?.alt || ai?.title || post.title || '').trim()
    const heroCaption = normalizeCaption(ai?.hero?.caption || '')
    const tags = Array.isArray(ai?.tags) ? ai.tags : (post.tags || [])
    const paragraphs = Array.isArray(ai?.paragraphs) ? ai.paragraphs : []
    const effectiveParagraphs = (() => {
        if (!heroUrl || !paragraphs.length) return paragraphs
        const first = paragraphs[0]
        const layout = String(first?.layout || '')
        const urls = Array.isArray(first?.image_urls) ? first.image_urls : []
        const firstUrl = String(urls[0] || '').trim()
        if (layout !== 'hero_full_bleed' || !firstUrl || firstUrl !== heroUrl) return paragraphs
        return [
            {
                ...first,
                image_urls: [],
                image_alts: [],
                image_captions: []
            },
            ...paragraphs.slice(1)
        ]
    })()

    return `
        <article class="ct-post-detail ct-ai-post">
            <header class="ct-post-detail__header">
                <div>
                    <span class="ct-post-detail__author">${escapeHtml(post.author)}</span>
                    <span class="ct-post-detail__time">${escapeHtml(post.time)}</span>
                </div>
                <button class="ct-post-detail__follow${social.isFollowed ? ' is-active' : ''}" data-ct-post-follow type="button" aria-pressed="${social.isFollowed ? 'true' : 'false'}">${sharedCopy.actions.follow}</button>
            </header>
            <div class="ct-post-detail__hero">
                ${heroUrl ? renderMedia(heroUrl, heroAlt, 'ct-post-detail__image ct-ai-post__hero', heroCaption, 'hero') : ''}
            </div>
            <div class="ct-post-detail__copy">
                <h1 class="ct-post-detail__title">${escapeHtml(ai?.title || post.title)}</h1>
                <div class="ct-post-detail__body ct-ai-post__body">
                    ${effectiveParagraphs.map((block) => renderBlock(block, heroAlt)).join('')}
                </div>
                <div class="ct-post-detail__tags">
                    ${(tags || []).map((tag) => `<span class="ct-post-detail__tag">#${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
            <div class="ct-post-detail__actions">
                <button class="ct-post-detail__like${social.isLiked ? ' is-active' : ''}" data-ct-post-like type="button" aria-pressed="${social.isLiked ? 'true' : 'false'}">♥ ${escapeHtml(social.likesDisplay || post.stats.likes)}</button>
                <span>✦ ${escapeHtml(social.commentsDisplay || post.stats.comments)}</span>
                <button class="ct-post-detail__share" data-ct-post-share type="button">${uiCopy.post.shareLabel}</button>
                <button class="ct-post-detail__bookmark${social.isSaved ? ' is-active' : ''}" data-ct-post-bookmark type="button" aria-pressed="${social.isSaved ? 'true' : 'false'}">${social.isSaved ? '♥' : '♡'} ${sharedCopy.actions.savePost}</button>
            </div>
            <p class="ct-post-detail__feedback" data-ct-post-share-feedback>${escapeHtml(detailState.shareFeedback || '')}</p>
        </article>
    `
}
