# PWA Deployment Guide

## Prerequisites

- HTTPS enabled (Service Worker requires secure context)
- Modern web hosting that supports static files
- HTTP/2 support recommended for performance

## Deployment Options

### 1. **Vercel** (Recommended - Free tier available) ⭐

**Best for**: Fast deployment, automatic HTTPS, great PWA support

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

**Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    }
  ]
}
```

### 2. **Netlify** (Free tier available)

**Best for**: Git integration, continuous deployment, easy setup

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Configuration** (`netlify.toml`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json"
```

### 3. **GitHub Pages**

**Best for**: Free hosting with GitHub integration

```bash
# Build
npm run build

# Deploy to gh-pages branch
npx gh-pages -d dist
```

**Update `vite.config.ts`** for subpath hosting:
```typescript
// If your repo is at github.com/username/repo
// Change the base path:
export default defineConfig({
  base: '/carrot-flight/',
  // ... other config
});
```

### 4. **Firebase Hosting**

**Best for**: Google integration, serverless functions

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase project
firebase init hosting

# Deploy
npm run build
firebase deploy
```

### 5. **AWS S3 + CloudFront**

**Best for**: Scalable, CDN, custom domains

1. Create S3 bucket
2. Enable static website hosting
3. Upload `dist/` folder contents
4. Create CloudFront distribution
5. Point custom domain to CloudFront

**Configure CORS and headers** in bucket policy

### 6. **Self-Hosted (VPS/Dedicated Server)**

**Best for**: Full control, custom configuration

**Nginx Configuration**:
```nginx
server {
    listen 443 ssl http2;
    server_name carrot-flight.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Service Worker - no caching
    location = /sw.js {
        expires -1;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # Assets - long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Manifest
    location = /manifest.json {
        add_header Content-Type "application/manifest+json" always;
        expires -1;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # SPA - redirect to index.html
    location / {
        root /var/www/carrot-flight/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

**Apache Configuration**:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Service Worker - no cache
  <FilesMatch "^sw\.js$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>

  # Manifest
  <FilesMatch "^manifest\.json$">
    Header set Content-Type "application/manifest+json"
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>

  # Assets - long cache
  <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  # SPA routing
  RewriteCond %{DOCUMENT_ROOT}%{REQUEST_FILENAME} !-f
  RewriteCond %{DOCUMENT_ROOT}%{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [QSA,L]
</IfModule>
```

## Critical Headers for PWA

### Service Worker Headers
```
Cache-Control: public, max-age=0, must-revalidate
```
- No caching to get latest version
- Must revalidate on each request

### Manifest Headers
```
Content-Type: application/manifest+json
Cache-Control: public, max-age=0, must-revalidate
```

### Asset Headers
```
Cache-Control: public, max-age=31536000, immutable
```
- Long cache (1 year)
- Immutable for versioned assets

## Testing After Deployment

### 1. Check PWA Compliance
Visit: https://pwabuilder.com
- Paste your deployed URL
- Check all green checkmarks

### 2. Lighthouse Audit (Chrome DevTools)
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Run PWA audit
4. Target: All tests green except optional

### 3. Service Worker Check
1. DevTools → Application → Service Workers
2. Should show "activated and running"
3. Try offline mode - app should work

### 4. Installation Test
- Try installing on desktop (Chrome/Edge)
- Try adding to home screen on mobile
- Verify app icon appears

## Performance Optimization

### Enable gzip compression
```nginx
# Nginx
gzip on;
gzip_types text/plain text/css text/javascript 
           application/javascript application/json 
           application/manifest+json;
```

### Use CDN for assets
- Cloudflare (free tier available)
- Bunny CDN
- AWS CloudFront
- Akamai

### Enable HTTP/2 Push
```nginx
location = /index.html {
  add_header Link "</assets/bundle.js>; rel=preload; as=script" always;
}
```

## SSL Certificate

### Free Option: Let's Encrypt
```bash
# Using Certbot
sudo certbot certonly --standalone -d carrot-flight.com
```

### Paid Options
- Comodo/Sectigo
- GlobalSign
- DigiCert

## Monitoring

### Service Worker Updates
Monitor browser console for update checks:
```javascript
// In main.tsx
navigator.serviceWorker.ready.then(reg => {
  setInterval(() => {
    reg.update().then(() => {
      console.log('Service Worker checked for updates');
    });
  }, 60000);
});
```

### Analytics
Add PWA analytics:
```javascript
// Track installations
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA install prompt shown');
});

window.addEventListener('appinstalled', (e) => {
  console.log('PWA installed');
});
```

## Troubleshooting Deployment

### Service Worker not registering
- [ ] Verify HTTPS is enabled
- [ ] Check `/sw.js` file exists in dist folder
- [ ] Verify service worker headers are correct
- [ ] Check browser console for errors

### Manifest not loading
- [ ] Verify manifest.json exists
- [ ] Check manifest Content-Type header
- [ ] Validate JSON syntax
- [ ] Check browser console for MIME type errors

### Cache issues after update
- [ ] Clear browser cache
- [ ] Uninstall and reinstall app
- [ ] Check Service-Worker-Allowed header
- [ ] Verify cache version number changed

### App not installable
- [ ] Check manifest has all required fields
- [ ] Verify icons exist and are valid
- [ ] Check manifest.json is served with correct MIME type
- [ ] Test on Chrome (simplest to debug)

---

**Recommended**: Start with **Vercel** for easiest PWA deployment!
