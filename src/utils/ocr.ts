import { createWorker, PSM } from 'tesseract.js';

// Preprocess image to improve OCR accuracy
async function preprocessImage(file: File): Promise<File> {
  // This is a simple implementation without canvas manipulation
  // In a more complex implementation, you could use canvas to adjust contrast, etc.
  return file;
}

export async function processImage(file: File, progressCallback: (progress: number) => void) {
  // Preprocess the image first
  const processedFile = await preprocessImage(file);
  
  // Create a worker with better configuration
  const worker = await createWorker('eng', 1, {
    logger: m => {
      if ('progress' in m && typeof m.progress === 'number') {
        // Convert Tesseract's progress stages to a 0-1 scale
        const normalizedProgress = Math.min(
          (m.progress + (m.status ? 0.2 : 0)) / 1.2,
          1
        );
        progressCallback(normalizedProgress);
      }
    }
  });
  
  try {
    // Process the image with enhanced configuration
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/:;()&\'"-+$%@!?_ ',
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // Assume a single uniform block of text
      preserve_interword_spaces: '1',
    });
    
    const result = await worker.recognize(processedFile);
    await worker.terminate();
    
    console.log("Raw OCR text:", result.data.text); // For debugging
    
    return {
      text: result.data.text,
      data: result.data,
      progress: 1,
      // Include raw lines and words for better parsing
      lines: result.data.lines || [],
      words: result.data.words || []
    };
  } catch (error) {
    await worker.terminate();
    console.error("OCR Processing Error:", error);
    throw error;
  }
}