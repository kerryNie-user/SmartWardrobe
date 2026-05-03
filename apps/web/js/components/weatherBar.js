import { getLocale, getSharedCopy } from '../lib/locale.js';
import { getTemperatureUnitPreference } from '../lib/settingsStore.js';

function formatTemperature(temperature, unit) {
    const match = String(temperature).trim().match(/(-?\d+(?:\.\d+)?)\s*°([CF])/i);
    if (!match) {
        return temperature;
    }

    const value = Number(match[1]);
    const sourceUnit = match[2].toUpperCase();

    if (unit === 'celsius') {
        if (sourceUnit === 'C') {
            return `${Math.round(value)}°C`;
        }
        return `${Math.round((value - 32) * 5 / 9)}°C`;
    }

    if (sourceUnit === 'F') {
        return `${Math.round(value)}°F`;
    }
    return `${Math.round((value * 9 / 5) + 32)}°F`;
}

function normalizeTemperatureView(weather) {
    if (weather?.temperature && typeof weather.temperature === 'object') {
        return {
            current: weather.temperature.current || '',
            low: weather.temperature.low || '',
            high: weather.temperature.high || ''
        };
    }

    return {
        current: weather?.temperature || '',
        low: '',
        high: ''
    };
}

function resolveWeatherArtVariant(condition = '', locale = 'en-US') {
    const normalized = String(condition || '').trim().toLowerCase();
    if (!normalized) return 'cloudy';

    if (locale === 'zh-CN') {
        if (normalized.includes('雨')) return 'rainy';
        if (normalized.includes('雾')) return 'foggy';
        if (normalized.includes('晴')) return 'sunny';
        if (normalized.includes('云')) return 'cloudy';
    }

    if (normalized.includes('rain')) return 'rainy';
    if (normalized.includes('fog') || normalized.includes('mist')) return 'foggy';
    if (normalized.includes('sun') || normalized.includes('clear')) return 'sunny';
    if (normalized.includes('cloud')) return 'cloudy';
    return 'cloudy';
}

export function renderWeatherBar(weather) {
    const locale = getLocale();
    const sharedCopy = getSharedCopy(locale);
    const temperatureView = normalizeTemperatureView(weather);
    const temperature = formatTemperature(temperatureView.current, getTemperatureUnitPreference());
    const lowTemperature = formatTemperature(temperatureView.low, getTemperatureUnitPreference());
    const highTemperature = formatTemperature(temperatureView.high, getTemperatureUnitPreference());
    const condition = weather?.condition || '';
    const locationLabel = weather?.location?.label || weather?.summary || '';
    const compactCaption = [locationLabel, condition].filter(Boolean).join('·');
    const artVariant = resolveWeatherArtVariant(condition, locale);
    return `
        <div class="ct-weather-card ct-home-weather ct-home-weather--compact" data-weather-art="${artVariant}">
            <span class="ct-home-weather__art-disc" aria-hidden="true"></span>
            <span class="ct-home-weather__art-disc" aria-hidden="true"></span>
            <span class="ct-home-weather__art-disc" aria-hidden="true"></span>
            <span class="ct-home-weather__art-line" aria-hidden="true"></span>
            <span class="ct-home-weather__art-line" aria-hidden="true"></span>
            <span class="ct-home-weather__art-line" aria-hidden="true"></span>
            <span class="ct-eyebrow">${sharedCopy.misc.weatherReport}</span>
            <div class="ct-home-weather__temp">${temperature}</div>
            <div class="ct-home-weather__range">
                ${lowTemperature ? `<span class="ct-home-weather__range-item ct-home-weather__low"><span class="ct-home-weather__arrow" aria-hidden="true">▼</span>${lowTemperature}</span>` : ''}
                ${highTemperature ? `<span class="ct-home-weather__range-item ct-home-weather__high"><span class="ct-home-weather__arrow" aria-hidden="true">▲</span>${highTemperature}</span>` : ''}
            </div>
            ${compactCaption ? `<div class="ct-home-weather__caption">${compactCaption}</div>` : ''}
        </div>
    `;
}
