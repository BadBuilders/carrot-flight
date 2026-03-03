# PWA Configuration Guide

## What has been set up for PWA

### 1. **Manifest File** (`public/manifest.json`)
   - Defines the PWA metadata (name, icons, display mode, etc.)
   - Configures app as "standalone" mode (full-screen)
   - Defines theme colors, start URL, and app categories
   - Includes shortcut for quick game access
   - Has support for maskable icons for modern devices

### 2. **Service Worker** (`public/sw.js`)
   - Handles offline functionality with cache strategy
   - Caches app assets on first visit
   - Uses "cache-first" strategy for faster loads
   - Falls back to network for fresh content
   - Manages cache updates and cleanup
   - Enables offline-first experience

### 3. **HTML Meta Tags** (updated `index.html`)
   - `manifest.json` link
   - PWA capability meta tags for iOS and Android
   - Theme color configuration
   - Apple mobile app support
   - Responsive viewport settings

### 4. **Service Worker Registration** (updated `src/main.tsx`)
   - Registers service worker on app load
   - Checks for updates every minute
   - Handles automatic page refresh when new version is available
   - Error handling for registration failures

### 5. **Vite Configuration** (updated `vite.config.ts`)
   - Added `Service-Worker-Allowed` header for proper SW scope
   - Configured build output for PWA deployment

## Next Steps to Complete PWA

### 1. **Add Icons** (Required)
   Create icons in `public/icons/`:
   - `icon-192x192.png` - Standard app icon
   - `icon-512x512.png` - Large icon for splash screens
   - `icon-maskable-192x192.png` - Masked icon (safe zone only)
   - `icon-maskable-512x512.png` - Large masked icon
   - `play-192x192.png` - Shortcut icon (optional)

   **Generate icons:**
   - Use online tools: https://pwabuilder.com (Image Generator)
   - Or convert your game logo to PNG in these sizes

### 2. **Add Screenshots** (Recommended)
   Create screenshots in `public/screenshots/`:
   - `screenshot-540x720.png` - Mobile view (tall)
   - `screenshot-1280x720.png` - Desktop/tablet view (wide)

### 3. **Build for Production**
   ```bash
   npm run build
   ```

### 4. **Test PWA Locally**
   ```bash
   npm run preview
   ```
   Then open DevTools (F12) > Application > Service Workers to verify registration

### 5. **Deploy**
   - Host the `dist/` folder on HTTPS (required for PWA)
   - Service Worker requires secure context (HTTPS)

## Testing PWA Features

### Desktop (Chrome/Edge)
1. Open DevTools (F12)
2. Go to **Application** tab
3. Check **Service Workers** - should show "activated and running"
4. Check **Cache Storage** - should have 'carrot-flight-v1'
5. Click **Install app** button in the browser address bar

### Mobile (Android Chrome)
1. Open the app URL in Chrome
2. Tap menu (⋮) → **Install app**
3. Or tap **Install** banner if shown

### Mobile (iOS Safari)
1. Open the app URL in Safari
2. Tap Share button → **Add to Home Screen**
3. Tap **Add** to install

## PWA Benefits Enabled

✅ **Installable** - Add to home screen
✅ **Standalone** - Runs like a native app (no browser UI)
✅ **Offline Support** - Works without internet
✅ **Fast Loading** - Cached assets load instantly
✅ **Auto Updates** - Service worker checks for updates
✅ **Responsive** - Works on all screen sizes
✅ **Secure** - HTTPS required

## Cache Strategy

The service worker uses a **"cache-first with network fallback"** strategy:

1. Check local cache for the resource
2. If found in cache, serve immediately
3. If not in cache, fetch from network
4. Cache the network response for future use
5. If offline, return cached version or index.html

This provides fast performance while supporting offline functionality.

## Troubleshooting

**Service Worker not registering?**
- Check browser console for errors
- Ensure you're using HTTPS (or localhost for development)
- Check that `/sw.js` is being served correctly

**Cache not updating?**
- Service worker checks for updates every minute
- Force refresh (Ctrl+Shift+R) to get latest version
- Clear application cache in DevTools if needed

**Icons not showing?**
- Generate and place icons in `public/icons/` folder
- Ensure PNG format and correct dimensions
- Clear browser cache and reinstall app

## Resources

- [PWA Builder Studio](https://pwabuilder.com) - Full PWA setup tool
- [MDN Web Docs - PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
