# Form Processing Application

This application extracts data from form images using OCR technology. It features a React frontend and Node.js backend that work together to process images, extract form fields, and generate Excel files.

## Features

- Extract form data from images using OCR
- Process multiple forms within a single image
- Process multiple images in batch mode
- Display results in a user-friendly interface
- Generate Excel files with extracted data
- View both parsed form fields and raw OCR text

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- npm (usually comes with Node.js)
- Modern web browser (Chrome, Firefox, Edge, etc.)

## Installation

Follow these steps to set up the application:

1. Clone the repository (if you haven't already)
   ```
   git clone <repository-url>
   cd <project-folder>
   ```

2. Install dependencies
   ```
   npm install
   ```

## Running the Application

### Step 1: Start the Backend Server

The backend server processes the images using OCR and extracts form data.

```
npm run dev:server
```

This will start the server on port 5050 by default. If port 5050 is already in use, the server will automatically try other ports in this sequence: 5051, 5052, 5053, 5054, 5060, 6000.

You'll see a message in the console indicating which port the server is running on:
```
Server running on port 5050
```

### Step 2: Start the Frontend Application

In a new terminal window, start the frontend development server:

```
npm run dev
```

This will start the frontend application on port 5173. You should see output similar to:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### Step 3: Access the Application

Open your web browser and navigate to:
```
http://localhost:5173
```

The application should now be running and ready to use.

## Usage

1. **Upload Images**: Click on the upload area or drag and drop form images.
2. **Process Images**: The application will automatically begin processing upon upload.
3. **View Results**: 
   - The extracted form fields will be displayed in a table.
   - Toggle between "Parsed Fields" and "Raw OCR Text" tabs to see different views.
   - Navigate between multiple records using the pagination controls.
4. **Edit Data**: Click the "Edit" button to manually correct any fields.
5. **Download Excel**: Use the "Download Excel" button to export the data.
6. **Batch Processing**: Use the "Process All Images" button to process multiple images at once.

## Troubleshooting

### Backend Issues

- **Port Conflicts**: If you see a message about trying another port, note the port number displayed in the console and use that for accessing the API.
- **OCR Errors**: If OCR processing fails, try using higher quality images or editing the extracted data manually.

### Frontend Issues

- **Connection to Backend**: If the frontend cannot connect to the backend, ensure the backend server is running and check the console for the port number.
- **Image Processing**: Large images may take longer to process. Be patient or try reducing the image size.

### General Issues

- **Dependencies**: If you encounter errors during startup, try running `npm install` again to ensure all dependencies are properly installed.
- **Browser Compatibility**: Ensure you're using a modern, updated web browser.

## Advanced Configuration

### Changing the Backend Port

The backend server tries to use port 5050 by default, but you can modify this in the `server.cjs` file:

```javascript
// Change this line to set a different primary port
const PRIMARY_PORT = 5050;
```

### Modifying Frontend API Endpoint

If you've changed the backend port, you may need to update the frontend configuration to match. The frontend automatically tries to detect the correct backend port.

## Development Notes

- Backend: Express.js with Tesseract.js for OCR processing
- Frontend: React with Vite, using Tailwind CSS for styling
- Excel Generation: Using SheetJS (XLSX)

---

For additional help or questions, please contact the repository maintainer. 