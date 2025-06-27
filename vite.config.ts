
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isKioskBuild = process.env.BUILD_TARGET === 'kiosk' || mode === 'kiosk';
  
  return {
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
        // Only externalize Capacitor modules for kiosk builds
        external: isKioskBuild ? [
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
        ] : []
      }
    },
    // Use relative base for file:// protocol compatibility in kiosk mode
    base: isKioskBuild ? './' : '/',
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: isKioskBuild ? [] : ['@capacitor-community/bluetooth-le']
    }
  };
});
