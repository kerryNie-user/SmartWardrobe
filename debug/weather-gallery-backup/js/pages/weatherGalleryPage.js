const WEATHER_VARIANTS = [
    { key: 'sunny', label: 'Sunny', localeLabel: '晴', asset: 'sunny.png', temperature: '26°C', low: '18°C', high: '30°C', location: 'Shanghai' },
    { key: 'clear-night', label: 'Clear Night', localeLabel: '晴夜', asset: 'clear-night.png', temperature: '18°C', low: '14°C', high: '22°C', location: 'Hangzhou' },
    { key: 'cloudy', label: 'Cloudy', localeLabel: '多云', asset: 'cloudy.png', temperature: '22°C', low: '17°C', high: '25°C', location: 'Suzhou' },
    { key: 'cloudy-soft', label: 'Cloudy Soft', localeLabel: '轻云', asset: 'cloudy-soft.png', temperature: '21°C', low: '16°C', high: '24°C', location: 'Nanjing' },
    { key: 'rainy', label: 'Rainy', localeLabel: '雨', asset: 'rainy.png', temperature: '19°C', low: '15°C', high: '21°C', location: 'Chengdu' },
    { key: 'foggy', label: 'Foggy', localeLabel: '雾', asset: 'foggy.png', temperature: '16°C', low: '13°C', high: '18°C', location: 'Guiyang' },
    { key: 'snowy', label: 'Snowy', localeLabel: '雪', asset: 'snowy.png', temperature: '2°C', low: '-2°C', high: '4°C', location: 'Harbin' },
    { key: 'stormy', label: 'Stormy', localeLabel: '雷暴', asset: 'stormy.png', temperature: '18°C', low: '14°C', high: '21°C', location: 'Shenzhen' },
    { key: 'sandstorm', label: 'Sandstorm', localeLabel: '沙尘', asset: 'sandstorm.png', temperature: '28°C', low: '22°C', high: '33°C', location: 'Dunhuang' },
    { key: 'hail', label: 'Hail', localeLabel: '冰雹', asset: 'hail.png', temperature: '4°C', low: '0°C', high: '7°C', location: 'Qinghai' },
    { key: 'windy', label: 'Windy', localeLabel: '大风', asset: 'windy.png', temperature: '15°C', low: '10°C', high: '18°C', location: 'Qingdao' }
]

export function renderWeatherGalleryPage() {
    const root = document.querySelector('[data-ct-weather-gallery-page]')
    if (!root) return

    root.innerHTML = `
        <section class="ct-weather-gallery__hero">
            <span class="ct-eyebrow">WEATHER ICONS</span>
            <h1 class="ct-title">Stitch Weather Gallery</h1>
            <p class="ct-body-copy">Cropped weather assets from your wheather.png source sheet, previewed directly without the old CSS icon system.</p>
        </section>
        <section class="ct-weather-gallery__styles">
            <section class="ct-weather-gallery__style" data-ct-weather-gallery-style="stitch">
                <div class="ct-weather-gallery__style-head">
                    <div class="ct-weather-gallery__style-title">Stitch</div>
                    <div class="ct-weather-gallery__style-copy">裁切素材预览</div>
                </div>
                <div class="ct-weather-gallery__grid">
                    ${WEATHER_VARIANTS.map((variant) => `
                        <article class="ct-weather-gallery__item" data-ct-weather-gallery-variant="${variant.key}" data-ct-weather-gallery-card="${variant.key}">
                            <div class="ct-weather-gallery__meta">
                                <div class="ct-weather-gallery__label">${variant.key}</div>
                                <div class="ct-weather-gallery__copy">${variant.label} / ${variant.localeLabel}</div>
                            </div>
                            <div
                                class="ct-weather-gallery-stitch ct-weather-gallery-stitch--${variant.key}"
                                style="background-image: linear-gradient(180deg, rgba(8, 10, 16, 0.04), rgba(8, 10, 16, 0.14) 52%, rgba(8, 10, 16, 0.46)), url('images/weather/${variant.asset}')"
                                aria-label="${variant.label} weather asset"
                            >
                                <div class="ct-weather-card ct-home-weather ct-home-weather--compact ct-weather-gallery-stitch__content">
                                    <div class="ct-home-weather__temp">${variant.temperature}</div>
                                    <div class="ct-weather-gallery-stitch__footer">
                                        <div class="ct-home-weather__range">
                                            <span class="ct-home-weather__range-item ct-home-weather__low"><span class="ct-home-weather__arrow" aria-hidden="true">▼</span>${variant.low}</span>
                                            <span class="ct-home-weather__range-item ct-home-weather__high"><span class="ct-home-weather__arrow" aria-hidden="true">▲</span>${variant.high}</span>
                                        </div>
                                        <div class="ct-home-weather__caption">${variant.location} · ${variant.label}</div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </section>
        </section>
    `
}
