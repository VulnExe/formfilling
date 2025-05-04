// Common application types

/**
 * Represents a form field with a name and value
 */
export interface FormField {
  name: string;
  value: string;
}

/**
 * Represents a raw OCR line
 */
export interface RawOCRLine {
  lineNumber: number;
  text: string;
}

/**
 * Represents a processed form image with OCR results
 */
export interface ProcessedImage {
  file: File;
  text?: string;
  isProcessing: boolean;
  error?: string;
  success: boolean;
  records?: RecordData[];
}

/**
 * Represents a record extracted from an image
 */
export interface RecordData {
  parsedData: FormField[];
  recordId: string;
  text: string;
  excelBuffer: string;
  rawOCRLines?: RawOCRLine[];
} 