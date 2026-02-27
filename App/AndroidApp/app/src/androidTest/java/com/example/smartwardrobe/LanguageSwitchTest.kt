package com.example.smartwardrobe

import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.webdriver.DriverAtoms.findElement
import androidx.test.espresso.web.webdriver.DriverAtoms.webClick
import androidx.test.espresso.web.webdriver.DriverAtoms.getText
import androidx.test.espresso.web.model.Atoms.script
import androidx.test.espresso.web.webdriver.Locator
import androidx.test.espresso.web.assertion.WebViewAssertions.webMatches
import androidx.test.espresso.web.model.Atoms.castOrDie
import androidx.test.espresso.web.model.ElementReference
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.SdkSuppress
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.not
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
@SdkSuppress(maxSdkVersion = 35)
class LanguageSwitchTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun testLanguageSwitchFlows() {
        // 1. Initial Setup: Load Profile Page
        onWebView()
            .forceJavascriptEnabled()
            .perform(script("window.location.href = 'profile.html'"))
        
        // Allow page to load
        Thread.sleep(3000)

        // 2. Open Settings Modal
        onWebView()
            .perform(script("if(window.openSettingsModal) window.openSettingsModal(); else console.error('Fn not found');"))
        
        Thread.sleep(1000)

        // --- Flow 1: Switch to Chinese (Zh-CN) ---
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, "input[value='zh-CN']"))
            .perform(webClick())

        // Wait for debounce (300ms) and update
        Thread.sleep(1000)

        // Verify "Settings" title became "设置" (assuming i18n key header_settings)
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, ".modal-title[data-i18n='header_settings']"))
            .check(webMatches(getText(), containsString("设置")))

        // --- Flow 2: Switch to English (En) ---
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, "input[value='en']"))
            .perform(webClick())

        Thread.sleep(1000)

        // Verify "Settings" title became "Settings"
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, ".modal-title[data-i18n='header_settings']"))
            .check(webMatches(getText(), containsString("Settings")))

        // --- Flow 3: Re-click English (Idempotency) ---
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, "input[value='en']"))
            .perform(webClick())

        Thread.sleep(500)
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, ".modal-title[data-i18n='header_settings']"))
            .check(webMatches(getText(), containsString("Settings")))

        // --- Flow 4: Rapid Switch (Debounce Test) En -> Zh -> En ---
        // Click Zh
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, "input[value='zh-CN']"))
            .perform(webClick())
        
        // Click En immediately (within 300ms)
        // Note: webClick is blocking in Espresso, but JS execution is async.
        // However, Espresso waits for UI idle. 
        // Real debounce testing is hard with Espresso syncing, but we can verify final state.
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, "input[value='en']"))
            .perform(webClick())

        Thread.sleep(1000)

        // Should be English finally
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, ".modal-title[data-i18n='header_settings']"))
            .check(webMatches(getText(), containsString("Settings")))

        // Close Modal to check Profile Page Spans
        onWebView()
            .perform(script("closeSettingsModal()"))
        
        Thread.sleep(1000)

        // --- Flow 5: Check Profile Spans in English ---
        // Check #current-region exists
        onWebView()
            .withElement(findElement(Locator.ID, "current-region"))
            .check(webMatches(getText(), not(containsString("undefined"))))

        // --- Flow 6: Check Profile Spans in Chinese ---
        // Open modal again
        onWebView()
            .perform(script("openSettingsModal()"))
        Thread.sleep(500)
        
        // Switch to Zh
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, "input[value='zh-CN']"))
            .perform(webClick())
        Thread.sleep(1000)
        
        // Close modal
        onWebView()
            .perform(script("closeSettingsModal()"))
        Thread.sleep(1000)
        
        // Check #current-region again
        onWebView()
            .withElement(findElement(Locator.ID, "current-region"))
            .check(webMatches(getText(), not(containsString("undefined"))))
            
        // Ideally check for Chinese characters if we knew the region.
        // But verifying it's not empty/undefined is a good start.
    }
}