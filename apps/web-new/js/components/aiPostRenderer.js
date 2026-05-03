import { getLocale, getSharedCopy } from '../lib/locale.js'

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function renderParagraphText(text) {
    const safe = escapeHtml(text)
    const parts = safe.split(/\n{2,}/g).map((part) => part.trim()).filter(Boolean)
    if (!parts.length) return ''
    return parts.map((part) => `<p>${part.replaceAll('\n', '<br>')}</p>`).join('')
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

function renderGallery(urls = [], alts = [], columns = 3) {
    const safeUrls = (urls || []).map((url) => String(url || '').trim()).filter(Boolean)
    if (!safeUrls.length) return ''
    const safeAlts = (alts || []).map((alt) => String(alt || '').trim())
    const className = columns === 2 ? 'ct-ai-gallery ct-ai-gallery--2' : 'ct-ai-gallery ct-ai-gallery--3'
    return `
        <div class="${className}">
            ${safeUrls.map((url, idx) => `
                <img class="ct-ai-image" src="${escapeHtml(url)}" alt="${escapeHtml(safeAlts[idx] || '')}" loading="lazy">
            `).join('')}
        </div>
    `
}

function renderBlock(block) {
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

    if (layout === 'hero_full_bleed') {
        const heroUrl = String(urls?.[0] || '').trim()
        return `
            <section class="ct-ai-block ct-ai-block--hero">
                ${heroUrl ? `<img class="ct-ai-hero" src="${escapeHtml(heroUrl)}" alt="${escapeHtml(alts?.[0] || '')}" loading="lazy">` : ''}
                <div class="ct-ai-text">${renderParagraphText(text)}</div>
            </section>
        `
    }

    if (layout === 'split_image_left' || layout === 'split_image_right') {
        const heroUrl = String(urls?.[0] || '').trim()
        const media = heroUrl ? `<img class="ct-ai-image ct-ai-split__image" src="${escapeHtml(heroUrl)}" alt="${escapeHtml(alts?.[0] || '')}" loading="lazy">` : ''
        const body = `<div class="ct-ai-split__text">${renderParagraphText(text)}</div>`
        return `
            <section class="ct-ai-block ct-ai-block--split ct-ai-block--${layout}">
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
        return `<section class="ct-ai-block ct-ai-block--gallery">${renderGallery(urls, alts, 2)}</section>`
    }

    if (layout === 'gallery_3') {
        return `<section class="ct-ai-block ct-ai-block--gallery">${renderGallery(urls, alts, 3)}</section>`
    }

    if (layout === 'list_bullets') {
        return `
            <section class="ct-ai-block ct-ai-block--bullets">
                ${renderListBullets(text)}
            </section>
        `
    }

    if (layout === 'tip_box_rules') {
        return `
            <section class="ct-ai-block ct-ai-block--tip">
                <div class="ct-ai-tip">
                    ${renderParagraphText(text)}
                </div>
            </section>
        `
    }

    if (layout === 'text_dense') {
        return `
            <section class="ct-ai-block ct-ai-block--text">
                ${urls?.length ? `<img class="ct-ai-image" src="${escapeHtml(urls[0])}" alt="${escapeHtml(alts?.[0] || '')}" loading="lazy">` : ''}
                <div class="ct-ai-text">${renderParagraphText(text)}</div>
            </section>
        `
    }

    return `
        <section class="ct-ai-block ct-ai-block--fallback" data-ct-ai-layout="${escapeHtml(rawLayout)}">
            ${urls?.length ? `<img class="ct-ai-image" src="${escapeHtml(urls[0])}" alt="${escapeHtml(alts?.[0] || '')}" loading="lazy">` : ''}
            <div class="ct-ai-text">${renderParagraphText(text)}</div>
        </section>
    `
}

export function renderAiPost(post, ai, social, detailState = {}) {
    const sharedCopy = getSharedCopy(getLocale())
    const heroUrl = String(ai?.hero?.image_url || post.heroImage || post.images?.[0] || '').trim()
    const heroAlt = String(ai?.hero?.alt || ai?.title || post.title || '').trim()
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
                image_alts: []
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
                ${heroUrl ? `<img class="ct-post-detail__image ct-ai-post__hero" src="${escapeHtml(heroUrl)}" alt="${escapeHtml(heroAlt)}">` : ''}
            </div>
            <div class="ct-post-detail__copy">
                <h1 class="ct-post-detail__title">${escapeHtml(ai?.title || post.title)}</h1>
                <div class="ct-post-detail__body ct-ai-post__body">
                    ${effectiveParagraphs.map((block) => renderBlock(block)).join('')}
                </div>
                <div class="ct-post-detail__tags">
                    ${(tags || []).map((tag) => `<span class="ct-post-detail__tag">#${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
            <div class="ct-post-detail__actions">
                <button class="ct-post-detail__like${social.isLiked ? ' is-active' : ''}" data-ct-post-like type="button" aria-pressed="${social.isLiked ? 'true' : 'false'}">♥ ${escapeHtml(social.likesDisplay || post.stats.likes)}</button>
                <span>✦ ${escapeHtml(social.commentsDisplay || post.stats.comments)}</span>
                <button class="ct-post-detail__share" data-ct-post-share type="button">${getLocale() === 'zh-CN' ? '↗ 分享' : '↗ Share'}</button>
                <button class="ct-post-detail__bookmark${social.isSaved ? ' is-active' : ''}" data-ct-post-bookmark type="button" aria-pressed="${social.isSaved ? 'true' : 'false'}">${social.isSaved ? '♥' : '♡'} ${sharedCopy.actions.savePost}</button>
            </div>
            <p class="ct-post-detail__feedback" data-ct-post-share-feedback>${escapeHtml(detailState.shareFeedback || '')}</p>
        </article>
    `
}
