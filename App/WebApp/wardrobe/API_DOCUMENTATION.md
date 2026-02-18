# Smart Wardrobe Backend API Documentation

This documentation defines the backend API interfaces required to support the Smart Wardrobe frontend application.

## Base URL
All API requests should be prefixed with:
`http://localhost:3000/api/v1`

## Authentication
The API uses Bearer Token authentication. Include the JWT token in the `Authorization` header for all protected endpoints.

`Authorization: Bearer <token>`

---

## 1. Authentication

### 1.1 Register User
Create a new user account.

- **Endpoint**: `/auth/register`
- **Method**: `POST`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "region": "region_new_york"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": null,
    "region": "region_new_york",
    "profession": "profession_student"
  }
}
```

### 1.2 Login
Authenticate a user and retrieve a token.

- **Endpoint**: `/auth/login`
- **Method**: `POST`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "region": "region_new_york",
    "profession": "profession_student"
  }
}
```

---

## 2. User Profile

### 2.1 Get Profile
Retrieve the current user's profile information.

- **Endpoint**: `/user/profile`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "region": "region_new_york",
  "profession": "profession_student"
}
```

### 2.2 Update Profile
Update the current user's profile details.

- **Endpoint**: `/user/profile`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "name": "Johnathan Doe",
  "avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "region": "region_new_york",
  "profession": "profession_fashion_enthusiast"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Johnathan Doe",
  "email": "john@example.com",
  "avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "region": "region_new_york",
  "profession": "profession_fashion_enthusiast"
}
```

---

## 3. Wardrobe Items

### 3.1 Get All Items
Retrieve a list of all wardrobe items. Supports filtering.

- **Endpoint**: `/items`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `type` (optional): Filter by category (e.g., "Top", "Bottom", "Shoes")
  - `search` (optional): Search by name or color

**Response (200 OK):**
```json
[
  {
    "id": 101,
    "name": "White T-Shirt",
    "type": "Top",
    "color": "White",
    "image": "/uploads/items/101.jpg",
    "createdAt": "2023-10-01T10:00:00Z"
  },
  {
    "id": 102,
    "name": "Blue Denim Shorts",
    "type": "Bottom",
    "color": "Blue",
    "image": "/uploads/items/102.jpg",
    "createdAt": "2023-10-02T11:00:00Z"
  }
]
```

### 3.2 Add New Item
Upload a new item to the wardrobe. Uses `multipart/form-data` for image upload.

- **Endpoint**: `/items`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `multipart/form-data`

**Form Data:**
- `name`: "Red Scarf" (text)
- `type`: "Accessory" (text)
- `color`: "Red" (text)
- `image`: (file)

**Response (201 Created):**
```json
{
  "id": 201,
  "name": "Red Scarf",
  "type": "Accessory",
  "color": "Red",
  "image": "/uploads/items/new_image_123.jpg"
}
```

### 3.3 Delete Item
Remove an item from the wardrobe.

- **Endpoint**: `/items/{id}`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "message": "Item deleted successfully"
}
```

---

## 4. User Outfits (My Wardrobe)

### 4.1 Get My Saved Outfits
Retrieve outfits manually created and saved by the user.

- **Endpoint**: `/outfits/mine`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "My Favorite Summer Look",
    "description": "User created combination",
    "tag": "Casual",
    "items": [
      { "id": 101, "image": "/uploads/items/101.jpg" },
      { "id": 102, "image": "/uploads/items/102.jpg" }
    ]
  }
]
```

### 4.2 Save New Outfit
Save a user-created outfit combination.

- **Endpoint**: `/outfits`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "title": "Date Night",
  "description": "Elegant black dress with a touch of edge.",
  "tag": "Formal",
  "itemIds": [105, 109, 106]
}
```

**Response (201 Created):**
```json
{
  "id": 4,
  "title": "Date Night",
  "itemIds": [105, 109, 106],
  "tag": "Formal"
}
```

### 4.3 Delete Outfit
Delete a saved outfit.

- **Endpoint**: `/outfits/{id}`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "message": "Outfit deleted successfully"
}
```

### 6.2 Reverse Geocode (Optional)
Convert latitude and longitude coordinates into a region key supported by the app.

- **Endpoint**: `/weather/geocode`
- **Method**: `GET`
- **Query Parameters**:
  - `lat`: Latitude (e.g., 31.2304)
  - `lon`: Longitude (e.g., 121.4737)

**Response (200 OK):**
```json
{
  "region_key": "region_shanghai",
  "label": "Shanghai",
  "country": "CN"
}
```

---

## 7. Recommendations & Curated

### 5.1 Get Daily Recommendations (Algo)
Get automated outfit combinations based on the user's *existing wardrobe*.
*Corresponds to "今日穿搭推荐" in UI.*

- **Endpoint**: `/recommendations/daily`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**Response (200 OK):**
```json
[
  {
    "id": "rec_1",
    "title": "Summer Breeze",
    "description": "Based on your White T-Shirt and local weather.",
    "tag": "Casual",
    "items": [
      { "id": 101, "name": "White T-Shirt", "image": "/uploads/items/101.jpg" },
      { "id": 102, "name": "Blue Denim Shorts", "image": "/uploads/items/102.jpg" }
    ]
  }
]
```

### 5.2 Get Curated Selections (Pro Stylist)
Get professional stylist picks/featured looks.
*Corresponds to "今日穿搭精选" in UI.*

- **Endpoint**: `/recommendations/curated`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**Response (200 OK):**
```json
[
  {
    "id": "cur_1",
    "title": "Morning Coffee Style",
    "description": "Professional stylist pick for a cozy start.",
    "icon": "☕️",
    "coverImage": "https://example.com/looks/coffee_style.jpg",
    "items": [
      { "id": 110, "name": "Grey Hoodie" },
      { "id": 104, "name": "Beige Trousers" }
    ]
  }
]
```

---

## 6. Weather & Environment

### 6.1 Get Current Weather
Retrieve weather data for the user's location. 
*Note: The backend should fetch this data from a 3rd-party weather API (e.g., OpenWeatherMap, WeatherAPI) based on the user's region or coordinates.*

- **Endpoint**: `/weather`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `lat` (optional): Latitude
  - `lon` (optional): Longitude
  - `region` (optional): Region key (e.g., "region_new_york")

**Response (200 OK):**
```json
{
  "location": "New York",
  "temperature": {
    "current": 24,
    "low": 22,
    "high": 28,
    "unit": "C"
  },
  "condition": "Sunny",
  "icon": "☀️"
}
```
