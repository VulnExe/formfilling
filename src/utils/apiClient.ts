/**
 * API client for communicating with the backend server
 */

import { FormField } from '../types';

// Define the potential backend server ports the server might be using
const SERVER_PORTS = [5050, 5051, 5052, 5053, 5054, 5060, 6000];
let cachedServerPort: number | null = null;

export interface ApiResponse {
  success: boolean;
  results?: Array<{
    filename: string;
    text: string;
    records: Array<{
      recordId: string;
      text: string;
      parsedData: FormField[];
      excelBuffer: string;
    }>;
  }>;
  error?: string;
}

/**
 * Detects which port the backend server is running on
 * This function checks each potential port to see which one responds
 */
async function detectServerPort(): Promise<number> {
  // If we've already detected a port, use the cached version
  if (cachedServerPort) {
    return cachedServerPort;
  }

  for (const port of SERVER_PORTS) {
    try {
      // Try a HEAD request to the server health endpoint
      const response = await fetch(`http://localhost:${port}/api/ping`, {
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache',
        },
        // Short timeout to quickly move to the next port
        signal: AbortSignal.timeout(500),
      });
      
      if (response.ok) {
        console.log(`Found server on port ${port}`);
        cachedServerPort = port;
        return port;
      }
    } catch (error) {
      // Ignore errors and try the next port
    }
  }
  
  // Default to the primary port if detection fails
  console.log('Server port detection failed, using default port 5050');
  return 5050;
}

/**
 * Gets the backend API URL with the correct port
 */
async function getApiUrl(endpoint: string): Promise<string> {
  const port = await detectServerPort();
  return `http://localhost:${port}${endpoint}`;
}

/**
 * Process form images by sending them to the backend OCR service
 */
export async function processFormsWithBackend(files: File[]): Promise<ApiResponse> {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('images', file);
  });
  
  try {
    const apiUrl = await getApiUrl('/api/parse-form');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `Server error: ${response.status}`
      };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error processing forms:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Download an Excel file from a base64 string
 */
export function downloadExcelFromBase64(base64Data: string, filename: string): void {
  try {
    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error downloading Excel file:', error);
    throw error;
  }
} 