
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { FileUp, Download, Plus, FileText, X, ChevronUp, ChevronDown, GripVertical, MousePointer2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// --- Configuration & Constants ---
const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

type FontType = 'Helvetica' | 'Times-Roman' | 'Courier';
const FONTS: FontType[] = ['Helvetica', 'Times-Roman', 'Courier'];

interface TextOverlay {
  id: string;
  pageNumber: number;
  text: string;
  x: number; // Percent 0-100
  y: number; // Percent 0-100
  fontSize: number;
  fontFamily: FontType;
  color: string;
  isNew?: boolean;
}

// --- TextBox Component ---
const TextBox = ({ overlay, isSelected, onSelect, onUpdate, onDelete, containerDimensions, scale }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState(overlay.text);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const rafRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (overlay.isNew) setIsEditing(true); }, []);
  useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isEditing]);
  useEffect(() => { setTempText(overlay.text); }, [overlay.text]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing || (e.target as HTMLElement).closest('button')) return;
    onSelect();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, startX: overlay.x, startY: overlay.y };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDragging) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const dx = ((e.clientX - dragStartRef.current.x) / containerDimensions.width) * 100;
        const dy = ((e.clientY - dragStartRef.current.y) / containerDimensions.height) * 100;
        onUpdate({ 
          x: Math.min(Math.max(0, dragStartRef.current.startX + dx), 95), 
          y: Math.min(Math.max(2, dragStartRef.current.startY + dy), 100) 
        });
      });
    };
    const handleEnd = () => { setIsDragging(false); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    if (isDragging) { window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleEnd); }
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleEnd); };
  }, [isDragging, containerDimensions, onUpdate]);

  const getFontStyle = () => {
    switch(overlay.fontFamily) {
      case 'Times-Roman': return { fontFamily: '"Playfair Display", serif' };
      case 'Courier': return { fontFamily: '"Roboto Mono", monospace' };
      default: return { fontFamily: 'sans-serif' };
    }
  };

  const showControls = isSelected || isEditing;

  return (
    <div 
      className={`absolute text-box-item group ${showControls ? 'z-50' : 'z-10'}`}
      style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, transform: `translateY(calc(-100% + 10px))`, fontSize: `${overlay.fontSize * scale}px`, ...getFontStyle(), color: overlay.color }}
      onMouseDown={handleMouseDown} onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
    >
      <div className={`relative min-w-[60px] p-2 border-2 rounded transition-all flex items-start ${showControls ? 'border-blue-500 bg-white custom-shadow ring-2 ring-blue-100' : 'border-transparent group-hover:border-blue-300 group-hover:bg-white/60'} ${isDragging ? 'cursor-grabbing opacity-80 scale-105' : 'cursor-grab'}`}>
        {isEditing ? (
          <textarea 
            ref={inputRef} rows={1} className="w-full bg-transparent outline-none resize-none overflow-hidden leading-tight p-0 m-0 border-none block"
            value={tempText} onChange={(e) => setTempText(e.target.value)} 
            onBlur={() => { setIsEditing(false); onUpdate({ text: tempText, isNew: false }); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) e.currentTarget.blur(); }} 
          />
        ) : (
          <div className="whitespace-pre-wrap break-all pointer-events-none select-none p-0 m-0 block" style={{ lineHeight: '1.25' }}>{overlay.text || <span className="italic text-gray-400">Empty</span>}</div>
        )}

        {showControls && !isDragging && (
          <div className="absolute -top-12 left-0 flex items-center bg-gray-900 text-white rounded-lg shadow-2xl px-2 py-1 space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <select value={overlay.fontFamily} onMouseDown={(e) => e.stopPropagation()} onChange={(e) => onUpdate({ fontFamily: e.target.value as FontType })} className="bg-transparent border-none text-xs text-white outline-none cursor-pointer hover:bg-white/10 px-1 rounded py-0.5">
              {FONTS.map(f => <option key={f} value={f} className="bg-gray-800">{f}</option>)}
            </select>
            <div className="w-[1px] h-4 bg-gray-700 mx-1" />
            <div className="flex items-center space-x-1" onMouseDown={(e) => e.stopPropagation()}>
              <button onClick={(e) => { e.stopPropagation(); onUpdate({ fontSize: Math.max(8, overlay.fontSize - 1) }) }} className="hover:bg-white/20 rounded p-0.5"><ChevronDown className="w-3 h-3" /></button>
              <span className="text-[10px] w-4 text-center font-mono">{overlay.fontSize}</span>
              <button onClick={(e) => { e.stopPropagation(); onUpdate({ fontSize: Math.min(72, overlay.fontSize + 1) }) }} className="hover:bg-white/20 rounded p-0.5"><ChevronUp className="w-3 h-3" /></button>
            </div>
            <div className="w-[1px] h-4 bg-gray-700 mx-1" /><GripVertical className="w-3 h-3 text-gray-500" />
          </div>
        )}

        <button 
          className={`absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-all z-[60] ${showControls ? 'scale-100 opacity-100' : 'scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100'}`}
          onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <X className="w-3 h-3 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};

