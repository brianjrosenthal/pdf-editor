
import React, { useState, useCallback } from 'react';
import { FileUp, Download, Plus, FileText, Info } from 'lucide-react';
import PdfEditor from './components/PdfEditor';
import { PdfDocumentInfo } from './types';

const App: React.FC = () => {
  const [pdfInfo, setPdfInfo] = useState<PdfDocumentInfo | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [triggerExport, setTriggerExport] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));

    setPdfInfo({
      name: file.name,
      url,
      numPages: 0, // Will be updated by PdfEditor
      bytes
    });
  };

  const handleExport = () => {
    setTriggerExport(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <FileText className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-800">PDF Annotator Pro</h1>
        </div>

        <div className="flex items-center space-x-4">
          {!pdfInfo ? (
            <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
              <FileUp className="w-4 h-4 mr-2" />
              <span>Upload PDF</span>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            </label>
          ) : (
            <>
              <span className="hidden md:inline text-sm text-gray-500 max-w-xs truncate font-medium">
                {pdfInfo.name}
              </span>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <label className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-200 transition-colors font-medium">
                <FileUp className="w-4 h-4 mr-2" />
                <span>Replace</span>
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
              </label>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {!pdfInfo ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-md text-center">
              <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-gray-800">Ready to annotate?</h2>
              <p className="text-gray-600 mb-8">
                Upload a PDF to start adding custom text boxes. Move them, resize them, and export when you're done.
              </p>
              <label className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                <FileUp className="w-6 h-6 mr-3" />
                Choose PDF File
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        ) : (
          <PdfEditor 
            pdfInfo={pdfInfo} 
            triggerExport={triggerExport}
            onExportStart={() => setIsExporting(true)}
            onExportEnd={() => setIsExporting(false)}
          />
        )}
      </main>

      {/* Footer / Instructions */}
      {pdfInfo && (
        <div className="bg-white border-t border-gray-200 p-2 text-center text-xs text-gray-500 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded shadow-sm">Click</kbd> to add text
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded shadow-sm">Ctrl+C / V</kbd> to copy/paste
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded shadow-sm">Drag</kbd> to reposition
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
