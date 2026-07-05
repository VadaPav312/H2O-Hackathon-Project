# H2O to You — Project Overview

*A complete, detailed explanation of what this project is, how it is built, how
every part fits together, and how to work on it.*

---

## 1. What this app is

**H2O to You** (package name `h2otoyou`, bundle id `com.flowstate.h2otoyou`) is a
water-awareness and conservation application for the United States. It began as a
hackathon project focused entirely on California water, and has since been
generalized into a **50-state "Water Atlas"** that lets anyone in any US state
explore their local reservoirs, rivers, water agencies, precipitation, per-capita
usage, and the specific water challenges their state faces — while also tracking
their own personal water footprint, learning about water systems, and chatting
with an AI water guide.

The product has two intertwined goals. The first is **civic education**: making
the invisible visible. Most people have no idea where their water comes from,
how full the reservoirs that supply them are, or how their state compares to
others. The app renders an accurate, interactive map of the whole country,
projects real reservoirs onto it, and surfaces per-state facts and challenges.
The second goal is **behavior change**: a personal logger, statistics, badges,
streaks, and reminders nudge the user toward using less water, and a set of
"vision" tools use the phone camera to analyze test strips, spot pollution, and
estimate the water footprint of everyday items.

Crucially, the app is **local-first and works fully offline**. All 50 states of
map geometry and water data are bundled into the binary. Accounts are stored on
the device. None of the core experience requires a network connection or any API
key. External services (an LLM for chat, a live reservoir feed, transactional
email, and optional cloud sign-in) are enhancements layered on top, each degrade
gracefully when unavailable.

---

## 2. The recent overhaul

This codebase was recently put through four large changes, which shape much of
its current structure:

1. **The HEALTH feature was removed completely.** The app used to open on a
   "mode picker" that let users choose between a *Health* experience (a hydration
   tracker with a virtual plant that grew as you drank water) and a
   *Conservation* experience (the water-footprint tools). The Health mode — the
   plant model, hydration decay, drink presets, thirsty-plant notifications, the
   whole `HealthTab` navigator, and the mode-select splash — was deleted (about
   1,163 lines). The app now boots straight into the water experience; there is a
   single mode.

2. **California was generalized to all 50 states.** A persisted "selected state"
   was added to the global app context. A brand-new map experience replaced the
   California-only map: an accurate national map you can tap, a per-state detail
   map, a searchable 50-state picker, and rich per-state data cards. A new data
   module (`stateData.ts`) holds real water data for all 50 states.

3. **An accurate map system was built.** The old map was a hand-drawn polygon of
   California. The new one uses **real geographic geometry** (US state polygons)
   projected with an **Albers conic projection** — the same family of projection
   used by professional US maps — with Alaska and Hawaii inset. It is stored in
   `stateGeo.ts` and looks like a genuine map.

4. **The platform was migrated from Expo native to Capacitor + Xcode + Vercel.**
   The same React Native source now compiles to a web bundle via
   `react-native-web`; Capacitor wraps that bundle into a native iOS Xcode
   project, and Vercel serves the same bundle as a PWA alongside the serverless
   API. This is documented in `MIGRATION.md`.

---

## 3. High-level architecture

```
                       App.tsx  (React Native UI, one file)
                            │
              ┌─────────────┴──────────────┐
              │ react-native-web (bundler)  │
              ▼                              ▼
   Native iOS (Capacitor)            Web bundle  →  Vercel
   ios/App/App.xcworkspace           dist/            ├─ static PWA
   opened & built in Xcode           (index.html      └─ /api/* functions
                                      + JS + assets)      (Groq, CDEC, Resend)
```

There are three runtime targets, all from one source:

- **Native iOS** — Capacitor loads `dist/` inside a `WKWebView` shell and exposes
  native capabilities (camera, GPS, preferences) through plugins. You open
  `ios/App/App.xcworkspace` in Xcode and build/run like any iOS app.
- **Web / PWA** — Vercel serves `dist/` as a single-page app, with a rewrite that
  sends every non-asset, non-API route to `index.html`.
- **Serverless API** — the `api/` folder holds Vercel functions the client calls
  through public proxy URLs, so secrets stay on the server.

---

## 4. Technology stack

- **UI framework:** React 19 + React Native 0.81, rendered through
  `react-native-web` + `react-dom` for the web/Capacitor target.
- **Navigation:** `@react-navigation/native` with a bottom-tab navigator
  (`@react-navigation/bottom-tabs`), backed by `react-native-screens` and
  `react-native-safe-area-context`.
