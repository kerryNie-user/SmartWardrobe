package com.example.smartwardrobe

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById<WebView>(R.id.webview)
        
        // Configure WebView settings
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true // Often needed for modern web apps
        
        // Ensure links open within the WebView
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false // Let WebView handle HTTP/HTTPS
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
        }
        
        // Load the target URL
        webView.loadUrl("https://www.baidu.com")
        // // Load the local HTML file
        // webView.loadUrl("file:///android_asset/wardrobe/index.html")
        
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
}
