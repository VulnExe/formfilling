# Vercel Deployment Quick Start

## 1. Prepare Project for Vercel

```bash
# Clone and install
git clone <repository-url>
cd <project-folder>
npm install

# Create API directory for serverless functions
mkdir -p api

# Create Vercel config file
echo '{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}' > vercel.json
```

## 2. Move Server Code to API Folder

Copy these files from project root to API folder:
- Create `api/parse-form.js` (based on server.cjs)
- Create `api/ping.js` for health checks

## 3. Update API Client

Edit `src/utils/apiClient.ts` to use relative URLs:
```typescript
const API_ENDPOINT = '/api/parse-form';
const PING_ENDPOINT = '/api/ping';
```

## 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (development/preview)
vercel

# Deploy to production
vercel --prod
```

## Important Note
OCR processing is resource-intensive. Vercel serverless functions have execution limits (30s) that may be exceeded with large images. 