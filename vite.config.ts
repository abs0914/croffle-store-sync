
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Use relative paths for assets to work with file:// protocol
    assetsDir: 'assets',
    rollupOptions: {
      // For kiosk mode, externalize Capacitor modules since they'll be provided by the native app
      external: [
        '@capacitor/core',
        '@capacitor/android',
        '@capacitor/ios',
        '@capacitor/status-bar',
        '@capacitor/splash-screen',
        '@capacitor/keyboard',
        '@capacitor/app',
        '@capacitor/device',
        '@capacitor/network',
        '@capacitor/haptics',
        '@capacitor-community/bluetooth-le'
      ]
    }
  },
  // Use relative base for file:// protocol compatibility
  base: './',
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@capacitor-community/bluetooth-le']
  }
}));