- **Graphics:** `react-native-svg` powers the maps, the water-ring gauges, and
  the water-system diagrams. `react-native-chart-kit` renders the line/bar
  charts on the Stats screen. `@expo/vector-icons` (Ionicons) supplies icons.
- **State & storage:** a single React Context/Provider holds app state;
  `@react-native-async-storage/async-storage` persists everything locally
  (profile, logs, badges, theme, selected state, account).
- **Cloud (optional):** `@react-native-firebase/{app,auth,firestore}` and
  `@react-native-google-signin/google-signin` provide Google Sign-In and
  cross-device Firestore sync (disabled on web).
- **Native shell:** Capacitor 6 (`@capacitor/core`, `@capacitor/ios`) plus
  plugins `@capacitor/camera`, `@capacitor/geolocation`,
  `@capacitor/preferences`, `@capacitor/status-bar`, `@capacitor/splash-screen`.
- **Backend:** Vercel serverless functions (TypeScript) using `resend` for email
  and `fetch` proxies for Groq and California's CDEC reservoir feed.
- **Language/tooling:** TypeScript in `strict` mode, Expo SDK 54 (Metro bundler,
  Hermes engine), `tsx` for scripts.

---

## 5. The single-file philosophy

Nearly the entire client — every screen, component, style, constant, and helper —
lives in one very large file, `App.tsx` (~20,000 lines). This is unusual, but it
was a deliberate hackathon choice: no import graph to maintain, trivial
refactors across the whole app, and everything greppable in one place. The recent
work introduced a few **sibling modules** to keep the largest data out of the
monolith:

- `stateGeo.ts` — generated map geometry + the runtime projection function.
- `stateData.ts` — the 50-state water dataset.
- `native.ts` — the Capacitor native bridge.
- `firebase-auth.ts`, `firestore-sync.ts` — the cloud wrappers.
- `i18n/` — translations and the `t()` translation runtime.
- `docs/embedded.ts` — the privacy/terms docs baked in for offline display.

Inside `App.tsx`, the rough top-to-bottom order is: imports → design tokens and
themes → API config and helpers → small UI primitives → content/gamification
data → water-system and map data → app context/provider → shared cards and
modals → the main screens → the map screen → the camera screens → the root
navigator → the error boundary → the module-level stylesheets.

---

## 6. Feature deep dive

### 6.1 Water Atlas (the map)

The centerpiece. The **Map tab** opens on a state selector card, then an accurate
**national map** where every state is drawn from real geometry; tapping a
data-backed state selects it. Below that, a **per-state detail map** zooms into
the selected state's outline and overlays its reservoirs as colored dots (green
≥70 % full, gold 45–70 %, red <45 %). Then a stack of data cards presents:

- key stat tiles (average annual precipitation, per-capita gallons/day, reservoir
  count, population);
- the state's primary **water authority** with a link, a one-line climate summary,
  and a drought/flood note;
- a **water-use breakdown** (agriculture, public supply, thermoelectric,
  industrial) as horizontal bars;
- **major rivers** as chips;
- a **reservoir list** with capacity and typical fill percentage;
- **"Did you know"** facts and **water challenges**, both state-specific and real.

A searchable **50-state picker** modal lets you switch states; the choice is
persisted, so your home state sticks between launches.

### 6.2 The geometry pipeline

The map's accuracy is the product of a small pipeline (the generator lives in the
scratch tooling; its output is committed as `stateGeo.ts`):

1. Start from real US state polygons in longitude/latitude (GeoJSON).
2. Project them with an **Albers equal-area conic** projection tuned to the
   contiguous US (standard parallels 29.5°/45.5°, central meridian −96°). This is
   what gives the map its correct, slightly curved top edge.
3. Project **Alaska** and **Hawaii** with their own conics, then scale and
   translate them into the lower-left as insets — exactly how the familiar
   "AlbersUSA" composite map works.
4. Emit each state as an SVG `path` in a shared `960×600` viewBox, plus a bounding
   box and centroid, into `US_STATE_GEO`.
5. Emit a runtime `projectLonLat(abbr, lon, lat)` function that reproduces the
   same math so **reservoir coordinates can be projected live** and land exactly
   on the outlines — including inside the Alaska/Hawaii insets.

The national map simply renders all the paths; the detail map sets the SVG
viewBox to a state's bounding box (padded) to "zoom in," and markers are placed
by feeding each reservoir's lat/lon through `projectLonLat`. This was verified
by rendering the map and confirming all 262 reservoirs land inside their states.

