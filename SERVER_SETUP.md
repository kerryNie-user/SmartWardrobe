# SmartWardrobe Local Server Architecture Guide

To maintain a clean separation between the Android native frame and the WebApp logic, we run the WebApp on a local server on your computer, and the Android app connects to it as a client.

## 1. Start the Local Web Server

We use a Python script to serve the `App/WebApp` directory.

1. Open a terminal in the project root (`/Users/kerry-mac/SmartWardrobe`).
2. Run the server:
   ```bash
   python3 server.py
   ```
3. You will see output like:
   ```
   Starting server at http://192.168.3.37:8080
   Serving directory: App/WebApp
   Access the app at: http://192.168.3.37:8080/wardrobe/index.html
   ```

## 2. Configure the Android App

### For Android Emulator
- The app is pre-configured to use `http://10.0.2.2:8080/wardrobe/index.html`.
- `10.0.2.2` is a special IP that allows the emulator to access the host computer's localhost.
- **No changes needed** if you are using the official Android Emulator.

### For Real Android Device
1. Ensure your phone and computer are on the **same Wi-Fi network**.
2. Open `App/AndroidApp/app/src/main/java/com/example/smartwardrobe/MainActivity.kt`.
3. Update `serverUrl` with your computer's IP address (shown when you start `server.py`):
   ```kotlin
   private val serverUrl = "http://192.168.3.37:8080/wardrobe/index.html"
   ```
4. Rebuild and install the app.

## 3. Development Workflow

1. **Edit Web Code**: Modify HTML/CSS/JS files in `App/WebApp/wardrobe`.
2. **Refresh**: Just reload the page in the Android app (click "Retry" if error dialog is shown, or restart the app). No need to rebuild the APK for web changes!
3. **Edit Native Code**: If you change `MainActivity.kt` or `AndroidManifest.xml`, you must rebuild and reinstall the Android app.

## Troubleshooting

- **Connection Error**: 
  - Is `server.py` running?
  - Is the IP correct?
  - Is the firewall allowing port 8080?
- **Page Not Found (404)**:
  - Check if the URL path `/wardrobe/index.html` matches your file structure in `App/WebApp`.
