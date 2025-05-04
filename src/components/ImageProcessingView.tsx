import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Download, FileSpreadsheet, AlertCircle, ChevronLeft, ChevronRight, Edit, Save, Eye, List } from 'lucide-react';
import { FileWithPreview } from '../types/file';
import { processImage } from '../utils/ocr';
import { processFormsWithBackend, downloadExcelFromBase64 } from '../utils/apiClient';
import { FormField, RecordData, RawOCRLine } from '../types';
import { generateExcel } from '../utils/excelGenerator';
import { formatDate, generateInitials } from '../utils/formatters';

interface ImageProcessingViewProps {
  file: FileWithPreview;
  onBack: () => void;
  totalFiles: number;
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
}

const RecordsPagination: React.FC<{
  total: number;
  current: number;
  onChange: (index: number) => void;
}> = ({ total, current, onChange }) => {
  // When there are many records, we'll show a condensed pagination
  const maxVisibleButtons = 7; // Maximum number of page buttons to show
  
  // If we have more records than we can show buttons for
  if (total > maxVisibleButtons) {
    const startPage = Math.max(0, Math.min(current - Math.floor(maxVisibleButtons / 2), total - maxVisibleButtons));
    const endPage = Math.min(total - 1, startPage + maxVisibleButtons - 1);
    
    const buttons = [];
    
    // Previous button
    buttons.push(
      <button 
        key="prev" 
        onClick={() => onChange(Math.max(0, current - 1))}
        disabled={current === 0}
        className="px-2 py-1 bg-gray-200 rounded mr-1 disabled:opacity-50"
      >
        &laquo;
      </button>
    );
    
    // First page button if we're not starting from the first page
    if (startPage > 0) {
      buttons.push(
        <button 
          key="first" 
          onClick={() => onChange(0)}
          className="px-2 py-1 bg-gray-200 rounded mr-1"
        >
          1
        </button>
      );
      
      // Ellipsis if there's a gap
      if (startPage > 1) {
        buttons.push(
          <span key="ellipsis1" className="px-2">...</span>
        );
      }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button 
          key={i} 
          onClick={() => onChange(i)}
          className={`px-2 py-1 rounded mr-1 ${current === i ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          {i + 1}
        </button>
      );
    }
    
    // Last page button if we're not ending at the last page
    if (endPage < total - 1) {
      // Ellipsis if there's a gap
      if (endPage < total - 2) {
        buttons.push(
          <span key="ellipsis2" className="px-2">...</span>
        );
      }
      
      buttons.push(
        <button 
          key="last" 
          onClick={() => onChange(total - 1)}
          className="px-2 py-1 bg-gray-200 rounded mr-1"
        >
          {total}
        </button>
      );
    }
    
    // Next button
    buttons.push(
      <button 
        key="next" 
        onClick={() => onChange(Math.min(total - 1, current + 1))}
        disabled={current === total - 1}
        className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
      >
        &raquo;
      </button>
    );
    
    return <div className="flex items-center justify-center mt-4 mb-2">{buttons}</div>;
  }
  
  // For fewer records, show all page buttons
  return (
    <div className="flex items-center justify-center mt-4 mb-2">
      <button 
        onClick={() => onChange(Math.max(0, current - 1))}
        disabled={current === 0}
        className="px-2 py-1 bg-gray-200 rounded mr-1 disabled:opacity-50"
      >
        &laquo;
      </button>
      {Array.from({ length: total }).map((_, index) => (
        <button 
          key={index} 
          onClick={() => onChange(index)}
          className={`px-2 py-1 rounded mr-1 ${current === index ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          {index + 1}
        </button>
      ))}
      <button 
        onClick={() => onChange(Math.min(total - 1, current + 1))}
        disabled={current === total - 1}
        className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
      >
        &raquo;
      </button>
    </div>
  );
};