### 6.3 The state data model

`stateData.ts` defines `Reservoir` and `StateWater` types and a
`STATE_WATER: Record<string, StateWater>` keyed by two-letter abbreviation, plus
a `STATE_LIST` in alphabetical order. Each state carries its capital, nickname,
population, primary agency (with URL), climate and drought notes, average annual
precipitation, per-capita usage, major rivers, 4–8 real reservoirs (each with
name, lat/lon, capacity in acre-feet, typical fill %, impounded river, and a note),
several facts, several challenges, and a water-use breakdown. California is the
richest entry (eight reservoirs, agriculture-heavy usage). The data is real and
correctly ordered — Lake Mead ~28M acre-feet, Lake Powell ~24M, Shasta ~4.5M —
and the drought geography is accurate (Colorado-basin reservoirs read low/red).

### 6.4 Logger

The **Log** tab is the personal water-footprint tracker. Users add activities
(shower, laundry, drinking water, custom entries) each with a gallon cost; the
log is stored per day under `log_<YYYY-MM-DD>` in AsyncStorage. Logging awards XP,
maintains a daily streak, updates lifetime-saved counters, and unlocks badges.

### 6.5 Stats

The **Stats** tab visualizes the user's usage over time with charts
(`react-native-chart-kit`), compares against goals and averages, and summarizes
totals, streaks, and levels.

### 6.6 Learn

The **Learn** tab is an educational library: water history, laws, conservation
technology, and how water systems work, with translated content tables.

### 6.7 Chat (AI guide)

The **Chat** tab is a conversational water assistant. The client posts to
`/api/groq`, a Vercel function that proxies **Groq's** fast LLM inference (so the
API key stays server-side). The same proxy powers the rotating in-app tips. If no
Groq key is configured, chat simply isn't available; nothing else breaks.

### 6.8 Camera / vision tools

The **Camera** tab bundles four computer-vision utilities that use the phone
camera (via `expo-image-picker`, with a web file-input fallback that also works
inside the Capacitor WKWebView): a **test-strip reader**, a **pollution
identifier**, a **footprint estimator** for items, and a **landscape audit** that
estimates the water needs of plants/features in a yard photo.

### 6.9 Notifications, badges, streaks

A local notification generator produces tips, morning reminders, over-goal
warnings, and evening streak-savers, throttled to a few per day. A badge system
(`BADGES`) unlocks achievements (e.g. exploring the map, logging streaks) with an
animated unlock toast. These are entirely local — no push server.

### 6.10 Settings & theming

Settings covers profile, language, appearance (theme), notification toggles,
account/auth, and legal docs. The app ships **8 themes** (ocean is default, plus
aurora, forest, sunset, crimson, mint, lavender, monochrome). Theme switching is
handled by a clever runtime-mutable palette (`C`) that is reassigned in place;
`rebuildAllStyles()` rebuilds every module-level stylesheet, and a `themeVersion`
bump remounts the navigation tree so the new palette takes effect everywhere.

### 6.11 Internationalization

The `i18n/` module carries **51 languages**. Screens call `const t =
useT(profile.lang)` and reference string keys like `t("tab.map")`; a
`translate()` function handles interpolation and fallback. There is a large base
English key catalog (`STRINGS`) and parallel translation tables for content like
badges, tips, challenges, and history.

---

## 7. State management & persistence

The app uses a **single React Context** (`AppContext` / `AppProvider`) as its
source of truth. It holds the user profile, notifications, badges, the local
account, the (optional) Firebase user, aggregate stats, today's log, the theme
id, and the **selected US state**. Consumers call the `useApp()` hook.

Persistence is **local-first via AsyncStorage**: `profile`, `badges`, `xp`,
streaks, per-day logs (`log_<date>`), the theme (`theme_id_v1`), the selected
state (`state_abbr_v1`), the local account (`account_v1`), and various flags. On
top of that, **Firestore sync** (`firestore-sync.ts`) pulls and pushes stats and
day-logs when the user is signed in with Google — otherwise everything stays on
device. Sync is debounced and best-effort; the app never blocks on the network.

---

## 8. The design system

Colors are defined as a `Palette` type with ~30 semantic keys (bg, surface,
card, border, accent, success, danger, gold, etc.). The live palette object `C`
is mutated in place when the theme changes. Styling is a mix of module-level
`StyleSheet.create` factories (rebuilt on theme change) and inline styles.

