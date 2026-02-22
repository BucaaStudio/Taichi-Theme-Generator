import React, { useState, useEffect } from 'react';
import { ThemeTokens, ColorFormat, LockedColors } from '../types';
import { formatColor, parseToHex, hexToRgb } from '../utils/colorUtils';
import { Copy, Check, Lock, Unlock } from 'lucide-react';

// Editable Input Component
const EditableColorValue: React.FC<{
  value: string;
  onChange: (val: string) => void;
  color: string;
}> = ({ value, onChange, color }) => {
  const [localVal, setLocalVal] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) setLocalVal(value);
  }, [value, isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localVal !== value) {
      onChange(localVal);
    }
  };

  return (
    <input 
      type="text"
      value={localVal}
      onFocus={() => setIsEditing(true)}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        e.stopPropagation(); // Stop propagation to prevent Color Picker specific open
        e.preventDefault(); // Ensure focus lands here
      }}
      className="text-[8px] font-mono font-medium bg-transparent border-none p-0 text-center w-full focus:ring-0 truncate px-1 relative z-20 pointer-events-auto"
      style={{ color: color }}
    />
  );
};

interface SwatchStripProps {
  light: ThemeTokens;
  dark: ThemeTokens;
  format: ColorFormat;
  onFormatChange: (fmt: ColorFormat) => void;
  isDarkUI: boolean;
  onUpdate: (side: 'light' | 'dark', key: keyof ThemeTokens, value: string) => void;
  lockedColors: LockedColors;
  onToggleLock: (key: keyof ThemeTokens) => void;
}

interface CompactSwatchProps {
  tokenKey: string;
  lightHex: string;
  darkHex: string;
  format: ColorFormat;
  onUpdate: (side: 'light' | 'dark', key: keyof ThemeTokens, value: string) => void;
  isLocked: boolean;
  onToggleLock: () => void;
}

// Helper to get contrasting text color
const getContrastColor = (hex: string): string => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

// Helper to get short color value
const getShortValue = (hex: string, format: ColorFormat): string => {
  const full = formatColor(hex, format);
  // For compact display, extract just the values
  // For compact display, extract just the values
  if (format === 'hex') return hex.toUpperCase().slice(1); // Remove #
  
  if (full.startsWith('rgb(')) return full.slice(4, -1).replace(/\s/g, '');
  
  if (full.startsWith('hsl(')) {
    const match = full.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) return `${match[1]} ${match[2]} ${match[3]}`;
  }
  
  if (full.startsWith('cmyk(')) {
     const match = full.match(/cmyk\((\d+)%,\s*(\d+)%,\s*(\d+)%,\s*(\d+)%\)/);
     if (match) return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  
  // Modern CSS colors (space separated)
  if (full.startsWith('lab(')) {
     return full.slice(4, -1).replace(/%/g, ''); // "50.1 20 30"
  }
  
  if (full.startsWith('lch(')) {
     return full.slice(4, -1).replace(/%/g, '');
  }
  
  if (full.startsWith('oklch(')) {
     return full.slice(6, -1).replace(/%/g, '');
  }
  
  if (full.startsWith('color(display-p3')) {
     const parts = full.match(/([\d\.]+)/g);
     if (parts && parts.length >= 3) {
        // Return R G B (abbreviated)
        return `P3 ${parseFloat(parts[0]).toFixed(2)} ${parseFloat(parts[1]).toFixed(2)} ${parseFloat(parts[2]).toFixed(2)}`;
     }
  }

  return hex.toUpperCase().slice(1);
};

