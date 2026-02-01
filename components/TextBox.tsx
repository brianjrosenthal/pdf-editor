
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { TextOverlay, FontType } from '../types';

interface Props {
  overlay: TextOverlay;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent | React.TouchEvent) => void;
  onUpdate: (updates: Partial<TextOverlay>) => void;
  onDelete: () => void;
  containerDimensions: { width: number, height: number };
  scale: number;
}

const FONTS: FontType[] = ['Helvetica', 'Times-Roman', 'Courier'];

const TextBox: React.FC<Props> = ({ 
  overlay, isSelected, onSelect, onUpdate, onDelete, containerDimensions, scale 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState(overlay.text);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const rafRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [tempText, isEditing]);

  useEffect(() => {
    if (overlay.isNew) {
      setIsEditing(true);
    }
  }, []);

  const startDrag = (clientX: number, clientY: number) => {
    if (isEditing) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startX: overlay.x,
      startY: overlay.y
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    if ((e.target as HTMLElement).closest('button')) return;

    onSelect(e);
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    if ((e.target as HTMLElement).closest('button')) return;

    onSelect(e);
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const dx = ((clientX - dragStartRef.current.x) / containerDimensions.width) * 100;
      const dy = ((clientY - dragStartRef.current.y) / containerDimensions.height) * 100;

      onUpdate({
        x: Math.min(Math.max(0, dragStartRef.current.startX + dx), 95),
        y: Math.min(Math.max(2, dragStartRef.current.startY + dy), 100),
      });
    });
  }, [isDragging, containerDimensions, onUpdate]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setTempText(overlay.text);
  }, [overlay.text]);

  const getFontStyle = () => {
    switch(overlay.fontFamily) {
      case 'Times-Roman': return { fontFamily: '"Playfair Display", serif' };
      case 'Courier': return { fontFamily: '"Roboto Mono", monospace' };
      default: return { fontFamily: 'sans-serif' };
    }
  };

  const showControls = isSelected || isEditing;
  const visualFontSize = overlay.fontSize * scale;
  const paddingOffset = 10; 

  return (
    <div
      className={`absolute text-box-item group ${showControls ? 'z-50' : 'z-10'}`}
      style={{
        left: `${overlay.x}%`,
        top: `${overlay.y}%`,
        transform: `translateY(calc(-100% + ${paddingOffset}px))`, 
        fontSize: `${visualFontSize}px`,
        ...getFontStyle(),
        color: overlay.color,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={(e) => { 
        e.stopPropagation(); 
        setIsEditing(true); 
      }}
    >
      <div 
        className={`relative min-w-[60px] p-2 border-2 rounded transition-all flex items-start
          ${showControls ? 'border-blue-500 bg-white shadow-xl ring-2 ring-blue-100' : 'border-transparent group-hover:border-blue-300 group-hover:bg-white/60'}
          ${isDragging ? 'cursor-grabbing opacity-80 scale-105' : 'cursor-grab'}
        `}
      >
        {isEditing ? (
          <textarea
            ref={inputRef}
            rows={1}
            className="w-full bg-transparent outline-none resize-none overflow-hidden leading-tight p-0 m-0 border-none block appearance-none"
            value={tempText}
            onChange={(e) => setTempText(e.target.value)}
            onBlur={() => {
              setIsEditing(false);
              onUpdate({ text: tempText, isNew: false });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.currentTarget.blur();
              }
            }}
            style={{ 
              fontSize: 'inherit', 
              lineHeight: '1.25',
              height: 'auto'
            }}
          />
        ) : (
          <div 
            className="whitespace-pre-wrap break-all pointer-events-none select-none p-0 m-0 block"
            style={{ lineHeight: '1.25' }}
          >
            {overlay.text || <span className="italic text-gray-400">Empty</span>}
          </div>
        )}

        {showControls && !isDragging && (
          <div className="absolute -top-12 left-0 flex items-center bg-gray-900 text-white rounded-lg shadow-xl px-2 py-1 space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <select 
              value={overlay.fontFamily}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => onUpdate({ fontFamily: e.target.value as FontType })}
              className="bg-transparent border-none text-xs text-white outline-none cursor-pointer hover:bg-white/10 px-1 rounded py-0.5"
            >
              {FONTS.map(f => <option key={f} value={f} className="bg-gray-800">{f}</option>)}
            </select>
            
            <div className="w-[1px] h-4 bg-gray-700 mx-1" />

            <div className="flex items-center space-x-1" onMouseDown={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdate({ fontSize: Math.max(8, overlay.fontSize - 1) }) }}
                className="hover:bg-white/20 rounded p-0.5 transition-colors"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
              <span className="text-[10px] w-4 text-center font-mono">{overlay.fontSize}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdate({ fontSize: Math.min(72, overlay.fontSize + 1) }) }}
                className="hover:bg-white/20 rounded p-0.5 transition-colors"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
            </div>

            <div className="w-[1px] h-4 bg-gray-700 mx-1" />
            <GripVertical className="w-3 h-3 text-gray-500" />
          </div>
        )}

        <button
          className={`absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-all z-[60]
            ${showControls ? 'scale-100 opacity-100' : 'scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100'}
          `}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { 
            e.stopPropagation(); 
            onDelete(); 
          }}
          aria-label="Remove text box"
        >
          <X className="w-3 h-3 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};

export default TextBox;
