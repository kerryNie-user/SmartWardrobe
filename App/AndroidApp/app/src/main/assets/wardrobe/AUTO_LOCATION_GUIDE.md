# Auto Location Feature Guide

This document describes the implementation and usage of the Auto Location feature in the SmartWardrobe web application.

## 1. Overview
The Auto Location feature allows users to automatically detect their current location (Province, City, District) using the browser's Geolocation API. It includes:
-   **Frontend**: `profile.html` with a refactored "Auto Detect" item.
-   **Logic**: Encapsulated in `js/autoLocation.js` (Service pattern).
-   **Styling**: `css/auto-location.css` for consistent UI.

## 2. Implementation Details

### 2.1 File Structure
-   `js/autoLocation.js`: Contains `AutoLocationService` class.
    -   `detectLocation()`: Main method to trigger location.
    -   `getCoordinates()`: Wraps `navigator.geolocation`.
    -   `reverseGeocode()`: Simulates API call to convert coords to address.
    -   `cacheLocation()`: Caches result in `localStorage`.
-   `css/auto-location.css`: Styles for the list item, spinner, and mobile skeleton.
-   `profile.html`: Integration point.

### 2.2 UI States
The feature supports 4 states (as requested):
1.  **Idle**: Displays "Auto Detect Location" with icon.
2.  **Loading**:
    -   **PC**: Shows a rotating spinner.
    -   **Mobile**: Shows a skeleton loading animation (shimmer effect).
3.  **Success**: Displays "Located: [Province] [City] [District]" in highlighed text.
4.  **Error**: Displays "Location failed, please select manually" in red, and ensures the manual list is visible.

### 2.3 Caching Strategy
-   Key: `autoLocation_SmartWardrobe`
-   Duration: 7 days.
-   Priority: Manual selection overrides cache (clears cache if conflict, or just updates user preference).

## 3. Usage Guide

### 3.1 Coordinate System
The app uses **WGS84** (standard GPS) coordinates from the browser.
If integrating with Chinese map services (Gaode/Baidu), you MUST convert coordinates:
-   **Gaode/Tencent**: GCJ-02
-   **Baidu**: BD-09

### 3.2 Reverse Geocoding Integration
To enable real reverse geocoding:
1.  Register for a Map API Key (e.g., [Gaode Maps](https://lbs.amap.com/) or [Google Maps](https://cloud.google.com/maps-platform/)).
2.  Update `js/autoLocation.js` -> `reverseGeocode` method:
    ```javascript
    async reverseGeocode(lat, lon) {
        // Example: Gaode Maps Web Service
        const key = 'YOUR_API_KEY';
        const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lon},${lat}&key=${key}`;
        const response = await fetch(url);
        const data = await response.json();
        // Parse data.regeocode.addressComponent
        return { ... };
    }
    ```

### 3.3 Testing

#### Unit/Manual Test Cases
| Scenario | Action | Expected Result |
| :--- | :--- | :--- |
| **Success** | Click "Auto Detect" | Spinner/Skeleton appears -> "Located: [City]" appears -> LocalStorage updated. |
| **Deny Auth** | Click "Auto Detect" -> Block permission | "Location failed..." text appears in red. Manual list is visible. |
| **Timeout** | Network disconnect -> Click "Auto Detect" | After 5s, "Location failed..." text appears. |
| **Mobile** | Resize to < 768px -> Click | Full row skeleton animation appears instead of spinner. |

#### Automated Testing Script (Concept)
```javascript
// Run in console to test service
await window.autoLocationService.detectLocation().then(console.log).catch(console.error);
```

## 4. Deliverables Checklist
- [x] Refactored `button` to `div` style (Consistent with menu items).
- [x] Implemented `js/autoLocation.js` (Logic encapsulation).
- [x] Responsive Loading (Spinner vs Skeleton).
- [x] Error Handling & Manual Fallback.
- [x] Documentation.
