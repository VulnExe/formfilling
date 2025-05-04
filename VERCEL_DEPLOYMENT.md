# Vercel Deployment Guide

This guide will help you deploy the Form Processing Application to Vercel with server-side rendering support.

## Project Preparation

### 1. Restructure for Vercel Serverless Functions

First, create a dedicated API folder for Vercel serverless functions:

```
mkdir -p api
```

### 2. Convert Express Server to Serverless Functions

Create a new file `api/parse-form.js`:

```javascript
const { createWorker } = require('tesseract.js');
const XLSX = require('xlsx');
const multer = require('multer');
const util = require('util');

// Import necessary functions from server.cjs
// Copy the helper functions from server.cjs:
// - parseFormData
// - parseFormRecord
// - generateExcelBuffer 
// - etc.

// Setup multer for serverless
const multerMemoryStorage = multer.memoryStorage();
const upload = multer({ 
  storage: multerMemoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Convert to serverless-compatible middleware
const multerServerless = upload.array('images', 10);
const processMiddleware = util.promisify(multerServerless);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Process the incoming form data
    await processMiddleware(req, res);

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process each uploaded file
    const results = [];

    for (const file of req.files) {
      console.log(`Processing file: ${file.originalname}`);
      
      // Create Tesseract worker
      const worker = await createWorker('eng');
      
      // Set Tesseract configurations
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/:;()&\'"-+$%@!?_ ',
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
      });
      
      // Process the image with OCR
      const { data } = await worker.recognize(file.buffer);
      await worker.terminate();
      
      // Parse the extracted text into multiple records
      const parsedRecords = parseFormData(data.text);
      
      // Generate Excel files for each record
      const recordResults = parsedRecords.map((record, index) => {
        // Convert record object to FormField array format
        const formFields = Object.entries(record).map(([name, value]) => ({ name, value }));
        
        // Generate Excel for this record with raw OCR text
        const excelBuffer = generateExcelBuffer(formFields, data.text);
        
        // For frontend display, prepare formatted raw OCR text
        const formattedRawText = data.text
          .split('\n')
          .filter(line => line.trim())
          .map((line, i) => ({ 
            lineNumber: i + 1, 
            text: line.trim() 
          }));
        
        return {
          recordId: `${file.originalname.replace(/\.[^/.]+$/, "")}_record_${index + 1}`,
          text: data.text,
          rawOCRLines: formattedRawText,
          parsedData: formFields,
          excelBuffer: excelBuffer.toString('base64')
        };
      });
      
      // Add to results
      results.push({
        filename: file.originalname,
        text: data.text,
        records: recordResults
      });
    }

    return res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error processing form:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during processing'
    });
  }
};
```

### 3. Create a Ping Endpoint

Create `api/ping.js`:

```javascript
module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Vercel serverless function is running'
  });
};
```

### 4. Update API Client in Frontend

Update `src/utils/apiClient.ts` to use relative URLs for API endpoints:

```typescript
// Change from absolute URLs to relative URLs
const API_ENDPOINT = '/api/parse-form';
const PING_ENDPOINT = '/api/ping';

// And remove any server port detection logic that won't be needed in production
```

### 5. Create Vercel Configuration File

Create `vercel.json` in the project root:

```json
{
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
}
```

## Deployment to Vercel

### 1. Install Vercel CLI

```
npm install -g vercel
```

### 2. Login to Vercel

```
vercel login
```

### 3. Deploy the Application

Run the following command in your project directory:

```
vercel
```

Follow the CLI prompts:
- Set up and deploy: `Y`
- Select scope: Choose your account
- Link to existing project: `N`
- Project name: Choose a name or accept the suggested one
- Directory: Just press Enter to use the current directory
- Override settings: `N`

### 4. Assign a Custom Domain (Optional)

```
vercel domains add your-domain.com
```

### 5. Deploy to Production

Once you've verified everything works correctly on the preview URL, deploy to production:

```
vercel --prod
```

## Important Notes for Vercel Deployment

1. **Serverless Function Limitations**:
   - Vercel serverless functions have execution time limits (30 seconds for Pro plans)
   - Memory is limited to 1GB (Hobby) or 4GB (Pro)
   - OCR processing of large images might exceed these limits

2. **Environment Variables**:
   - Set any necessary environment variables in the Vercel dashboard
   - Or add them to your project: `vercel env add MY_VARIABLE`

3. **Troubleshooting**:
   - Check serverless function logs in the Vercel dashboard
   - For large files, consider using a dedicated OCR service or pre-processing images to reduce size

4. **Optimizations**:
   - Consider using Next.js for better SSR support on Vercel
   - Use Vercel's Edge Functions for faster response times globally
   - Implement caching for OCR results to improve performance

---

Remember that Vercel's serverless architecture has different constraints than a traditional server. OCR processing is CPU-intensive and may work better on a dedicated server if you're processing many or large images. 