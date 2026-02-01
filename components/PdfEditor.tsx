
import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { TextOverlay, PdfDocumentInfo } from '../types';
import TextBox from './TextBox';
import { exportPdfWithAnnotations } from '../services/pdfService';

// Consistent version across library and worker
const PDFJS_VERSION = '4.10.38';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

interface Props {
  pdfInfo: PdfDocumentInfo;
  triggerExport: number;
  onExportStart: () => void;
  onExportEnd: () => void;
}

const PdfEditor: React.FC<Props> = ({ pdfInfo, triggerExport, onExportStart, onExportEnd }) => {
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<TextOverlay | null>(null);
  const [renderScale, setRenderScale] = useState(1.5);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48;
        const newScale = Math.min(1.5, Math.max(0.6, containerWidth / 800));
        setRenderScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ 
          data: pdfInfo.bytes,
          cMapUrl: `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        
        if (active) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setOverlays([]); 
        }
      } catch (error) {
        console.error('Error loading PDF document:', error);
      }
    };
    loadPdf();
    return () => { active = false; };
  }, [pdfInfo]);

  useEffect(() => {
    if (triggerExport > 0 && pdfInfo) {
      const runExport = async () => {
        onExportStart();
        try {
          await exportPdfWithAnnotations(pdfInfo.bytes, overlays, pdfInfo.name);
        } catch (error: any) {
          console.error('Export failed:', error);
          alert(`Export failed: ${error.message}`);
        } finally {
          onExportEnd();
        }
      };
      runExport();
    }
  }, [triggerExport, overlays, pdfInfo, onExportStart, onExportEnd]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId) {
        const item = overlays.find(o => o.id === selectedId);
        if (item) setClipboard({ ...item });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
        const newOverlay: TextOverlay = {
          ...clipboard,
          id: `overlay-${Date.now()}`,
          x: clipboard.x + 2,
          y: clipboard.y + 2,
          isNew: true,
        };
        setOverlays(prev => [...prev, newOverlay]);
        setSelectedId(newOverlay.id);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (selectedId && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setOverlays(prev => prev.filter(o => o.id !== selectedId));
          setSelectedId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, clipboard, overlays]);

  const addOverlayAt = (pageNumber: number, xPercent: number, yPercent: number) => {
    const newOverlay: TextOverlay = {
      id: `overlay-${Date.now()}`,
      pageNumber,
      text: 'New Text',
      x: xPercent,
      y: yPercent,
      fontSize: 18,
      fontFamily: 'Helvetica',
      color: '#000000',
      isNew: true 
    };
    setOverlays(prev => [...prev, newOverlay]);
    setSelectedId(newOverlay.id);
  };

  const updateOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const deleteOverlay = (id: string) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  if (!pdfDoc && pdfInfo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium">Initializing PDF Engine...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-auto bg-gray-200 p-4 md:p-8 flex flex-col items-center space-y-12"
      onClick={() => setSelectedId(null)}
    >
      {Array.from({ length: numPages }).map((_, i) => (
        <PageItem
          key={`${pdfInfo.name}-page-${i + 1}`}
          pageNumber={i + 1}
          pdfDoc={pdfDoc}
          overlays={overlays.filter(o => o.pageNumber === i + 1)}
          addOverlay={addOverlayAt}
          updateOverlay={updateOverlay}
          deleteOverlay={deleteOverlay}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          scale={renderScale}
        />
      ))}
    </div>
  );
};

interface PageItemProps {
  pageNumber: number;
  pdfDoc: any;
  overlays: TextOverlay[];
  addOverlay: (pageNumber: number, x: number, y: number) => void;
  updateOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  deleteOverlay: (id: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  scale: number;
}

const PageItem: React.FC<PageItemProps> = ({ 
  pageNumber, pdfDoc, overlays, addOverlay, updateOverlay, deleteOverlay, selectedId, setSelectedId, scale 
}) => {
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

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        setDimensions({ width: viewport.width, height: viewport.height });

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        setIsRendered(true);
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      }
    };

    renderPage();
    return () => renderTaskRef.current?.cancel();
  }, [pdfDoc, pageNumber, scale]);

  const handlePageClick = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current && e.target !== canvasRef.current) return;
    e.stopPropagation();
    if (selectedId !== null) {
      setSelectedId(null);
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    addOverlay(pageNumber, x, y);
  };

  return (
    <div 
      ref={containerRef}
      className={`pdf-canvas-container bg-white relative transition-opacity duration-300 ${isRendered ? 'opacity-100' : 'opacity-0'}`}
      style={{ 
        width: dimensions.width || 'auto', 
        height: dimensions.height || 'auto',
      }}
      onClick={handlePageClick}
    >
      <canvas ref={canvasRef} className="block shadow-xl cursor-crosshair" />
      {isRendered && (
        <div className="text-overlay-layer">
          {overlays.map(overlay => (
            <TextBox
              key={overlay.id}
              overlay={overlay}
              isSelected={selectedId === overlay.id}
              onSelect={(e) => { e.stopPropagation(); setSelectedId(overlay.id); }}
              onUpdate={(updates) => updateOverlay(overlay.id, updates)}
              onDelete={() => deleteOverlay(overlay.id)}
              containerDimensions={dimensions}
              scale={scale}
            />
          ))}
        </div>
      )}
      <div className="absolute -top-7 left-0 px-2 py-0.5 bg-gray-800 text-white text-[10px] font-bold uppercase rounded-t-sm">
        Page {pageNumber}
      </div>
    </div>
  );
};

export default PdfEditor;