The recent work added an **iOS "liquid glass" layer**: a `GlassCard` component
and upgraded shared `glassCard`/`heroCard` styles that use translucent fills,
hairline top highlights, and soft depth shadows — and, on the web/Capacitor
target, **real CSS `backdrop-filter` blur** (which the native RN target can't do
without a blur module). Because the shared card styles cascade across every
screen, the glass feel appears app-wide, and the new Map screen showcases it.

---

## 9. Backend / serverless API

The `api/` folder holds Vercel functions:

- **`api/groq.ts`** — proxies Groq LLM requests for chat and tips; never cached.
- **`api/cdec.ts`** — proxies California's public **CDEC** reservoir-storage feed
  (12 major reservoirs), with an in-memory hourly cache and edge caching, used by
  the live "reservoir conditions" report. It needs no key (CDEC is public).
- **`api/newsletter/{subscribe,unsubscribe,send}.ts`** — a **Resend**-backed
  newsletter: subscribe/unsubscribe manage audiences, and `send` (guarded by
  `CRON_SECRET`) blasts the weekly/monthly water report, triggered by the cron
  jobs in `vercel.json`.

The client reaches these through the `EXPO_PUBLIC_*_URL` proxy variables, so no
secret is ever bundled into the app. See `API_KEYS.md` for how to obtain each
credential.

---

## 10. Platform: Expo → Capacitor + Xcode + Vercel

Originally the app used Expo's native runtime (prebuilt `ios/` and `android/`
projects, EAS builds). It now ships as a **`react-native-web` bundle** wrapped by
Capacitor for iOS and served by Vercel for web. Key points (full detail in
`MIGRATION.md`):

- `npx expo export --platform web` produces `dist/` (the web bundle) — the RN
  source is **reused unchanged**; `react-native-web` renders it to the DOM.
- `capacitor.config.ts` points Capacitor at `webDir: "dist"`. `npx cap add ios`
  generated `ios/App/App.xcworkspace` and ran `pod install`; `npx cap sync ios`
  copies the latest `dist/` into the native shell.
- The migration was **verified end-to-end**: the web export succeeds, and
  `xcodebuild` on the workspace returns **`** BUILD SUCCEEDED **`**, producing an
  `App.app`.
- The app was already web-aware (`FIREBASE_WEB_DISABLED`, web branches for image
  picking and geolocation), so native modules degrade gracefully; the added
  `Info.plist` usage strings let the WKWebView fallbacks work. `native.ts`
  provides optional true-native camera/GPS/preferences behind
  `Capacitor.isNativePlatform()` checks.
- The old Expo native projects are preserved as `ios.expo-backup/` and
  `android.expo-backup/` for a one-command rollback.

---

## 11. Build & deploy workflows

From `package.json`:

- `npm run web` — Expo web dev server.
- `npm run web:export` — build the web bundle to `dist/`.
- `npm run sync` — export web + `cap sync ios`.
- `npm run ios` — export, sync, and open Xcode (`App.xcworkspace`).
- `npm run cap:run` — export, sync, and run on a device/simulator via Capacitor.

Deploy the web app + API with `vercel` / `vercel --prod`. Build the iOS app in
Xcode (set your Signing Team on the **App** target for a real device).

---

## 12. Repository map

```
App.tsx                 the entire client UI (screens, components, styles)
index.ts                entry point
stateGeo.ts             generated 50-state SVG geometry + projectLonLat()
stateData.ts            50-state water dataset (reservoirs, agencies, facts…)
native.ts               Capacitor native bridge (camera/GPS/preferences)
firebase-auth.ts        Google Sign-In + Firebase auth wrapper
firestore-sync.ts       cloud pull/push of stats and logs
capacitor.config.ts     Capacitor config (webDir: dist, plugins, iOS options)
vercel.json             Vercel build, functions, crons, rewrites, headers
app.json                Expo config (icons, permissions, plugins)
api/                    Vercel serverless functions (groq, cdec, newsletter)
i18n/                   51-language translations + translate() runtime
docs/                   privacy/terms (embedded.ts) + setup docs
data/                   bundled snapshots (cdec.json, us-states.geojson)
scripts/                embed-docs, fetch-cdec build helpers
ios/                    Capacitor Xcode project (generated)
ios.expo-backup/        old Expo native iOS project (rollback)
MIGRATION.md            how the Capacitor/Vercel migration works
API_KEYS.md             how to obtain every API key/credential
```

---

## 13. Extending the app

