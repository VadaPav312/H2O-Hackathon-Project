import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wraps the react-native-web build (produced by
// `npx expo export --platform web` → `dist/`) into a native iOS shell that
// you open and build in Xcode. The same `dist/` is what Vercel serves as the
// PWA, so web + iOS ship from one bundle.
const config: CapacitorConfig = {
  appId: "com.flowstate.h2otoyou",
  appName: "H2O to You",
  webDir: "dist",
  backgroundColor: "#0a1018",
  ios: {
    contentInset: "always",
    backgroundColor: "#0a1018",
    // WKWebView needs these for the existing web fallbacks (file-input image
    // picker + navigator.geolocation) to work inside the native shell.
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 700,
      backgroundColor: "#0a1018",
      showSpinner: false,
    },
    Geolocation: {},
    Camera: {},
  },
};

export default config;