const CompactSwatch: React.FC<CompactSwatchProps> = ({ 
  tokenKey, 
  lightHex, 
  darkHex, 
  format, 
  onUpdate,
  isLocked,
  onToggleLock
}) => {
  const [copied, setCopied] = useState<'light' | 'dark' | null>(null);

  const handleClick = (hex: string, side: 'light' | 'dark', e: React.MouseEvent) => {
    // Alt/Option + Click to Copy
    if (e.altKey || e.metaKey) {
      e.stopPropagation();
      const val = formatColor(hex, format);
      navigator.clipboard.writeText(val);
      setCopied(side);
      setTimeout(() => setCopied(null), 1500);
      return;
    }
    
    // Normal Click: Color Picker handled by hidden input
    // The input click will propagate and open the picker
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'light' | 'dark') => {
    onUpdate(side, tokenKey as keyof ThemeTokens, e.target.value);
  };

  const lightContrast = getContrastColor(lightHex);
  const darkContrast = getContrastColor(darkHex);
  const lightShort = getShortValue(lightHex, format);
  const darkShort = getShortValue(darkHex, format);

  return (
    <div className="flex flex-col rounded-lg overflow-hidden border border-themed group/token transition-all hover:scale-[1.02] hover:shadow-md">
      {/* Header with token name and lock */}
      <div className="flex items-center justify-between px-2 py-1 bg-t-card text-[9px] font-bold uppercase tracking-wider text-t-text/70">
        <span className="truncate">{tokenKey}</span>
        <button
          onClick={onToggleLock}
          className={`transition-opacity p-0.5 rounded hover:bg-t-text/10 ${isLocked ? 'opacity-100' : 'opacity-0 group-hover/token:opacity-100'}`}
          title={isLocked ? 'Unlock color' : 'Lock color'}
        >
          {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
        </button>
      </div>
      
      {/* Color swatches side by side */}
      <div className="flex flex-1">
        {/* Light swatch */}
        <div
          className="flex-1 h-12 relative flex items-center justify-center cursor-pointer transition-all"
          style={{ backgroundColor: lightHex }}
          title={`Light: ${formatColor(lightHex, format)}\nClick to edit, Alt+Click to copy`}
          onClick={(e) => handleClick(lightHex, 'light', e)}
        >
          <input 
            type="color" 
            value={lightHex} 
            onChange={(e) => handleColorChange(e, 'light')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onClick={(e) => {
              if (e.altKey || e.metaKey) e.preventDefault(); // Prevent picker on copy
            }}
          />
          {copied === 'light' ? (
            <Check size={14} style={{ color: lightContrast }} strokeWidth={3} />
          ) : (
            <EditableColorValue 
              value={lightShort} 
              onChange={(val) => {
                 const newHex = parseToHex(val, format);
                 if (newHex) onUpdate('light', tokenKey as keyof ThemeTokens, newHex);
              }}
              color={lightContrast}
            />
          )}
        </div>
        
        {/* Dark swatch */}
        <div
          className="flex-1 h-12 relative flex items-center justify-center cursor-pointer transition-all"
          style={{ backgroundColor: darkHex }}
          title={`Dark: ${formatColor(darkHex, format)}\nClick to edit, Alt+Click to copy`}
          onClick={(e) => handleClick(darkHex, 'dark', e)}
        >
          <input 
            type="color" 
            value={darkHex} 
            onChange={(e) => handleColorChange(e, 'dark')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onClick={(e) => {
              if (e.altKey || e.metaKey) e.preventDefault(); // Prevent picker on copy
            }}
          />
          {copied === 'dark' ? (
            <Check size={14} style={{ color: darkContrast }} strokeWidth={3} />
          ) : (
            <EditableColorValue 
              value={darkShort} 
              onChange={(val) => {
                 const newHex = parseToHex(val, format);
                 if (newHex) onUpdate('dark', tokenKey as keyof ThemeTokens, newHex);
              }}
              color={darkContrast}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const SwatchStrip: React.FC<SwatchStripProps> = ({ light, dark, format, isDarkUI, onUpdate, lockedColors, onToggleLock }) => {
  // Use theme colors for background
  const themeTokens = isDarkUI ? dark : light;
  
  // 10 tokens to display
  const tokens = ['bg', 'card', 'text', 'textMuted', 'textOnColor', 'primary', 'secondary', 'accent', 'good', 'bad'];

  // CSS Variables for theme colors
  const styleVars = {
    '--bg': themeTokens.bg,
    '--card': themeTokens.card,
    '--card2': themeTokens.card2,
    '--text': themeTokens.text,
    '--text-muted': themeTokens.textMuted,
    '--text-on-color': themeTokens.textOnColor,
    '--primary': themeTokens.primary,
    '--primary-fg': themeTokens.primaryFg,
    '--secondary': themeTokens.secondary,
    '--secondary-fg': themeTokens.secondaryFg,
    '--accent': themeTokens.accent,
    '--accent-fg': themeTokens.accentFg,
    '--border': themeTokens.border,
    '--ring': themeTokens.ring,
    '--good': themeTokens.good,
    '--good-fg': themeTokens.goodFg,
    '--warn': themeTokens.warn,
    '--warn-fg': themeTokens.warnFg,
    '--bad': themeTokens.bad,
    '--bad-fg': themeTokens.badFg,
    backgroundColor: themeTokens.bg
  } as React.CSSProperties;

  return (
    <div 
      className="sticky top-0 z-40 backdrop-blur-md border-b border-themed py-2 px-3 shadow-sm transition-colors duration-300"
      style={styleVars}
    >
      <div className="max-w-[1920px] mx-auto w-full">
        {/* Compact grid: 5 columns on large, 5 on medium, 2 on mobile - fits 10 swatches */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 w-full">
          {tokens.map(key => (
            <CompactSwatch 
              key={key}
              tokenKey={key} 
              lightHex={light[key as keyof ThemeTokens]} 
              darkHex={dark[key as keyof ThemeTokens]} 
              format={format} 
              onUpdate={onUpdate}
              isLocked={!!lockedColors[key as keyof ThemeTokens]}
              onToggleLock={() => onToggleLock(key as keyof ThemeTokens)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SwatchStrip;