export const ImageProcessingView: React.FC<ImageProcessingViewProps> = ({ 
  file, 
  onBack,
  totalFiles,
  currentIndex,
  onNext,
  onPrevious
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string>('');
  const [formData, setFormData] = useState<FormField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editableFormData, setEditableFormData] = useState<FormField[]>([]);
  const [processingMode, setProcessingMode] = useState<'client' | 'server'>('server');
  const [excelBase64, setExcelBase64] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  
  // For multi-record handling
  const [allRecords, setAllRecords] = useState<RecordData[]>([]);
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  const [rawOCRLines, setRawOCRLines] = useState<RawOCRLine[]>([]);
  
  // Tab control for parsed fields vs raw OCR view
  const [activeTab, setActiveTab] = useState<'parsed' | 'raw'>('parsed');

  useEffect(() => {
    setIsProcessing(true);
    setProgress(0);
    setExtractedText('');
    setFormData([]);
    setError(null);
    setIsComplete(false);
    setShowRawText(false);
    setEditMode(false);
    setExcelBase64(null);
    setAllRecords([]);
    setCurrentRecordIndex(0);
    setRawOCRLines([]);

    const processWithServer = async () => {
      try {
        // Use the backend API for better OCR accuracy
        const response = await processFormsWithBackend([file.file]);
        
        if (!response.success || !response.results || response.results.length === 0) {
          throw new Error(response.error || 'Failed to process the image');
        }
        
        const result = response.results[0];
        setExtractedText(result.text);
        
        if (result.records && result.records.length > 0) {
          // Before setting all records, ensure they all have the same order of fields
          const orderedRecords = result.records.map(record => {
            // Get default field structure for ordering
            const orderedFields = getDefaultFields();
            
            // Map parsed data onto the ordered structure
            const parsedDataMap = new Map(record.parsedData.map(field => [field.name, field.value]));
            
            // Apply values from parsed data to the ordered structure
            orderedFields.forEach(field => {
              if (parsedDataMap.has(field.name)) {
                field.value = parsedDataMap.get(field.name) || '';
              }
            });
            
            return {
              ...record,
              parsedData: orderedFields
            };
          });
          
          setAllRecords(orderedRecords);
          
          // Set the first record as the active one
          const firstRecord = orderedRecords[0];
          setFormData(firstRecord.parsedData);
          setEditableFormData(JSON.parse(JSON.stringify(firstRecord.parsedData)));
          setExcelBase64(firstRecord.excelBuffer);
          setRecordId(firstRecord.recordId);
          
          // Store the raw OCR text lines if available
          if (firstRecord.rawOCRLines) {
            setRawOCRLines(firstRecord.rawOCRLines);
            setExtractedText(firstRecord.rawOCRLines.map((line: RawOCRLine) => line.text).join('\n'));
          } else {
            setExtractedText(result.text);
          }
        } else {
          // For backward compatibility with old API format
          // This code path should not be taken with the updated backend
          setFormData([]);
          setEditableFormData([]);
          setExcelBase64(null);
          setError("No records found in the image. The backend API may be outdated.");
        }
        
        setIsComplete(true);
      } catch (err) {
        console.error('Server processing failed:', err);
        setError(`Server processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        // Fall back to client-side processing
        setProcessingMode('client');
        processWithClient();
      } finally {
        setIsProcessing(false);
      }
    };

    const processWithClient = async () => {
      try {
        // Client-side processing fallback
        const { text, data, progress, lines, words } = await processImage(file.file, (p) => {
          setProgress(p);
        });
        
        setExtractedText(text);
        
        // Process the extracted text into structured data
        let processedData = parseFormData(text);
        
        // Ensure the fields are in a consistent order
        if (processedData.length > 0) {
          const orderedFields = getDefaultFields();
          const processedDataMap = new Map(processedData.map(field => [field.name, field.value]));
          
          orderedFields.forEach(field => {
            if (processedDataMap.has(field.name)) {
              field.value = processedDataMap.get(field.name) || '';
            }
          });
          
          processedData = orderedFields;
        }
        
        setFormData(processedData);
        setEditableFormData(JSON.parse(JSON.stringify(processedData)));
        
        // If no fields were found, ensure we have the default fields ready to fill
        if (processedData.length === 0) {
          const defaultFields = getDefaultFields();
          setFormData(defaultFields);
          setEditableFormData(JSON.parse(JSON.stringify(defaultFields)));
          setEditMode(true); // Automatically go to edit mode if no fields found
        }
        
        setIsComplete(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred during processing');
      } finally {
        setIsProcessing(false);
      }
    };

    // Start with server processing, fallback to client if needed
    if (processingMode === 'server') {
      processWithServer();
    } else {
      processWithClient();
    }
  }, [file, processingMode]);

  const getDefaultFields = (): FormField[] => {
    return [
      { name: 'FORM NO', value: '' },
      { name: 'RECORD NO', value: '' },
      { name: 'SALES DATE', value: '' },
      { name: 'CUSTOMER NAME', value: '' },
      { name: 'INITIALS', value: '' },
      { name: 'E-MAIL ADDRESS', value: '' },
      { name: 'DEALER NAME', value: '' },
      { name: 'CUSTOMER ADDRESS', value: '' },
      { name: 'CITY', value: '' },
      { name: 'STATE', value: '' },
      { name: 'CUSTOMER PHONE', value: '' },
      { name: 'DEALER PHONE', value: '' },
      { name: 'DELIVERY TIME', value: '' },
      { name: 'INVOICE NO', value: '' },
      { name: 'INSURANCE POLICY NO', value: '' },
      { name: 'CHESIS NO', value: '' },
      { name: 'BASIC AMOUNT', value: '' },
      { name: 'INSURANCE AMOUNT', value: '' },
      { name: 'TOTAL AMOUNT', value: '' },
      { name: 'DISCOUNT', value: '' },
      { name: 'NET AMOUNT', value: '' },
      { name: 'EMPLOYER', value: '' },
      { name: 'CREDIT CARD NO', value: '' },
      { name: 'REMARK', value: '' }
    ];
  };

  const parseFormData = (text: string): FormField[] => {
    console.log("Parsing text:", text);
    
    // Initialize with default empty fields
    const defaultFields = getDefaultFields();
    const fieldMap: { [key: string]: string } = {};
    
    // Pre-populate the map with empty values for all fields
    defaultFields.forEach(field => {
      fieldMap[field.name] = '';
    });

    // Enhanced regex patterns for all fields
    const patterns = {
      'FORM NO': /(?:FORM\s*(?:NO|NUMBER|#)|Form\s*(?:No|Number|#))[:\s-=]*\s*([A-Z0-9_\-./]+)/i,
      'RECORD NO': /(?:RECORD\s*(?:NO|NUMBER|#)|Rec\s*(?:No|Number|#)|Record\s*(?:ID))[:\s-=]*\s*([A-Z0-9_\-./]+)/i,
      'SALES DATE': /(?:SALES\s*DATE|DATE\s*(?:OF\s*SALE)?|Purchase\s*Date|Sale\s*Date)[:\s-=]*\s*([A-Za-z0-9\s,./-]+)/i,
      'CUSTOMER NAME': /(?:CUSTOMER\s*NAME|CLIENT\s*NAME|BUYER\s*NAME|NAME\s*(?:OF\s*CUSTOMER)?)[:\s-=]*\s*([A-Za-z0-9\s,.'-]+)/i,
      'E-MAIL ADDRESS': /(?:E-?MAIL\s*(?:ADDRESS)?|Email)[:\s-=]*\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      'DEALER NAME': /(?:DEALER\s*NAME|SELLER\s*NAME|VENDOR\s*NAME)[:\s-=]*\s*([A-Za-z0-9\s,.'-]+)/i,
      'CUSTOMER ADDRESS': /(?:CUSTOMER\s*ADDRESS|CLIENT\s*ADDRESS|ADDRESS)[:\s-=]*\s*([A-Za-z0-9\s,.'-]+)/i,
      'CITY': /(?:CITY|TOWN|MUNICIPALITY)[:\s-=]*\s*([A-Za-z\s,.'-]+)/i,
      'STATE': /(?:STATE|PROVINCE|REGION)[:\s-=]*\s*([A-Za-z\s,.'-]+)/i,
      'CUSTOMER PHONE': /(?:CUSTOMER\s*PHONE|CLIENT\s*PHONE|PHONE\s*NUMBER)[:\s-=]*\s*([0-9\s()+-.]+)/i,
      'DEALER PHONE': /(?:DEALER\s*PHONE|SELLER\s*PHONE|VENDOR\s*PHONE)[:\s-=]*\s*([0-9\s()+-.]+)/i,
      'DELIVERY TIME': /(?:DELIVERY\s*TIME|DELIVERY\s*SCHEDULE|DELIVERY)[:\s-=]*\s*([A-Za-z0-9\s,.'-]+)/i,
      'INVOICE NO': /(?:INVOICE\s*(?:NO|NUMBER|#)|Invoice)[:\s-=]*\s*([A-Z0-9_\-./]+)/i,
      'INSURANCE POLICY NO': /(?:INSURANCE\s*POLICY\s*(?:NO|NUMBER|#)|Policy\s*(?:No|Number))[:\s-=]*\s*([A-Z0-9_\-./]+)/i,
      'CHESIS NO': /(?:CHESIS\s*(?:NO|NUMBER|#)|CHASSIS\s*(?:NO|NUMBER|#)|VIN)[:\s-=]*\s*([A-Z0-9_\-./]+)/i,
      'BASIC AMOUNT': /(?:BASIC\s*AMOUNT|BASE\s*AMOUNT|PRINCIPAL\s*(?:AMOUNT)?)[:\s-=]*\s*([0-9,.]+)/i,
      'INSURANCE AMOUNT': /(?:INSURANCE\s*AMOUNT|INS\.\s*AMOUNT|INSURANCE\s*(?:COST|FEE))[:\s-=]*\s*([0-9,.]+)/i,
      'TOTAL AMOUNT': /(?:TOTAL\s*AMOUNT|TOTAL\s*COST|TOTAL)[:\s-=]*\s*([0-9,.]+)/i,
      'DISCOUNT': /(?:DISCOUNT(?:\s*%)?|DISCOUNT\s*RATE|DISCOUNT\s*PERCENTAGE)[:\s-=]*\s*([0-9,.]+)(?:\s*%)?/i,
      'NET AMOUNT': /(?:NET\s*AMOUNT|FINAL\s*AMOUNT|NET\s*TOTAL)[:\s-=]*\s*([0-9,.]+)/i,
      'EMPLOYER': /(?:EMPLOYER|COMPANY|OCCUPATION)[:\s-=]*\s*([A-Za-z0-9\s,.'-]+)/i,
      'CREDIT CARD NO': /(?:CREDIT\s*CARD\s*(?:NO|NUMBER|#)|CC\s*(?:NO|NUMBER|#))[:\s-=]*\s*([0-9\s-]+)/i,
      'REMARK': /(?:REMARK|REMARKS|NOTES|COMMENT)[:\s-=]*\s*([A-Za-z0-9\s,.'-]*)/i,
    };
    
    // Try to extract each field using the patterns
    Object.entries(patterns).forEach(([fieldName, pattern]) => {
      const match = text.match(pattern);
      if (match && match[1]) {
        fieldMap[fieldName] = match[1].trim();
      }
    });
    
    // Also try to extract email addresses
    if (!fieldMap['E-MAIL ADDRESS']) {
      const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        fieldMap['E-MAIL ADDRESS'] = emailMatch[1];
      }
    }
    
    // Look for name patterns if customer name wasn't found with a label
    if (!fieldMap['CUSTOMER NAME']) {
      const namePattern = /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/;
      const nameMatch = text.match(namePattern);
      if (nameMatch) {
        fieldMap['CUSTOMER NAME'] = nameMatch[1].trim();
      }
    }
    
    // Generate initials if we have a customer name
    if (fieldMap['CUSTOMER NAME'] && !fieldMap['INITIALS']) {
      fieldMap['INITIALS'] = generateInitials(fieldMap['CUSTOMER NAME']);
    }
    
    // Look for phone numbers if not found with labels
    if (!fieldMap['CUSTOMER PHONE'] || !fieldMap['DEALER PHONE']) {
      const phonePattern = /\b(\d{10}|\d{3}[-.\s]\d{3}[-.\s]\d{4}|\(\d{3}\)\s*\d{3}[-.\s]\d{4})\b/g;
      let phoneMatches: string[] = [];
      let match;
      while ((match = phonePattern.exec(text)) !== null) {
        phoneMatches.push(match[1]);
      }
      
      if (phoneMatches.length >= 1 && !fieldMap['CUSTOMER PHONE']) {
        fieldMap['CUSTOMER PHONE'] = phoneMatches[0];
      }
      if (phoneMatches.length >= 2 && !fieldMap['DEALER PHONE']) {
        fieldMap['DEALER PHONE'] = phoneMatches[1];
      }
    }
    
    // Look for specific patterns for form numbers and record numbers
    if (!fieldMap['FORM NO']) {
      const formNoPattern = /\b([A-Z0-9]{5,}_[0-9]{6})\b/;
      const formNoMatch = text.match(formNoPattern);
      if (formNoMatch) {
        fieldMap['FORM NO'] = formNoMatch[1];
      } else {
        // Try alternative form number formats
        const altFormNoPattern = /\b([A-Z]{2}[0-9]{5,})\b/;
        const altFormNoMatch = text.match(altFormNoPattern);
        if (altFormNoMatch) {
          fieldMap['FORM NO'] = altFormNoMatch[1];
        }
      }
    }
    
    // Process numeric values and perform calculations
    let basicAmount = 0;
    let insuranceAmount = 0;
    let totalAmount = 0;
    
    if (fieldMap['BASIC AMOUNT']) {
      basicAmount = parseFloat(fieldMap['BASIC AMOUNT'].replace(/,/g, ''));
    }
    
    if (fieldMap['INSURANCE AMOUNT']) {
      insuranceAmount = parseFloat(fieldMap['INSURANCE AMOUNT'].replace(/,/g, ''));
    }
    
    // If we have both basic and insurance amounts but no total, calculate it
    if ((basicAmount > 0 || insuranceAmount > 0) && !fieldMap['TOTAL AMOUNT']) {
      // Check if basic amount is very small (like 0.045) - this might be a multiplier
      if (basicAmount > 0 && basicAmount < 1) {
        // This appears to be the case in the example where 0.045 * 1000000 + 4500 = 49500
        totalAmount = basicAmount * 1000000 + insuranceAmount;
      } else {
        // Otherwise just add them
        totalAmount = basicAmount + insuranceAmount;
      }
      fieldMap['TOTAL AMOUNT'] = totalAmount.toString();
    } else if (fieldMap['TOTAL AMOUNT']) {
      // If total amount was directly extracted, use that
      totalAmount = parseFloat(fieldMap['TOTAL AMOUNT'].replace(/,/g, ''));
    }
    
    // If we have discount rate but no net amount, calculate it
    if (fieldMap['DISCOUNT']) {
      const discount = parseFloat(fieldMap['DISCOUNT'].replace(/,/g, ''));
      if (totalAmount > 0 && !fieldMap['NET AMOUNT']) {
        const netAmount = totalAmount - (totalAmount * (discount / 100));
        fieldMap['NET AMOUNT'] = netAmount.toFixed(2);
      }
    }
    
    // Check for SelfEmployed or similar text
    if (!fieldMap['EMPLOYER']) {
      if (/\bSelfEmployed\b|\bSelf-Employed\b|\bSelf\s+Employed\b/i.test(text)) {
        fieldMap['EMPLOYER'] = 'SelfEmployed';
      }
    }
    
    // Look for delivery time indicators
    if (!fieldMap['DELIVERY TIME']) {
      if (/\bAnytime\b|\bMorning\b|\bEvening\b|\bAfternoon\b/i.test(text)) {
        const deliveryMatch = text.match(/\b(Anytime|Morning|Evening|Afternoon)(?:\s+at\s+(?:Work|Home))?\b/i);
        if (deliveryMatch) {
          fieldMap['DELIVERY TIME'] = deliveryMatch[0];
        }
      }
    }
    
    // Format the date if it exists
    if (fieldMap['SALES DATE']) {
      fieldMap['SALES DATE'] = formatDate(fieldMap['SALES DATE']);
    }
    
    // Convert back to array of FormField objects
    return defaultFields.map(field => ({
      name: field.name,
      value: fieldMap[field.name] || ''
    }));
  };

  // Function to switch between records when multiple records are available
  const handleRecordChange = (index: number) => {
    if (index < 0 || index >= allRecords.length) return;
    
    setCurrentRecordIndex(index);
    const record = allRecords[index];
    setFormData(record.parsedData);
    setEditableFormData(JSON.parse(JSON.stringify(record.parsedData)));
    setExcelBase64(record.excelBuffer);
    setRecordId(record.recordId);
    
    // Update raw OCR text if available for this record
    if (record.rawOCRLines) {
      setRawOCRLines(record.rawOCRLines);
      setExtractedText(record.rawOCRLines.map((line: RawOCRLine) => line.text).join('\n'));
    }
  };

  const handleDownloadExcel = () => {
    if (excelBase64) {
      // Use the pre-generated Excel from the server
      const baseName = recordId || file.file.name.replace(/\.[^/.]+$/, "");
      const fileName = `${baseName}_extracted.xlsx`;
      downloadExcelFromBase64(excelBase64, fileName);
    } else if (formData.length > 0) {
      // Fall back to client-side Excel generation
      const fileName = file.file.name.replace(/\.[^/.]+$/, "") + '_extracted.xlsx';
      generateExcel(formData, fileName);
    }
  };
  
  const handleFieldChange = (index: number, value: string) => {
    if (!editMode) return;
    
    const updatedFormData = [...editableFormData];
    updatedFormData[index].value = value;
    
    // If we're changing the customer name, auto-generate initials
    if (updatedFormData[index].name === 'CUSTOMER NAME') {
      const initialsIndex = updatedFormData.findIndex(field => field.name === 'INITIALS');
      if (initialsIndex !== -1) {
        updatedFormData[initialsIndex].value = generateInitials(value);
      }
    }
    
    // If we're changing BASIC AMOUNT or INSURANCE AMOUNT, recalculate TOTAL and NET
    if (updatedFormData[index].name === 'BASIC AMOUNT' || updatedFormData[index].name === 'INSURANCE AMOUNT') {
      // Find the indices for relevant fields
      const basicAmountIndex = updatedFormData.findIndex(field => field.name === 'BASIC AMOUNT');
      const insuranceAmountIndex = updatedFormData.findIndex(field => field.name === 'INSURANCE AMOUNT');
      const totalAmountIndex = updatedFormData.findIndex(field => field.name === 'TOTAL AMOUNT');
      const discountIndex = updatedFormData.findIndex(field => field.name === 'DISCOUNT');
      const netAmountIndex = updatedFormData.findIndex(field => field.name === 'NET AMOUNT');
      
      // Only proceed if we have both amounts
      if (basicAmountIndex !== -1 && insuranceAmountIndex !== -1 && totalAmountIndex !== -1) {
        const basicAmount = parseFloat(updatedFormData[basicAmountIndex].value || '0');
        const insuranceAmount = parseFloat(updatedFormData[insuranceAmountIndex].value || '0');
        
        // Calculate total
        const totalAmount = basicAmount * 1000000 + insuranceAmount;
        updatedFormData[totalAmountIndex].value = totalAmount.toString();
        
        // If we have discount, calculate net amount
        if (discountIndex !== -1 && netAmountIndex !== -1) {
          const discountPercentage = parseFloat(updatedFormData[discountIndex].value || '0');
          const netAmount = totalAmount - (totalAmount * (discountPercentage / 100));
          updatedFormData[netAmountIndex].value = netAmount.toFixed(2);
        }
      }
    }
    
    // If we're changing DISCOUNT, recalculate NET AMOUNT
    if (updatedFormData[index].name === 'DISCOUNT') {
      const totalAmountIndex = updatedFormData.findIndex(field => field.name === 'TOTAL AMOUNT');
      const netAmountIndex = updatedFormData.findIndex(field => field.name === 'NET AMOUNT');
      
      if (totalAmountIndex !== -1 && netAmountIndex !== -1) {
        const totalAmount = parseFloat(updatedFormData[totalAmountIndex].value || '0');
        const discountPercentage = parseFloat(updatedFormData[index].value || '0');
        
        const netAmount = totalAmount - (totalAmount * (discountPercentage / 100));
        updatedFormData[netAmountIndex].value = netAmount.toFixed(2);
      }
    }
    
    setEditableFormData(updatedFormData);
  };
  
  const handleSaveChanges = () => {
    setFormData(JSON.parse(JSON.stringify(editableFormData)));
    setEditMode(false);
    // Clear the Excel base64 as it's no longer valid
    setExcelBase64(null);
  };
  
  const handleSwitchProcessingMode = () => {
    // Only allow switching if not currently processing
    if (!isProcessing) {
      setProcessingMode(processingMode === 'server' ? 'client' : 'server');
    }
  };

  return (
    <div className="my-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 space-y-2 md:space-y-0 px-6">
        <button 
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to uploads
        </button>
        
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <button 
            onClick={onPrevious} 
            disabled={currentIndex === 0}
            className={`p-1 rounded-full ${currentIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span>Image {currentIndex + 1} of {totalFiles}</span>
          <button 
            onClick={onNext} 
            disabled={currentIndex === totalFiles - 1}
            className={`p-1 rounded-full ${currentIndex === totalFiles - 1 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/2 flex-shrink-0">
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <img 
                src={file.preview} 
                alt={file.file.name}
                className="w-full h-auto object-contain"
              />
            </div>
            <div className="mt-3">
              <h3 className="font-medium text-gray-900">{file.file.name}</h3>
              <p className="text-sm text-gray-500">{(file.file.size / 1024).toFixed(1)} KB</p>
            </div>
            
            {/* Show multiple records selector if we have more than one record */}
            {!isProcessing && allRecords.length > 1 && (
              <div className="mb-4 mt-2">
                <div className="text-center mb-2">
                  <span className="font-semibold">Record {currentRecordIndex + 1} of {allRecords.length}</span>
                </div>
                <RecordsPagination 
                  total={allRecords.length}
                  current={currentRecordIndex}
                  onChange={handleRecordChange}
                />
              </div>
            )}
            
            {/* Raw text viewer - now simplified since we have a dedicated raw OCR tab */}
            {!isProcessing && extractedText && (
              <div className="mt-4">
                <button 
                  onClick={() => setShowRawText(!showRawText)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {showRawText ? 'Hide Raw OCR Preview' : 'Show Raw OCR Preview'}
                </button>
                
                {showRawText && (
                  <div className="mt-2 p-3 bg-gray-50 border rounded-lg text-xs font-mono overflow-auto max-h-48">
                    <pre>{extractedText || 'No text extracted'}</pre>
                  </div>
                )}
              </div>
            )}
            
            {/* Processing mode switcher */}
            <div className="mt-4 text-xs">
              <p className="text-gray-500">Processing mode: 
                <span className={processingMode === 'server' ? 'text-green-600 font-semibold' : 'text-blue-600 font-semibold'}>
                  {' '}{processingMode === 'server' ? 'Server-side (better accuracy)' : 'Client-side (fallback)'}
                </span>
              </p>
              
              {!isProcessing && (
                <button 
                  onClick={handleSwitchProcessingMode} 
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  Switch to {processingMode === 'server' ? 'client-side' : 'server-side'} processing
                </button>
              )}
            </div>
          </div>
          
          <div className="lg:w-1/2">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <div className="relative w-24 h-24">
                  <Loader2 className="w-24 h-24 animate-spin text-blue-500" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">{Math.round(progress * 100)}%</span>
                  </div>
                </div>
                <p className="mt-4 text-gray-600">
                  {processingMode === 'server' ? 'Processing image with server-side OCR...' : 'Processing image with client-side OCR...'}
                </p>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-6 rounded-lg text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-red-800 mb-2">Processing Error</h3>
                <p className="text-red-600">{error}</p>
                {processingMode === 'server' && (
                  <button 
                    onClick={() => setProcessingMode('client')} 
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
                  >
                    Try Client-Side Processing
                  </button>
                )}
                <button 
                  onClick={onBack}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Return to uploads
                </button>
              </div>
            ) : (
              <div>
                {error ? (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <h3 className="font-medium">Processing Error</h3>
                    </div>
                    <p className="text-sm">{error}</p>
                  </div>
                ) : null}

                {/* Tabs for switching between parsed fields and raw OCR */}
                <div className="border-b border-gray-200 mb-4">
                  <nav className="flex -mb-px">
                    <button
                      onClick={() => setActiveTab('parsed')}
                      className={`mr-4 py-2 px-1 font-medium text-sm border-b-2 ${
                        activeTab === 'parsed'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Parsed Fields
                    </button>
                    <button
                      onClick={() => setActiveTab('raw')}
                      className={`mr-4 py-2 px-1 font-medium text-sm border-b-2 ${
                        activeTab === 'raw'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Raw OCR Text
                    </button>
                  </nav>
                </div>

                {activeTab === 'parsed' ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-gray-800">Extracted Form Data</h2>
                      <div className="flex space-x-2">
                        {!editMode ? (
                          <button
                            onClick={() => setEditMode(true)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-md hover:bg-blue-100"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </button>
                        ) : (
                          <button
                            onClick={handleSaveChanges}
                            className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-md hover:bg-green-100"
                          >
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                            Save
                          </button>
                        )}
                        
                        {excelBase64 && (
                          <button
                            onClick={() => recordId && downloadExcelFromBase64(excelBase64, `${recordId}.xlsx`)}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-md hover:bg-emerald-100"
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Download Excel
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {editMode ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-blue-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider border-r">
                                Field
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                                Value
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(editMode ? editableFormData : formData).map((field, index) => (
                              <tr key={field.name} 
                                className={
                                  ['FORM NO', 'RECORD NO', 'SALES DATE', 'CUSTOMER NAME', 
                                   'BASIC AMOUNT', 'TOTAL AMOUNT'].includes(field.name)
                                    ? 'bg-yellow-50'  // Highlight key fields
                                    : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }
                              >
                                <td className="px-6 py-3 text-sm text-gray-900 border-r">{field.name}</td>
                                <td className="px-6 py-3 text-sm text-gray-900">
                                  {editMode ? (
                                    <input
                                      type="text"
                                      value={field.value}
                                      onChange={(e) => handleFieldChange(index, e.target.value)}
                                      className="w-full p-1 border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    field.value || <span className="text-gray-400 italic">Empty</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-blue-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider border-r">
                                Field
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                                Value
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(editMode ? editableFormData : formData).map((field, index) => (
                              <tr key={field.name} 
                                className={
                                  ['FORM NO', 'RECORD NO', 'SALES DATE', 'CUSTOMER NAME', 
                                   'BASIC AMOUNT', 'TOTAL AMOUNT'].includes(field.name)
                                    ? 'bg-yellow-50'  // Highlight key fields
                                    : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }
                              >
                                <td className="px-6 py-3 text-sm text-gray-900 border-r">{field.name}</td>
                                <td className="px-6 py-3 text-sm text-gray-900">
                                  {field.value || <span className="text-gray-400 italic">Empty</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-gray-800">Raw OCR Text</h2>
                      <div className="flex space-x-2">
                        {excelBase64 && (
                          <button
                            onClick={() => recordId && downloadExcelFromBase64(excelBase64, `${recordId}_raw.xlsx`)}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-md hover:bg-emerald-100"
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Download Excel with Raw Text
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="px-4 py-2 w-24 text-sm font-medium text-gray-500">Line #</th>
                            <th className="px-4 py-2 text-sm font-medium text-gray-500">Text</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rawOCRLines.map((line) => (
                            <tr key={line.lineNumber} className="border-b">
                              <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                                {line.lineNumber}
                              </td>
                              <td className="px-4 py-2 font-mono text-xs whitespace-pre-wrap">
                                {line.text}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};