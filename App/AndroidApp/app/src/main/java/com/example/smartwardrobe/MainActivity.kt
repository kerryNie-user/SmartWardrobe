package com.example.smartwardrobe

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.widget.TextView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AlertDialog
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.smartwardrobe.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var webView: WebView
    private val LOCATION_PERMISSION_REQUEST_CODE = 1001
    // TODO: Change this IP to your computer's IP address.
    // Use "10.0.2.2" for Android Emulator to access host localhost.
    // Use actual IP (e.g., "192.168.x.x") for real devices.
    // Serving directory: App/WebApp
    private val serverUrl = "http://10.23.126.78:8080/index.html"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        webView = binding.webview
        
        // Configure WebView settings
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true // Often needed for modern web apps
        settings.allowFileAccess = true
        // Although we load from HTTP, these might still be useful for some legacy logic if any
        settings.setGeolocationEnabled(true)
        
        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false)
                } else {
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                        LOCATION_PERMISSION_REQUEST_CODE
                    )
                    callback.invoke(origin, false, false)
                }
            }
        }
        
        checkLocationPermission()
        
        // Ensure links open within the WebView
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false // Let WebView handle HTTP and HTTPS
                }

                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                } catch (e: ActivityNotFoundException) {
                    // App not installed, ignore or show message
                    // e.printStackTrace() 
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                return true // Prevent WebView from loading custom schemes
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                // Only handle main frame errors
                if (request?.isForMainFrame == true) {
                    showErrorDialog(error?.description.toString())
                }
            }
        }

        // Load the server URL
        webView.loadUrl(serverUrl)
        
        // Handle back navigation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun checkLocationPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION), LOCATION_PERMISSION_REQUEST_CODE)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted, reload WebView to ensure location services work
                webView.reload()
            }
        }
    }

    private fun showErrorDialog(message: String) {
        AlertDialog.Builder(this)
            .setTitle("Connection Error")
            .setMessage("Failed to load content from server.\n\nError: $message\n\nPlease ensure:\n1. The server is running on your computer (python3 server.py).\n2. Your device is on the same network.\n3. The IP address in MainActivity.kt is correct.")
            .setPositiveButton("Retry") { _, _ ->
                webView.reload()
            }
            .setNegativeButton("Close") { _, _ ->
                finish()
            }
            .setCancelable(false)
            .show()
    }
}