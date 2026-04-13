# SmartWardrobe Local Server Architecture Guide

To maintain a clean separation between the Android native frame and the web logic, we run the web app on a local server on your computer, and the Android app connects to it as a client.

## 1. Start the Local Web Server

We use a shell script to serve the current main frontend from `apps/web-new`.

1. Open a terminal in the project root (`/Users/kerry-mac/SmartWardrobe`).
2. Run the server:
   ```bash
   zsh ./scripts/dev/start_lite_backend.sh
   ```
3. You will see output like:
   ```
   Lite backend running at http://127.0.0.1:8140
   Serving frontend from: /Users/kerry-mac/SmartWardrobe/apps/web-new
   Using data file: /Users/kerry-mac/SmartWardrobe/services/backend_lite/data/db.json
   ```

## 2. Configure the Android App

### For Android Emulator
- The app should point to the frontend served by the local backend, for example `http://10.0.2.2:8140/index.html`.
- `10.0.2.2` is a special IP that allows the emulator to access the host computer's localhost.
- **No changes needed** if you are using the official Android Emulator.

### For Real Android Device
1. Ensure your phone and computer are on the **same Wi-Fi network**.
2. Open `apps/android/app/src/main/java/com/example/smartwardrobe/MainActivity.kt`.
3. Update `serverUrl` with your computer's IP address:
   ```kotlin
   private val serverUrl = "http://192.168.3.37:8140/index.html"
   ```
4. Rebuild and install the app.

## 3. Development Workflow

1. **Edit Web Code**: Modify HTML/CSS/JS files in `apps/web-new`.
2. **Refresh**: Just reload the page in the Android app (click "Retry" if error dialog is shown, or restart the app). No need to rebuild the APK for web changes!
3. **Edit Native Code**: If you change `MainActivity.kt` or `AndroidManifest.xml`, you must rebuild and reinstall the Android app.

## Troubleshooting

- **Connection Error**: 
  - Is `scripts/dev/start_lite_backend.sh` running?
  - Is the IP correct?
  - Is the firewall allowing port 8140?
- **Page Not Found (404)**:
  - Check if the URL path `/index.html` matches your file structure in `apps/web-new`.
