import React, { useState, useEffect } from 'react';
import { ThemeTokens, ColorFormat } from '../types';
import { formatColor, parseToHex } from '../utils/colorUtils';
import { Copy, Check } from 'lucide-react';

interface SwatchStripProps {
  light: ThemeTokens;
  dark: ThemeTokens;
  format: ColorFormat;
  onFormatChange: (fmt: ColorFormat) => void;
  isDarkUI: boolean;
  onUpdate: (side: 'light' | 'dark', key: keyof ThemeTokens, value: string) => void;
}

interface TokenBlockProps {
  tokenKey: string;
  lightHex: string;
  darkHex: string;
  format: ColorFormat;
  isDarkUI: boolean;
  onUpdate: (side: 'light' | 'dark', key: keyof ThemeTokens, value: string) => void;
}

const TokenBlock: React.FC<TokenBlockProps> = ({ 
  tokenKey, 
  lightHex, 
  darkHex, 
  format, 
  isDarkUI, 
  onUpdate 
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (hex: string, type: 'light' | 'dark') => {
    const val = formatColor(hex, format);
    navigator.clipboard.writeText(val);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  const labelColor = isDarkUI ? 'text-slate-500' : 'text-gray-400';
  const blockBorder = isDarkUI ? 'border-slate-700' : 'border-gray-200';
  
  return (
    <div className={`flex flex-col w-full rounded-xl border ${blockBorder} overflow-hidden transition-colors`}>
      {/* Label */}
      <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-b ${blockBorder} ${labelColor} flex justify-between items-center bg-opacity-50`}>
        {tokenKey}
      </div>

      {/* Light Token */}
      <SwatchRow 
        hex={lightHex} 
        format={format} 
        isDarkUI={isDarkUI} 
        side="light"
        onCopy={() => copyToClipboard(lightHex, 'light')}
        copied={copied === 'light'}
        onUpdate={(val) => onUpdate('light', tokenKey as keyof ThemeTokens, val)}
      />

      {/* Divider */}
      <div className={`h-px w-full ${blockBorder}`}></div>

      {/* Dark Token */}
      <SwatchRow 
        hex={darkHex} 
        format={format} 
        isDarkUI={isDarkUI} 
        side="dark"
        onCopy={() => copyToClipboard(darkHex, 'dark')}
        copied={copied === 'dark'}
        onUpdate={(val) => onUpdate('dark', tokenKey as keyof ThemeTokens, val)}
      />
    </div>
  );
};

interface SwatchRowProps {
  hex: string;
  format: ColorFormat;
  isDarkUI: boolean;
  side: 'light' | 'dark';
  onCopy: () => void;
  copied: boolean;
  onUpdate: (newHex: string) => void;
}

const SwatchRow: React.FC<SwatchRowProps> = ({ hex, format, isDarkUI, onCopy, copied, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Format logic - full value with format
  const fullValue = formatColor(hex, format);
  
  // Strip format prefix for display to save space
  const getDisplayValue = (formatted: string): string => {
    // Remove format prefix and parentheses for compact display
    if (formatted.startsWith('rgb(')) return formatted.slice(4, -1);
    if (formatted.startsWith('cmyk(')) return formatted.slice(5, -1);
    if (formatted.startsWith('hsl(')) return formatted.slice(4, -1);
    if (formatted.startsWith('lab(')) return formatted.slice(4, -1);
    if (formatted.startsWith('lch(')) return formatted.slice(4, -1);
    if (formatted.startsWith('oklch(')) return formatted.slice(6, -1);
    if (formatted.startsWith('color(display-p3 ')) return formatted.slice(17, -1);
    return formatted; // HEX - no prefix to remove
  };
  
  const displayValue = getDisplayValue(fullValue);

  const startEditing = () => {
    setInputValue(displayValue);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const newHex = parseToHex(inputValue, format);
    if (newHex && newHex !== hex) {
      onUpdate(newHex);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const bgHover = isDarkUI ? 'hover:bg-slate-800' : 'hover:bg-gray-50';
  const textColor = isDarkUI ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className={`flex items-center p-2 gap-2 ${bgHover} transition-colors group relative`}>
      {/* Clickable Swatch with background pattern */}
      <button 
        onClick={onCopy}
        className="w-12 h-12 rounded-lg shadow-md border-2 border-gray-300/40 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform relative overflow-hidden" 
        style={{ 
          backgroundColor: hex,
          backgroundImage: `
            linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.05) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.05) 75%)
          `,
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
        }}
        title={`Click to copy: ${fullValue}`}
      >
        {copied && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white backdrop-blur-[1px]">
             <Check size={16} strokeWidth={3} />
           </div>
        )}
      </button>

      {/* Editable Text */}
      <div className="flex-1 min-w-0 flex items-center h-full">
        {isEditing ? (
          <input 
            type="text" 
            autoFocus
            className={`w-full text-[10px] font-mono bg-transparent outline-none border-b border-indigo-500 ${textColor}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span 
            onClick={startEditing}
            className={`text-[10px] font-mono truncate w-full cursor-text hover:text-indigo-500 transition-colors select-none ${textColor}`}
            title={`Full value: ${fullValue}\nClick to edit`}
          >
            {displayValue}
          </span>
        )}
      </div>
    </div>
  );
};

const SwatchStrip: React.FC<SwatchStripProps> = ({ light, dark, format, isDarkUI, onUpdate }) => {
  // Use theme colors for background
  const themeTokens = isDarkUI ? dark : light;
  const bg = isDarkUI ? 'border-slate-700' : 'border-gray-200';
  
  // Map token keys we want to display - now 8 colors
  const tokens = ['bg', 'surface', 'text', 'primary', 'secondary', 'accent', 'success', 'error'];

  return (
    <div 
      className={`sticky top-0 z-40 backdrop-blur-md border-b p-2 shadow-sm transition-colors duration-300 ${bg}`}
      style={{ backgroundColor: themeTokens.bg }}
    >
      <div className="max-w-[1920px] mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 w-full">
          {tokens.map(key => (
            <TokenBlock 
              key={key}
              tokenKey={key} 
              lightHex={light[key as keyof ThemeTokens]} 
              darkHex={dark[key as keyof ThemeTokens]} 
              format={format} 
              isDarkUI={isDarkUI} 
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SwatchStrip;