// --- PageItem Component ---
const PageItem = ({ pageNumber, pdfDoc, overlays, addOverlay, updateOverlay, deleteOverlay, selectedId, setSelectedId, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isRendered, setIsRendered] = useState(false);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (!pdfDoc) return;
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;
        canvas.height = viewport.height; canvas.width = viewport.width;
        setDimensions({ width: viewport.width, height: viewport.height });
        if (renderTaskRef.current) renderTaskRef.current.cancel();
        renderTaskRef.current = page.render({ canvasContext: context, viewport: viewport });
        await renderTaskRef.current.promise;
        setIsRendered(true);
      } catch (err) {}
    };
    renderPage();
    return () => renderTaskRef.current?.cancel();
  }, [pdfDoc, pageNumber, scale]);

  const handlePageClick = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current && e.target !== canvasRef.current) return;
    e.stopPropagation();
    if (selectedId !== null) { setSelectedId(null); return; }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    addOverlay(pageNumber, ((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100);
  };

  return (
    <div 
      ref={containerRef} className={`pdf-canvas-container bg-white relative transition-opacity duration-300 ${isRendered ? 'opacity-100' : 'opacity-0'}`}
      style={{ width: dimensions.width || 'auto', height: dimensions.height || 'auto' }} onClick={handlePageClick}
    >
      <canvas ref={canvasRef} className="block cursor-crosshair" />
      {isRendered && (
        <div className="text-overlay-layer">
          {overlays.map(o => (
            <TextBox key={o.id} overlay={o} isSelected={selectedId === o.id} onSelect={() => setSelectedId(o.id)} onUpdate={(u) => updateOverlay(o.id, u)} onDelete={() => deleteOverlay(o.id)} containerDimensions={dimensions} scale={scale} />
          ))}
        </div>
      )}
      <div className="absolute -top-7 left-0 px-2 py-0.5 bg-gray-800 text-white text-[10px] font-bold uppercase rounded-t-sm shadow-sm">Page {pageNumber}</div>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  const [pdfInfo, setPdfInfo] = useState<any>(null);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [clipboard, setClipboard] = useState<TextOverlay | null>(null);
  const [renderScale, setRenderScale] = useState(1.5);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => { if (containerRef.current) setRenderScale(Math.min(1.5, Math.max(0.6, (containerRef.current.clientWidth - 48) / 800))); };
    updateScale(); window.addEventListener('resize', updateScale); return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId && !isInput) {
        const item = overlays.find(o => o.id === selectedId);
        if (item) setClipboard({ ...item });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard && !isInput) {
        const newOverlay = { ...clipboard, id: `overlay-${Date.now()}`, x: clipboard.x + 2, y: clipboard.y + 2, isNew: true };
        setOverlays(prev => [...prev, newOverlay]); setSelectedId(newOverlay.id);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !isInput) {
        setOverlays(prev => prev.filter(o => o.id !== selectedId)); setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, clipboard, overlays]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    setPdfInfo({ name: file.name, bytes });
    const loadingTask = pdfjsLib.getDocument({ data: bytes, cMapUrl: `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`, cMapPacked: true });
    const pdf = await loadingTask.promise;
    setPdfDoc(pdf); setOverlays([]); setSelectedId(null);
  };

  const handleExport = async () => {
    if (!pdfInfo) return;
    setIsExporting(true);
    try {
      const doc = await PDFDocument.load(pdfInfo.bytes.slice(0));
      const pages = doc.getPages();
      const fonts = {
        'Helvetica': await doc.embedFont(StandardFonts.Helvetica),
        'Times-Roman': await doc.embedFont(StandardFonts.TimesRoman),
        'Courier': await doc.embedFont(StandardFonts.Courier)
      };

      for (const overlay of overlays) {
        const pageIndex = overlay.pageNumber - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;
        const page = pages[pageIndex];
        const { width, height } = page.getSize();
        const x = (overlay.x / 100) * width;
        const y = height - ((overlay.y / 100) * height);
        if (overlay.text.trim()) {
          page.drawText(overlay.text, {
            x, y, size: overlay.fontSize, font: fonts[overlay.fontFamily], 
            color: rgb(0, 0, 0), lineHeight: overlay.fontSize * 1.25
          });
        }
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `annotated-${pdfInfo.name}`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) { alert(`Export failed: ${err.message}`); }
    finally { setIsExporting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-blue-200 shadow-lg">
            <FileText className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">PDF Annotator Pro</h1>
        </div>
        <div className="flex items-center space-x-4">
          {!pdfDoc ? (
            <label className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all font-semibold">
              <FileUp className="w-4 h-4 mr-2" />
              <span>Open PDF</span>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            </label>
          ) : (
            <>
              <span className="hidden lg:inline text-sm text-gray-500 max-w-xs truncate font-medium bg-gray-100 px-3 py-1.5 rounded-full">{pdfInfo.name}</span>
              <button onClick={handleExport} disabled={isExporting} className="flex items-center px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-100 transition-all font-semibold">
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Save As PDF'}
              </button>
              <label className="flex items-center px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all font-semibold">
                <FileUp className="w-4 h-4 mr-2" />
                <span>Replace</span>
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
              </label>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col">
        {!pdfDoc ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="bg-blue-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
              <MousePointer2 className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-3xl font-extrabold mb-4 text-gray-900">Professional PDF Editing</h2>
            <p className="text-gray-500 mb-10 max-w-md mx-auto text-lg leading-relaxed">Simply upload your document and click anywhere to add high-fidelity text annotations.</p>
            <label className="inline-flex items-center px-10 py-5 bg-blue-600 text-white text-xl font-bold rounded-2xl cursor-pointer hover:bg-blue-700 shadow-xl shadow-blue-200 transform hover:-translate-y-1 transition-all">
              <FileUp className="w-7 h-7 mr-3" />
              Start Annotating
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          <div ref={containerRef} className="flex-1 overflow-auto bg-gray-200/50 p-6 md:p-12 flex flex-col items-center space-y-16" onClick={() => setSelectedId(null)}>
            {Array.from({ length: pdfDoc.numPages }).map((_, i) => (
              <PageItem key={i} pageNumber={i + 1} pdfDoc={pdfDoc} overlays={overlays.filter(o => o.pageNumber === i + 1)} addOverlay={(p, x, y) => { const o: TextOverlay = { id: `overlay-${Date.now()}`, pageNumber: p, text: 'New Text', x, y, fontSize: 18, fontFamily: 'Helvetica', color: '#000000', isNew: true }; setOverlays(v => [...v, o]); setSelectedId(o.id); }} updateOverlay={(id, u) => setOverlays(v => v.map(o => o.id === id ? { ...o, ...u } : o))} deleteOverlay={(id) => setOverlays(v => v.filter(o => o.id !== id))} selectedId={selectedId} setSelectedId={setSelectedId} scale={renderScale} />
            ))}
          </div>
        )}
      </main>

      {pdfDoc && (
        <footer className="bg-white border-t border-gray-100 py-3 px-6 text-center text-xs text-gray-400 flex items-center justify-center space-x-8">
          <div className="flex items-center"><kbd className="px-1.5 py-0.5 bg-gray-50 border rounded-md mr-1.5 text-gray-500 font-bold">Click</kbd> Add Text</div>
          <div className="flex items-center"><kbd className="px-1.5 py-0.5 bg-gray-50 border rounded-md mr-1.5 text-gray-500 font-bold">Double Click</kbd> Edit</div>
          <div className="flex items-center"><kbd className="px-1.5 py-0.5 bg-gray-50 border rounded-md mr-1.5 text-gray-500 font-bold">Ctrl+C/V</kbd> Copy/Paste</div>
          <div className="flex items-center"><kbd className="px-1.5 py-0.5 bg-gray-50 border rounded-md mr-1.5 text-gray-500 font-bold">Del</kbd> Remove</div>
        </footer>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
