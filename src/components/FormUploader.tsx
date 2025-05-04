import React, { useState, useCallback } from 'react';
import { ImagePlus, X, ChevronRight, Loader2, Upload, FileSpreadsheet } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { FileWithPreview } from '../types/file';
import { ImageProcessingView } from './ImageProcessingView';
import { processFormsWithBackend, downloadExcelFromBase64 } from '../utils/apiClient';

export const FormUploader: React.FC = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingResults, setProcessingResults] = useState<{
    totalFiles: number;
    processedFiles: number;
    totalRecords: number;
    success: boolean;
  } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: uuidv4()
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onDrop(droppedFiles);
    }
  }, [onDrop]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      onDrop(Array.from(selectedFiles));
    }
    
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  }, [onDrop]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const startProcessing = useCallback((index: number) => {
    setCurrentFileIndex(index);
  }, []);

  const handleProcessAllImages = async () => {
    if (files.length === 0) return;
    
    setIsProcessingAll(true);
    setProcessingProgress(0);
    setProcessingResults(null);
    
    try {
      // Extract the actual File objects
      const fileObjects = files.map(f => f.file);
      
      // Process all files with the backend
      const response = await processFormsWithBackend(fileObjects);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to process images');
      }
      
      // Calculate total records processed
      const totalRecords = response.results.reduce(
        (sum, result) => sum + (result.records ? result.records.length : 0), 
        0
      );
      
      // Set results summary
      setProcessingResults({
        totalFiles: fileObjects.length,
        processedFiles: response.results.length,
        totalRecords,
        success: true
      });
      
      // For each result, save the Excel files automatically
      response.results.forEach(result => {
        if (result.records && result.records.length > 0) {
          result.records.forEach((record, recordIndex) => {
            const fileName = `${result.filename.replace(/\.[^/.]+$/, "")}_record_${recordIndex + 1}.xlsx`;
            downloadExcelFromBase64(record.excelBuffer, fileName);
          });
        }
      });
    } catch (error) {
      console.error('Batch processing error:', error);
      setProcessingResults({
        totalFiles: files.length,
        processedFiles: 0,
        totalRecords: 0,
        success: false
      });
    } finally {
      setIsProcessingAll(false);
      setProcessingProgress(100);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-4">
      {currentFileIndex === -1 ? (
        <>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Form OCR Extractor</h1>
          
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center">
              <ImagePlus className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600 mb-2">Drag & drop form images here</p>
              <p className="text-gray-500 text-sm mb-4">Support for: JPG, PNG, PDF</p>
              
              <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Browse Files
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*,.pdf" 
                  multiple 
                  onChange={handleFileInput}
                />
              </label>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-800">Uploaded Images ({files.length})</h2>
                
                {files.length >= 2 && (
                  <button 
                    onClick={handleProcessAllImages}
                    disabled={isProcessingAll}
                    className={`inline-flex items-center px-4 py-2 ${
                      isProcessingAll
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white rounded-md transition-colors`}
                  >
                    {isProcessingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Process All Images
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {/* Show processing results summary if available */}
              {processingResults && (
                <div className={`p-4 mb-4 rounded-lg ${
                  processingResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <h3 className={`text-md font-medium ${
                    processingResults.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Batch Processing Results
                  </h3>
                  <div className="mt-2 text-sm">
                    <p className="text-gray-600">
                      {processingResults.success
                        ? `Successfully processed ${processingResults.processedFiles} file(s) and extracted ${processingResults.totalRecords} records.`
                        : "Failed to process files. Please try processing them individually or check the console for errors."}
                    </p>
                    {processingResults.success && processingResults.totalRecords > 0 && (
                      <p className="mt-1 text-green-600">
                        Excel files have been automatically downloaded.
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {files.map((file, index) => (
                  <div key={file.id} className="border rounded-lg overflow-hidden group">
                    <div className="relative aspect-square bg-gray-100">
                      <img 
                        src={file.preview} 
                        alt={file.file.name}
                        className="w-full h-full object-cover"
                      />
                      <button 
                        onClick={() => handleRemoveFile(file.id)}
                        className="absolute top-2 right-2 bg-white bg-opacity-70 p-1 rounded-full hover:bg-opacity-100 focus:outline-none"
                      >
                        <X className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                    
                    <div className="p-3 border-t">
                      <p className="text-sm text-gray-700 truncate">{file.file.name}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {(file.file.size / 1024).toFixed(1)} KB
                        </span>
                        <button 
                          onClick={() => startProcessing(index)}
                          className="inline-flex items-center px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                          <ChevronRight className="mr-1 h-3 w-3" />
                          Process
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <ImageProcessingView 
          file={files[currentFileIndex]} 
          onBack={() => setCurrentFileIndex(-1)}
          totalFiles={files.length}
          currentIndex={currentFileIndex}
          onNext={() => {
            if (currentFileIndex < files.length - 1) {
              setCurrentFileIndex(currentFileIndex + 1);
            }
          }}
          onPrevious={() => {
            if (currentFileIndex > 0) {
              setCurrentFileIndex(currentFileIndex - 1);
            }
          }}
        />
      )}
    </div>
  );
};