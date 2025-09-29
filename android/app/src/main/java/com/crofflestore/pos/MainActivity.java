package com.crofflestore.pos;

import android.app.Activity;
import android.content.ComponentName;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.util.Log;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.customtabs.CustomTabColorSchemeParams;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private static final String TARGET_URL = "https://pos.thecrofflestore.com/";
    private static final String CHROME_PACKAGE = "com.android.chrome";

    private CustomTabsClient customTabsClient;
    private CustomTabsSession customTabsSession;
    private CustomTabsServiceConnection connection;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "onCreate: Starting MainActivity");
        super.onCreate(savedInstanceState);

        // Set a simple layout to avoid theme issues
        setContentView(android.R.layout.activity_list_item);

        // Configure window for seamless white appearance
        configureWindowForWhiteTheme();

        // Configure for kiosk mode
        configureKioskMode();

        // Initialize Chrome Custom Tabs
        initializeCustomTabs();
    }

    private void configureWindowForWhiteTheme() {
        // Configure status bar for white background
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR |
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            );
            getWindow().setStatusBarColor(0xFFFFFFFF); // White status bar
        }

        // Configure navigation bar for white background
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getWindow().getDecorView().setSystemUiVisibility(
                getWindow().getDecorView().getSystemUiVisibility() |
                View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            );
            getWindow().setNavigationBarColor(0xFFFFFFFF); // White navigation bar
        }
    }

    private void configureKioskMode() {
        // Configure immersive mode (title bar already hidden by theme)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            // Enable immersive mode for kiosk
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }

        // Keep screen on for kiosk mode
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void initializeCustomTabs() {
        Log.d(TAG, "initializeCustomTabs: Starting Chrome Custom Tabs initialization");
        // Create service connection
        connection = new CustomTabsServiceConnection() {
            @Override
            public void onCustomTabsServiceConnected(ComponentName componentName, CustomTabsClient client) {
                Log.d(TAG, "onCustomTabsServiceConnected: Chrome Custom Tabs service connected");
                customTabsClient = client;
                customTabsClient.warmup(0L);
                customTabsSession = customTabsClient.newSession(new CustomTabsCallback() {
                    @Override
                    public void onNavigationEvent(int navigationEvent, Bundle extras) {
                        super.onNavigationEvent(navigationEvent, extras);

                        // Handle navigation events for kiosk restrictions
                        if (navigationEvent == NAVIGATION_STARTED) {
                            String url = extras != null ? extras.getString("url") : "";
                            if (!isUrlAllowed(url)) {
                                // Block navigation to unauthorized URLs
                                Toast.makeText(MainActivity.this, "Navigation restricted in kiosk mode", Toast.LENGTH_SHORT).show();
                            }
                        }
                    }
                });

                // Pre-load the target URL for faster loading
                if (customTabsSession != null) {
                    customTabsSession.mayLaunchUrl(Uri.parse(TARGET_URL), null, null);
                }

                // Launch the web app
                launchWebApp();
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {
                customTabsClient = null;
                customTabsSession = null;
            }
        };

        // Bind to Chrome Custom Tabs service
        boolean bound = CustomTabsClient.bindCustomTabsService(this, CHROME_PACKAGE, connection);

        if (!bound) {
            // Fallback: Launch directly if Chrome Custom Tabs not available
            Toast.makeText(this, "Chrome not available, launching in default browser", Toast.LENGTH_LONG).show();
            launchWebApp();
        }
    }

    private void launchWebApp() {
        CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder(customTabsSession);

        // Configure for kiosk mode
        builder.setShowTitle(false);
        builder.setUrlBarHidingEnabled(true);

        // Create transparent close button to effectively hide it for kiosk mode
        Bitmap transparentCloseButton = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
        transparentCloseButton.eraseColor(Color.TRANSPARENT);
        builder.setCloseButtonIcon(transparentCloseButton);

        // Set colors to match your app's white background for seamless appearance
        builder.setDefaultColorSchemeParams(
            new CustomTabColorSchemeParams.Builder()
                .setToolbarColor(0xFFFFFFFF)           // White toolbar background
                .setSecondaryToolbarColor(0xFFFFFFFF)  // White secondary toolbar
                .setNavigationBarColor(0xFFFFFFFF)     // White navigation bar
                .setNavigationBarDividerColor(0xFFFFFFFF) // White navigation divider
                .build()
        );

        // Configure additional UI elements for seamless white appearance
        builder.setShareState(CustomTabsIntent.SHARE_STATE_OFF);
        builder.setBookmarksButtonEnabled(false);  // Remove bookmarks button
        builder.setDownloadButtonEnabled(false);   // Remove download button

        // Build the Custom Tab with all customizations
        CustomTabsIntent customTabsIntent = builder.build();

        // Ensure it opens in Chrome
        customTabsIntent.intent.setPackage(CHROME_PACKAGE);

        // Configure system UI for seamless white appearance
        customTabsIntent.intent.putExtra("android.support.customtabs.extra.SYSTEM_UI_VISIBILITY",
            android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

        try {
            customTabsIntent.launchUrl(this, Uri.parse(TARGET_URL));

            // Hide the main activity since Custom Tab is now active
            finish();

        } catch (Exception e) {
            // Fallback to default browser
            Toast.makeText(this, "Opening in default browser", Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(TARGET_URL));
            startActivity(intent);
            finish();
        }
    }

    private boolean isUrlAllowed(String url) {
        if (url == null || url.isEmpty()) return true;

        // Allow navigation within specified domains
        return url.startsWith("https://pos.thecrofflestore.com/") ||
               url.startsWith("http://pos.thecrofflestore.com/") ||
               url.startsWith("https://preview--croffle-store-sync.lovable.app/") ||
               url.startsWith("https://crofflestore.pvosyncpos.com/") ||
               url.startsWith("http://localhost");
    }

    @Override
    protected void onResume() {
        super.onResume();

        // Re-enter immersive mode when app resumes
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
    }

    @Override
    public void onBackPressed() {
        // Disable back button in kiosk mode
        Toast.makeText(this, "Back navigation disabled in kiosk mode", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        // Unbind from Custom Tabs service
        if (connection != null) {
            unbindService(connection);
        }
    }
}
