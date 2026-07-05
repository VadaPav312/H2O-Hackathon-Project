# H2O to You — Capacitor + Xcode + Vercel

This app was migrated off the Expo native runtime. It now ships as **one
`react-native-web` bundle** that runs two ways:

- **iOS** — wrapped by **Capacitor** into a native Xcode project (`ios/App`).
- **Web / PWA** — served by **Vercel**, together with the `/api/*` serverless
  functions.

The React Native source (`App.tsx`) is **reused as-is** — `react-native-web`
renders the RN primitives to the DOM, so nothing was rewritten.

```
App.tsx (RN + react-native-web)
      │  npx expo export --platform web
      ▼
   dist/  ──────────────┬───────────────► Vercel (static site + /api functions)
                        │
                        │  npx cap sync ios   (copies dist → ios/App/App/public)
                        ▼
                 ios/App/App.xcworkspace ──► Xcode ──► iOS app
```

## What changed

- **Removed from the runtime:** the Expo native projects were moved to
  `ios.expo-backup/` and `android.expo-backup/` (restore instructions below).
- **Added deps:** `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`,
  and plugins `@capacitor/camera`, `@capacitor/geolocation`,
  `@capacitor/preferences`, `@capacitor/status-bar`, `@capacitor/splash-screen`.
- **New files:** `capacitor.config.ts`, `vercel.json`, `native.ts` (native
  bridge), `ios/App/**` (the Capacitor Xcode project).
- **Native modules on web/Capacitor:** the app is already web-aware
  (`FIREBASE_WEB_DISABLED`, web branches for the image picker and location), so
  the existing web fallbacks (file-input picker + `navigator.geolocation`) work
  inside the Capacitor WKWebView with the Info.plist permissions that were added
  (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
  `NSLocationWhenInUseUsageDescription`).

## Dev / build commands

```bash
# 1. Build the web bundle (writes dist/)
npm run web:export

# 2. Copy dist into the iOS project + update native deps
npm run sync            # = web:export + npx cap sync ios

# 3. Open in Xcode (pick a simulator or device, press ▶)
npm run cap:open        # opens ios/App/App.xcworkspace

# one-shot: build web, sync, open Xcode
npm run ios
```

Command-line build (no signing, simulator) — used to verify the migration:

```bash
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -sdk iphonesimulator -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build      # → ** BUILD SUCCEEDED **
```

To run on a real device, open the workspace in Xcode, set your Signing Team on
the **App** target, then Run.

## Deploy to Vercel

`vercel.json` defines the build (`expo export --platform web` → `dist/`), the
SPA rewrite (everything except `/api`, `/_expo`, `/assets` → `index.html`), the
five serverless functions, cron jobs, and cache headers.

```bash
vercel            # preview
vercel --prod     # production
```

Set env vars in the Vercel dashboard (see `.env.example`): `GROQ_API_KEY`,
`RESEND_API_KEY`, `EXPO_PUBLIC_*`, etc.

## Optional: use true native plugins

`native.ts` exposes `takePhotoNative()`, `currentPositionNative()`, and
`nativeStore`. They use the real iOS camera/GPS when `isNativePlatform()` is
true and return `null` on web so callers keep the existing fallback. To adopt,
call them first at the image-picker and find-nearest sites and fall back to the
current `expo-image-picker` / `expo-location` paths when they return `null`.

## Firebase / Google Sign-In on iOS

Cloud sync + Google Sign-In are disabled on the web build (`FIREBASE_WEB_DISABLED`).
Local email/password accounts and all AsyncStorage data work everywhere. To
restore cloud auth inside Capacitor, initialize the **Firebase JS SDK**
(`firebase/app` + `firebase/auth`) with a web config and gate it on
`Capacitor.isNativePlatform()`, or add `@capacitor-firebase/authentication`.

## Rollback to Expo native

```bash
rm -rf ios android
mv ios.expo-backup ios
mv android.expo-backup android
# reinstall Expo-native run scripts in package.json if desired
```

The RN source, web export, and Vercel setup are unaffected by rollback.
