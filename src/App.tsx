import React from 'react';
import { FormUploader } from './components/FormUploader';
import { AppHeader } from './components/AppHeader';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <FormUploader />
      </main>
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Form OCR Application - All processing happens in your browser
        </div>
      </footer>
    </div>
  );
}

export default App;