import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, ImageIcon, Check, MousePointer2, Sparkles, CheckSquare, Square } from 'lucide-react';
import { ThemeTokens } from '../types';
import { extractPaletteFromImage } from '../utils/colorUtils';

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (palette: string[]) => void;
  theme: ThemeTokens;
  isDark?: boolean;
}

const SLOT_COUNT = 10;
// Order matches the color palette UI (SwatchStrip)
const SLOT_LABELS = ['BG', 'Card', 'Text', 'TextMuted', 'TextOnClr', 'Primary', 'Secondary', 'Accent', 'Good', 'Bad'];
const DEFAULT_CHECKED = new Array(SLOT_COUNT).fill(true);

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({ isOpen, onClose, onConfirm, theme, isDark = false }) => {
  const [mounted, setMounted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedPalette, setExtractedPalette] = useState<string[]>([]);
  const [checkedSlots, setCheckedSlots] = useState<boolean[]>(DEFAULT_CHECKED);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setPreviewUrl(null);
      setExtractedPalette([]);
      setSelectedIndex(0);
      setCheckedSlots([...DEFAULT_CHECKED]);
    } else {
      setTimeout(() => setMounted(false), 300);
    }
  }, [isOpen]);

  // Handle Paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) handleFile(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);

      const palette = await extractPaletteFromImage(file, isDark);
      setExtractedPalette(palette.slice(0, SLOT_COUNT));
      setSelectedIndex(0);
      setCheckedSlots([...DEFAULT_CHECKED]);
    } catch (err) {
      console.error('Error processing image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || extractedPalette.length === 0) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const data = ctx.getImageData(x, y, 1, 1).data;
      const r = data[0];
      const g = data[1];
      const b = data[2];
      const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

      setExtractedPalette(prev => {
        const next = [...prev];
        next[selectedIndex] = hex;
        return next;
      });
      const nextChecked = [...checkedSlots];
      nextChecked[selectedIndex] = true;
      setCheckedSlots(nextChecked);
    }
  };

  const toggleSlot = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextChecked = [...checkedSlots];
    nextChecked[idx] = !nextChecked[idx];
    setCheckedSlots(nextChecked);
  };

  const handleConfirm = () => {
    const paletteToImport = extractedPalette.map((c, i) => checkedSlots[i] ? c : '');
    onConfirm(paletteToImport);
  };

  useEffect(() => {
    if (previewUrl && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > h) { if (w > maxDim) { h *= maxDim / w; w = maxDim; } }
        else { if (h > maxDim) { w *= maxDim / h; h = maxDim; } }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
      };
      img.src = previewUrl;
    }
  }, [previewUrl]);

  if (!mounted && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 flex flex-col max-h-[90vh] ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        style={{ backgroundColor: theme.card, color: theme.text, borderColor: theme.border, borderWidth: 1 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b flex items-center justify-between shrink-0" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: theme.primary, color: theme.primaryFg }}>
                 <ImageIcon size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold leading-tight">Pick from Image</h2>
                <p className="text-sm opacity-60 font-medium">Extract palette from colors</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover-themed transition-colors" style={{ color: theme.textMuted }}>
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col no-scrollbar">
          {!previewUrl ? (
            <div
              className={`flex-1 min-h-[350px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 transition-all relative ${dragActive ? 'scale-[1.02]' : 'opacity-80'}`}
              style={{ borderColor: dragActive ? theme.primary : theme.border, backgroundColor: theme.card2 }}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                <Upload size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-center">Drop image here, paste, or browse</h3>
              <p className="text-sm opacity-60 text-center mb-8 max-w-xs">Upload a screenshot or photo to generate a theme based on its colors.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg"
                style={{ backgroundColor: theme.primary, color: theme.primaryFg }}
              >
                Choose Image
              </button>
              <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleFile(e.target.files[0])} className="hidden" accept="image/*" />
              <div className="mt-8 text-xs font-medium opacity-40 uppercase tracking-widest flex items-center gap-2">
                <span className="h-px w-8 bg-current"></span>
                <span>or paste screenshot (Cmd+V)</span>
                <span className="h-px w-8 bg-current"></span>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="relative rounded-2xl overflow-hidden border shadow-inner group" style={{ borderColor: theme.border }}>
                <canvas ref={canvasRef} onClick={handleCanvasClick} className="w-full h-auto cursor-crosshair block" />
                <div className="absolute top-4 left-4 backdrop-blur-md text-xs px-3 py-1.5 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5" style={{ backgroundColor: `${theme.bg}D9`, color: theme.text }}>
                  <MousePointer2 size={12} />
                  Click image to pick color for selected slot
                </div>
              </div>

              {/* Palette Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-50 tracking-wider">
                    <Sparkles size={12} />
                    Extracted Palette (Checked are imported)
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {extractedPalette.map((color, idx) => (
                    <div key={`${color}-${idx}`} className="relative group">
                      <button
                        onClick={() => setSelectedIndex(idx)}
                        className={`w-full h-14 rounded-lg transition-all relative overflow-hidden border ${selectedIndex === idx ? 'ring-3 ring-offset-2 scale-95 shadow-xl' : 'hover:scale-105 hover:shadow-md'} ${!checkedSlots[idx] ? 'opacity-40 grayscale-[0.5]' : ''}`}
                        style={{
                          backgroundColor: color,
                          borderColor: theme.border,
                          // @ts-ignore
                          '--ring-offset-color': theme.card,
                          outlineColor: theme.primary
                        }}
                      >
                        <div className={`absolute bottom-0 left-0 right-0 py-0.5 text-[9px] font-bold text-center ${selectedIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} style={{ backgroundColor: `${theme.bg}99`, color: theme.text }}>
                          {SLOT_LABELS[idx]}
                        </div>
                      </button>
                      <button
                        onClick={(e) => toggleSlot(idx, e)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full shadow-lg border flex items-center justify-center transition-all active:scale-90 hover-themed z-10"
                        style={{ backgroundColor: theme.card, color: checkedSlots[idx] ? theme.primary : theme.textMuted, borderColor: theme.border }}
                      >
                        {checkedSlots[idx] ? <CheckSquare size={12} fill="currentColor" /> : <Square size={12} />}
                        {checkedSlots[idx] && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Check size={10} style={{ color: theme.primaryFg }} />
                            </div>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl border" style={{ backgroundColor: theme.card2, borderColor: theme.border }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl shadow-lg border-2" style={{ backgroundColor: extractedPalette[selectedIndex], borderColor: `${theme.border}40` }} />
                  <div>
                    <h4 className="font-bold text-xs uppercase opacity-50 tracking-wider">{SLOT_LABELS[selectedIndex]}</h4>
                    <p className="text-xl font-mono font-bold">{extractedPalette[selectedIndex]}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setPreviewUrl(null)} className="px-5 py-2.5 rounded-xl font-bold transition-all hover-themed">Reset</button>
                  <button
                    onClick={handleConfirm}
                    disabled={checkedSlots.every(s => !s) || isProcessing}
                    className="px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg disabled:opacity-50"
                    style={{ backgroundColor: theme.primary, color: theme.primaryFg }}
                  >
                    <Check size={20} />
                    Import Selection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImagePickerModal;
