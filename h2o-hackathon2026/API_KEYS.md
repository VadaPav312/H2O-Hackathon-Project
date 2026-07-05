# API Keys & Credentials — How to Get Every One

This project talks to a handful of external services. This guide walks through
**how to obtain each key or credential**, where to put it, and whether it is
public (safe to ship in the app) or secret (server-side only).

## TL;DR — the full list

| Variable | Service | Secret? | Required for |
|---|---|---|---|
| `EXPO_PUBLIC_GROQ_PROXY_URL` | your Vercel URL | public | AI chat + tips |
| `EXPO_PUBLIC_CDEC_PROXY_URL` | your Vercel URL | public | live reservoir data |
| `EXPO_PUBLIC_NEWSLETTER_BASE_URL` | your Vercel URL | public | newsletter sign-up |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Cloud | public | Google Sign-In |
| `GROQ_API_KEY` | Groq | **secret** | AI chat + tips |
| `RESEND_API_KEY` | Resend | **secret** | sending email |
| `RESEND_FROM_EMAIL` | Resend (your domain) | config | sending email |
| `RESEND_AUDIENCE_WEEKLY_ID` | Resend | config | weekly newsletter |
| `RESEND_AUDIENCE_MONTHLY_ID` | Resend | config | monthly newsletter |
| `CRON_SECRET` | you generate it | **secret** | protecting cron endpoint |
| Firebase config files | Firebase | config | cloud sync + auth (native) |

> Services with **no key needed:** California CDEC (public reservoir API — the
> `/api/cdec` function proxies it), and OpenStreetMap-derived state geometry
> (bundled offline in `stateGeo.ts`). The app runs **without any keys at all** —
> local accounts, all 50-state map data, logging, stats, and badges work fully
> offline. Keys only unlock the AI chat, live reservoir numbers, email, and
> cloud sign-in.

---

## Where keys go

- **`EXPO_PUBLIC_*`** — public, bundled into the client. Put them in `.env.local`
  (local) and in Vercel → Project → Settings → Environment Variables (deploy).
- **Everything else** — server-side secrets used only by the `/api/*` Vercel
  functions. Put them in `.env.local` for `vercel dev`, and in the Vercel
  dashboard for deployments. **Never commit them.**

Start by copying the template:

```bash
cp .env.example .env.local
```

`.env.local` is gitignored. Fill in the values below.

---

## 1. Groq API key — AI chat & smart tips

The in-app AI guide and rotating tips call Groq's fast LLM inference, proxied
through `/api/groq` so the key never ships in the client.

1. Go to **https://console.groq.com** and sign in (Google/GitHub works).
2. In the left sidebar open **API Keys** → **https://console.groq.com/keys**.
3. Click **Create API Key**, give it a name (e.g. `h2o-app`), and **copy it now**
   — Groq shows it only once.
4. Put it in `.env.local`:
   ```
   GROQ_API_KEY="gsk_..."
   ```
5. Groq has a generous free tier; no credit card needed to start. Pick the model
   in `api/groq.ts` if you want to change it.

---

## 2. Resend — transactional & newsletter email

Resend sends the newsletter (weekly/monthly water reports) and any transactional
mail. Three pieces: an API key, a verified sender domain, and two audience IDs.

### 2a. Resend API key
1. Sign up at **https://resend.com**.
2. Open **API Keys** → **https://resend.com/api-keys** → **Create API Key**.
3. Give it **Full access** (it needs to send + manage audiences), copy it:
   ```
   RESEND_API_KEY="re_..."
   ```

### 2b. Verified sender domain → `RESEND_FROM_EMAIL`
1. Open **Domains** → **https://resend.com/domains** → **Add Domain**.
2. Enter a domain you own (e.g. `yourdomain.com`).
3. Resend gives you **DNS records** (SPF, DKIM, and optionally DMARC). Add them
   at your DNS provider (Cloudflare, Namecheap, etc.) and click **Verify**.
4. Once verified, set a from-address on that domain:
   ```
   RESEND_FROM_EMAIL="newsletter@yourdomain.com"
   ```
   > For quick testing without a domain, Resend lets you send from
   > `onboarding@resend.dev` to your own verified email.

### 2c. Audience IDs → `RESEND_AUDIENCE_WEEKLY_ID` / `RESEND_AUDIENCE_MONTHLY_ID`
1. Open **Audiences** → **https://resend.com/audiences**.
2. Create **two** audiences, e.g. `Weekly Water Report` and `Monthly Water Report`.
3. Click each one; the **Audience ID** (a UUID) is in the URL / header.
4. Paste them in:
   ```
   RESEND_AUDIENCE_WEEKLY_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   RESEND_AUDIENCE_MONTHLY_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```

---

## 3. `CRON_SECRET` — protect the newsletter cron

