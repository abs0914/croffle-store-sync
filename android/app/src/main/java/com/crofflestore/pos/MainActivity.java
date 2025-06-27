package com.crofflestore.pos;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.os.Build;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.widget.Toast;

public class MainActivity extends BridgeActivity {

    private static final String TARGET_URL = "https://pos.thecrofflestore.com/";


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure for kiosk mode
        configureKioskMode();

        // Set up WebView with URL filtering
        setupWebViewClient();
    }

    private void configureKioskMode() {
        // Hide system UI for immersive experience
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

        // Keep screen on
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void setupWebViewClient() {
        // Get the WebView from Capacitor
        WebView webView = getBridge().getWebView();

        // Set custom WebViewClient for URL filtering
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Only allow navigation within allowed domains
                if (url.startsWith("https://pos.thecrofflestore.com/") ||
                    url.startsWith("http://pos.thecrofflestore.com/") ||
                    url.startsWith("https://preview--croffle-store-sync.lovable.app/") ||
                    url.startsWith("https://crofflestore.pvosyncpos.com/") ||
                    url.startsWith("http://localhost") ||
                    url.startsWith("capacitor://")) {
                    return false; // Allow the WebView to handle the URL
                }

                // Block all other URLs
                Toast.makeText(MainActivity.this, "Navigation restricted in kiosk mode", Toast.LENGTH_SHORT).show();
                return true; // Block the navigation
            }
        });

        // Load the target URL
        webView.loadUrl(TARGET_URL);
    }

    @Override
    public void onBackPressed() {
        // Disable back button in kiosk mode
        Toast.makeText(this, "Back navigation disabled in kiosk mode", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onResume() {
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
}
