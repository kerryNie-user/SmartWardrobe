package com.example.smartwardrobe

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AlertDialog

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    // TODO: Change this IP to your computer's IP address.
    // Use "10.0.2.2" for Android Emulator to access host localhost.
    // Use actual IP (e.g., "192.168.x.x") for real devices.
    // Serving directory: App/WebApp
    private val serverUrl = "http://192.168.3.37:8080/wardrobe/index.html"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById<WebView>(R.id.webview)
        
        // Configure WebView settings
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true // Often needed for modern web apps
        settings.allowFileAccess = true
        // Although we load from HTTP, these might still be useful for some legacy logic if any
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        
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
