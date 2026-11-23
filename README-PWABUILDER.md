# UniPilot — PWABuilder / Android TWA preparation

This folder contains the existing UniPilot application plus the PWA packaging files. The app UI, navigation, calculations, GPA logic, IndexedDB PDF storage, and existing local data model were not intentionally changed.

## Files

- `index.html` — existing UniPilot app, with manifest metadata, mobile safe-area viewport support, and service-worker registration added.
- `manifest.json` — installable web app metadata, standalone display, any orientation, dark theme/background, and icon declarations.
- `sw.js` — versioned, same-origin app-shell cache. Navigations are network-first; offline fallback is used only when the network fails. It does not cache API calls, cross-origin resources, POST requests, or user-specific data.
- `offline.html` — branded offline fallback.
- `icons/` — 192×192 and 512×512 standard and maskable PNG icons based on the existing UniPilot favicon artwork.

## Deploy to Render Static Site

1. Copy the contents of this folder into the root of the existing GitHub repository that Render deploys.
2. Keep the files at these exact root paths: `/index.html`, `/manifest.json`, `/sw.js`, `/offline.html`, and `/icons/...`.
3. Commit and push. Render should publish the files as static assets; no server runtime or build command is required for a plain static site.
4. In Render, confirm the publish directory is the directory containing `index.html` and that static files are not excluded by rewrite/redirect rules.
5. Do not add a catch-all rewrite that serves HTML for `/manifest.json`, `/sw.js`, or icon paths. If you already use redirects, preserve these file paths as direct static-file responses.
6. After deployment, open `https://unipilot-workspace.onrender.com/manifest.json` and `https://unipilot-workspace.onrender.com/sw.js` and confirm they return JSON and JavaScript respectively, not the app HTML or a 404.

## PWABuilder Android packaging

1. Deploy the PWA files first and wait until the HTTPS site serves them.
2. Open PWABuilder and enter `https://unipilot-workspace.onrender.com/`.
3. Run the PWA validation. Resolve any live-site findings PWABuilder reports before packaging.
4. Choose **Package for Stores** / **Android** (wording may vary), then choose the **Trusted Web Activity (TWA)** package option.
5. Use the website origin `https://unipilot-workspace.onrender.com` and start URL `/`. Keep the app name UniPilot and select the supplied 512×512 icon if prompted.
6. Generate the Android package. PWABuilder / its Android packaging flow will create or guide you through the signing key. Keep the keystore and passwords secure and backed up.
7. After signing, obtain the actual SHA-256 certificate fingerprint from the signing certificate used for the release APK/AAB. Do not use a debug fingerprint for a production release.
8. Create `/.well-known/assetlinks.json` at the site root using the exact package name and SHA-256 fingerprint produced by your Android build. Example structure only (replace both placeholders with the actual values):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "REPLACE_WITH_ACTUAL_ANDROID_APPLICATION_ID",
      "sha256_cert_fingerprints": ["REPLACE_WITH_ACTUAL_SHA256_CERTIFICATE_FINGERPRINT"]
    }
  }
]
```

9. Deploy `/.well-known/assetlinks.json`, then verify it is publicly accessible over HTTPS and returns valid JSON with `Content-Type: application/json` (or another JSON content type). Verify the package name and fingerprint exactly match the installed release signing certificate. If you later change the signing key, update this file accordingly.
10. Re-run the TWA / Digital Asset Links verification in PWABuilder and test the generated APK on a real Android device.

## Important behavior and limits

- This service worker is an offline shell, not a full offline mode. UniPilot's external Tailwind CDN and Google Fonts still need internet access unless already embedded/cached by the browser. Online-only features also remain online-only.
- UniPilot's user data continues to use its existing browser localStorage / IndexedDB storage. This data is not copied to the APK during packaging and may not automatically migrate between browser and installed-app storage contexts.
- A successful online navigation refreshes the cached app shell. A new service-worker version removes older UniPilot caches when it activates. Do not rely on the worker as a substitute for server-side backups.
- A TWA normally hides browser chrome only when Digital Asset Links verification succeeds. Until `assetlinks.json` is correct and live, Android may show a browser fallback / Custom Tab UI.
- The Render app must remain HTTPS and the TWA's origin must exactly match the deployed domain.