**Add or refine a state:** edit `STATE_WATER[XX]` in `stateData.ts` — add
reservoirs (with accurate lat/lon so they project correctly), facts, challenges,
etc. The map, picker, and all data cards pick it up automatically; no geometry
work is needed because all 50 outlines already exist in `stateGeo.ts`.

**Add a theme:** add an entry to `THEMES` with a full `Palette`; the theme picker
enumerates `THEMES` automatically.

**Add a screen/tab:** write a `function XyzScreen()` in `App.tsx` and register a
`<Tab.Screen>` in `NavRoot`. Reuse `GlassCard`, `ScreenHeader`, `Press`, and the
`st`/`s` stylesheets for a consistent look.

**Add a language:** extend the `i18n/` tables; screens automatically translate via
`t()`.

**Use true native camera/GPS:** call `takePhotoNative()` /
`currentPositionNative()` from `native.ts` first, and fall back to the existing
`expo-image-picker` / `expo-location` paths when they return `null` on web.

---

## 14. Known limitations & roadmap

- **Google Sign-In / cloud sync** are disabled on the web build; local accounts
  work everywhere. Restoring cloud auth inside Capacitor means initializing the
  Firebase JS SDK (or adding `@capacitor-firebase/authentication`).
- Some conservation screens (Home, Stats, Learn) still carry
  California-flavored content and averages; the **map/atlas** is fully 50-state.
  Generalizing per-state daily averages and history is the natural next step.
- The legacy California map screen is retained in the source
  (`LegacyCaliforniaMapScreen`) but not shown; its rich CA-specific layers
  (aqueduct flow animation, drought regions, analog forecast) could be offered as
  a "deep dive" when California is the selected state.
- Live reservoir numbers via `/api/cdec` currently cover California only; the
  bundled `stateData.ts` figures are typical/average values for the other states.

---

## 15. Design principles

A few principles guide the codebase and explain why it is shaped the way it is:

- **Local-first, network-optional.** Every core interaction — browsing the atlas,
  logging water, viewing stats, earning badges, reading the learn content —
  completes without a server. The network only adds live reservoir numbers, AI
  chat, email, and cloud sync. This makes the app fast, resilient on flaky
  connections, private by default, and usable with zero configuration.

- **Graceful degradation over hard failure.** Missing keys, offline states, and
  unsupported platforms never crash the app. Firebase is short-circuited on web;
  the AI chat quietly disappears without a Groq key; native camera/GPS fall back
  to web equivalents. A top-level `ErrorBoundary` guarantees the app never white-
  screens — professional apps recover, they don't die.

- **One source, many targets.** The same React Native code drives native iOS and
  the web PWA. Nothing is forked per platform; `Platform.OS` branches and
  capability checks handle the differences inline. This keeps the surface area
  small despite covering two very different runtimes.

- **Real data, honestly presented.** The map geometry is a real projection of
  real polygons, and the reservoir figures are real and correctly scaled. Where
  numbers are typical/average rather than live, that is stated rather than
  disguised as real-time truth.

- **Accessible, themeable visuals.** Eight color themes, large tap targets,
  high-contrast text on translucent surfaces, and consistent iconography make the
  app comfortable across lighting conditions and preferences.

## 16. Data sources & accuracy

- **State outlines** come from real US state boundary polygons (longitude/
  latitude), projected once at build time into `stateGeo.ts`. Because the
  projection is baked in, there is no runtime dependency on any mapping service,
  and the map renders identically offline.

- **Reservoir coordinates and capacities** in `stateData.ts` reference real,
  well-known reservoirs and lakes; coordinates are accurate enough to project
  correctly onto the state outlines, and capacities are realistic and correctly
  ordered across states.

- **Live California reservoir storage** is pulled from the state's public **CDEC**
  feed through `/api/cdec`, cached hourly, and shown in the reservoir-conditions
  report. Other states currently display typical values from the bundled dataset.

- **Facts and challenges** are state-specific and grounded in real water issues —
  Colorado-basin allocation cuts in the Southwest, aquifer and saltwater-intrusion
  concerns in Florida, the shrinking Great Salt Lake in Utah, and so on.

Because everything is bundled, the app is a dependable reference even with no
signal — and a richer, live one when connected.

---

*This document, `MIGRATION.md`, and `API_KEYS.md` together describe the whole
system: what it does, how it's built, how to get it running, and how to extend
it. Start with `API_KEYS.md` if you just want to configure and deploy, or with
`MIGRATION.md` if you're building the iOS app.*
