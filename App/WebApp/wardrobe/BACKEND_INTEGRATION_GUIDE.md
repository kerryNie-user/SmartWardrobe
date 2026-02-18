# Backend Integration Guide

This guide details how to replace the current frontend mock implementations with real backend API calls.

## 1. Authentication

### Login
**Current Mock**: `login.html` -> `handleLogin()`
- Reads users from `localStorage('users')`.
- Sets `localStorage('isLoggedIn')` and `localStorage('currentUser')`.

**Integration Step**:
Replace `handleLogin` logic to call `POST /auth/login`.

```javascript
// Before
const users = JSON.parse(localStorage.getItem('users') || '[]');
const user = users.find(...);
if (user) { ... }

// After
try {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailOrMobile, password: password })
  });
  const data = await response.json();
  if (response.ok) {
    localStorage.setItem('token', data.token); // Store JWT
    // Ensure data.user includes region and profession for other features
    localStorage.setItem('currentUser', JSON.stringify(data.user)); 
    window.location.href = 'index.html';
  } else {
    showError(data.message);
  }
} catch (error) {
  showError('Network error');
}
```

### Register
**Current Mock**: `register.html` -> `handleRegister()`
- Saves new user to `localStorage('users')`.

**Integration Step**:
Replace `handleRegister` logic to call `POST /auth/register`.
If the registration form is updated to include region selection, include it in the request body.

```javascript
// Example with region
const body = {
  name: name,
  email: email,
  password: password,
  region: selectedRegion // if added to UI
};
```

## 2. Wardrobe Items

### Data Source
**Current Mock**: `app.js` -> `let wardrobeItems = [...]`
- Hardcoded array of items.

**Integration Step**:
1. Remove the hardcoded `wardrobeItems` array.
2. Create a function `fetchWardrobeItems()` that calls `GET /items`.
3. Call this function on page load to populate `wardrobeItems`.

```javascript
async function fetchWardrobeItems() {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/v1/items', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  wardrobeItems = await response.json();
  renderWardrobe();
}
```

### Add Item
**Current Mock**: `app.js` -> `addItem()`
- Pushes new object to `wardrobeItems` array.

**Integration Step**:
Call `POST /items` with `FormData` (for image upload).

```javascript
async function addItem() {
  const formData = new FormData();
  formData.append('name', document.getElementById('item-name').value);
  formData.append('type', document.getElementById('item-type').value);
  formData.append('image', fileInput.files[0]);

  const response = await fetch('/api/v1/items', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    body: formData
  });
  const newItem = await response.json();
  wardrobeItems.unshift(newItem);
  renderWardrobe();
}
```

### Delete Item
**Current Mock**: `app.js` -> `deleteItem()`
- Filters `wardrobeItems` array.

**Integration Step**:
Call `DELETE /items/{id}`.

## 3. User Profile

### Get/Update Profile
**Current Mock**: `profile.html` -> `selectRegion`, `selectProfession`, `saveProfile`
- Reads/Writes `localStorage('currentUser')`.

**Integration Step**:
1. On load, call `GET /user/profile` to get latest data (including region/profession).
2. When saving, call `PUT /user/profile`.

```javascript
async function saveProfile() {
  const response = await fetch('/api/v1/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      name: newName,
      region: selectedRegionKey,
      profession: selectedProfessionKey
    })
  });
  // ... update UI
}
```

## 4. Weather

**Current Mock**: `app.js` -> `updateWeather()`
- Uses `Math.random()` to generate temp/condition.

**Integration Step**:
Call `GET /weather` with user's location.

*Implementation Note*: The Backend service should integrate with a real weather provider (e.g., OpenWeatherMap, WeatherAPI, AccuWeather).
1. Receive `region` (e.g., "region_new_york") from frontend.
2. Map region to actual city/coordinates.
3. Call 3rd-party Weather API.
4. Return standardized JSON to frontend.

```javascript
async function updateWeather() {
  // Get region from user profile or geo-location
  const region = currentUser.regionKey || 'region_new_york';
  const response = await fetch(`/api/v1/weather?region=${region}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  const weather = await response.json();
  
  // Update UI with weather.temperature.current, weather.icon, etc.
  widget.innerHTML = `...`;
}
```

### Auto Detect Region (Optional)
**Current Mock**: `profile.html` -> `autoDetectRegion()`
- Uses `navigator.geolocation` and simulates a response.

**Integration Step**:
Call `GET /weather/geocode` with lat/lon.

```javascript
navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    
    const response = await fetch(`/api/v1/weather/geocode?lat=${lat}&lon=${lon}`);
    const data = await response.json();
    
    if (data.region_key) {
        selectRegion(data.region_key);
    }
});
```

## 5. Recommendations

**Current Mock**: `app.js` -> `todaysPicks` array, `outfits` array
- Hardcoded recommendations.

**Integration Step**:
1. `GET /recommendations/daily` -> Replace `todaysPicks`.
2. `GET /outfits/mine` -> Replace `outfits` (User's saved outfits).
3. `GET /recommendations/curated` -> Optional extra section.

## Summary of Files to Modify

| File | Function/Variable | Action |
|------|-------------------|--------|
| `login.html` | `handleLogin` | Replace localStorage check with API call. Store JWT token. |
| `register.html` | `handleRegister` | Replace localStorage save with API call. |
| `js/app.js` | `wardrobeItems` | Initialize as empty array. Fetch from API on load. |
| `js/app.js` | `addItem` | Replace array push with API POST. |
| `js/app.js` | `deleteItem` | Replace array filter with API DELETE. |
| `js/app.js` | `updateWeather` | Replace random logic with API GET. |
| `js/app.js` | `todaysPicks` | Fetch from API daily recommendations. |
| `profile.html` | `saveProfile` | Replace localStorage update with API PUT. |

## Frontend Optimization Notes

- `js/app.js` now uses a shared render helper for item cards and outfits, and a map index for item lookup to keep UI rendering fast as data grows.
