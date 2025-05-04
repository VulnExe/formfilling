import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

export const AppHeader: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <div className="flex items-center">
          <FileSpreadsheet className="h-8 w-8 text-blue-500 mr-3" />
          <h1 className="text-xl font-semibold text-gray-800">Form OCR Extractor</h1>
        </div>
        <div className="ml-auto hidden md:flex space-x-4">
          <span className="text-gray-600 flex items-center">
            Client-side processing • No data leaves your browser
          </span>
        </div>
      </div>
    </header>
  );
};