`vercel.json` schedules two cron jobs that hit `/api/newsletter/send`. To stop
strangers from triggering blasts, the endpoint checks a shared secret. **You
generate this yourself** — any long random string:

```bash
# generate one
openssl rand -hex 32
```

```
CRON_SECRET="paste-the-random-string-here"
```

Set the **same** value in Vercel's env vars. Vercel automatically sends it as an
`Authorization: Bearer <CRON_SECRET>` header on cron invocations.

---

## 4. Google Sign-In — `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` + Firebase

Google Sign-In flows through Firebase Authentication. You need a Firebase
project and a Google OAuth **Web client ID**.

> **Optional.** Google Sign-In and cloud sync are **disabled on the web build**
> (`FIREBASE_WEB_DISABLED`), and the app works fully with local email/password
> accounts. Only set this up if you want cross-device cloud sync on the native
> iOS app.

### 4a. Create a Firebase project
1. Go to **https://console.firebase.google.com** → **Add project**.
2. Name it (e.g. `h2o-to-you`), finish the wizard.
3. In **Build → Authentication → Sign-in method**, enable **Google** and
   (optionally) **Email/Password**.
4. In **Build → Firestore Database**, create a database (production or test
   mode) — this backs cloud sync (`firestore-sync.ts`).

### 4b. Register the iOS app → `GoogleService-Info.plist`
1. Firebase Console → **Project Settings** (gear) → **Your apps** → **Add app** →
   **iOS**.
2. Bundle ID: **`com.flowstate.h2otoyou`** (matches `capacitor.config.ts` /
   `app.json`).
3. Download **`GoogleService-Info.plist`** and place it in the project root
   (already referenced there). For the Capacitor iOS app, also drag it into the
   Xcode project (`ios/App/App`) so it's bundled.

### 4c. (Android, optional) → `google-services.json`
Same flow, choose **Android**, package `com.flowstate.h2otoyou`, download
`google-services.json` to the project root.

### 4d. Web OAuth client ID → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
1. Firebase auto-creates OAuth clients in the linked **Google Cloud** project.
   Go to **https://console.cloud.google.com/apis/credentials** (select the same
   project).
2. Under **OAuth 2.0 Client IDs**, find the **Web client** (auto-created by
   Firebase). Copy its **Client ID** (ends in `.apps.googleusercontent.com`).
3. Set it:
   ```
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="6514...apps.googleusercontent.com"
   ```
4. This is the **web** client ID even for native Google Sign-In — the native SDK
   exchanges it for a Firebase credential.

---

## 5. The three `EXPO_PUBLIC_*_URL` proxies

These just point the client at **your** Vercel deployment so the app knows where
its serverless functions live. After you deploy (below), set:

```
EXPO_PUBLIC_GROQ_PROXY_URL="https://<your-app>.vercel.app/api/groq"
EXPO_PUBLIC_CDEC_PROXY_URL="https://<your-app>.vercel.app/api/cdec"
EXPO_PUBLIC_NEWSLETTER_BASE_URL="https://<your-app>.vercel.app/api/newsletter"
```

For local development with `vercel dev`, point them at `http://localhost:3000/...`.

---

## 6. Vercel — hosting the web app + API

1. Install the CLI: `npm i -g vercel`, then `vercel login`.
2. From the project root: `vercel` (preview) or `vercel --prod` (production).
   `vercel.json` already defines the build (`expo export --platform web` →
   `dist/`), the API functions, the cron jobs, and cache headers.
3. In **Vercel → Project → Settings → Environment Variables**, add every secret
   from sections 1–4 (`GROQ_API_KEY`, `RESEND_*`, `CRON_SECRET`) **and** the
   `EXPO_PUBLIC_*` values. Redeploy so they take effect.

---

## 7. Expo / EAS project ID (already set)

`app.json` contains `extra.eas.projectId`. It's only needed if you use EAS Build
(cloud native builds). Since the app now builds through **Capacitor + Xcode**
(see `MIGRATION.md`), you don't need EAS unless you want it. To create your own:
`npm i -g eas-cli`, `eas login`, `eas init` — it rewrites the project ID.

---

## Security checklist

- ✅ `.env.local` is gitignored — never commit it.
- ✅ Only `EXPO_PUBLIC_*` values are safe in the client bundle. Everything else
  lives in Vercel env vars and is used only by `/api/*`.
- ✅ Rotate any key that leaks (Groq/Resend both allow instant revoke + recreate).
- ✅ `CRON_SECRET` should be long and random; treat it like a password.

If you set up **nothing**, the app still runs — you just won't have AI chat, live
reservoir numbers, email, or Google cloud sync. Everything else (the 50-state
atlas, maps, logging, stats, learning content, badges) works offline.
