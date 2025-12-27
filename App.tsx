import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Palette, RefreshCw, History, Upload, Image as ImageIcon, 
  Trash2, Undo, Lock, ChevronLeft, ChevronRight, Share, Download,
  Moon, Sun, SlidersHorizontal, ChevronUp, ChevronDown, Shuffle, PanelTopClose, PanelTopOpen, X, Menu
} from 'lucide-react';
import { ThemeTokens, DualTheme, GenerationMode, ColorFormat, DesignOptions, LockedColors } from './types';
import { generateTheme, extractPaletteFromImage, formatColor } from './utils/colorUtils';
import PreviewSection from './components/PreviewSection';
import SwatchStrip from './components/SwatchStrip';
import ShareModal from './components/ShareModal';
import ImagePickerModal from './components/ImagePickerModal';

const MAX_HISTORY = 20;

// CSS Variable Injection Helper
const getStyleVars = (tokens: ThemeTokens) => {
  return {
    '--bg': tokens.bg,
    '--card': tokens.card,
    '--card2': tokens.card2,
    '--text': tokens.text,
    '--text-muted': tokens.textMuted,
    '--text-on-color': tokens.textOnColor,
    '--primary': tokens.primary,
    '--primary-fg': tokens.primaryFg,
    '--secondary': tokens.secondary,
    '--secondary-fg': tokens.secondaryFg,
    '--accent': tokens.accent,
    '--accent-fg': tokens.accentFg,
    '--border': tokens.border,
    '--ring': tokens.ring,
    '--good': tokens.good,
    '--good-fg': tokens.goodFg,
    '--warn': tokens.warn,
    '--warn-fg': tokens.warnFg,
    '--bad': tokens.bad,
    '--bad-fg': tokens.badFg,
  } as React.CSSProperties;
};

// Custom Taichi (Yin Yang) Icon
const TaichiIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    {/* Outer circle */}
    <circle cx="12" cy="12" r="10" fill="white" stroke="none" />
    
    {/* Dark half with S-curve */}
    <path 
      d="M12 2 A10 10 0 0 1 12 22 A5 5 0 0 1 12 12 A5 5 0 0 0 12 2" 
      fill="black" 
      stroke="none"
    />
    
    {/* Light eye (in dark half) - positioned like a fish eye */}
    <circle cx="15" cy="7" r="1.8" fill="white" stroke="none" />
    
    {/* Dark eye (in light half) - positioned like a fish eye */}
    <circle cx="9" cy="17" r="1.8" fill="black" stroke="none" />
  </svg>
);

const App: React.FC = () => {
  const [history, setHistory] = useState<DualTheme[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentTheme, setCurrentTheme] = useState<DualTheme | null>(null);
  const [mode, setMode] = useState<GenerationMode>('random');
  const [format, setFormat] = useState<ColorFormat>('hex');
  const [showHistory, setShowHistory] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isDarkUI, setIsDarkUI] = useState(() => {
    // Detect system theme preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [showSwatches, setShowSwatches] = useState(true);

  const [showMobileNotice, setShowMobileNotice] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const [designOptions, setDesignOptions] = useState<DesignOptions>({
    borderWidth: 1,
    shadowStrength: 3,
    shadowOpacity: 15,
    gradientLevel: 0,
    radius: 3,
    brightnessLevel: 0, 
    contrastLevel: 0, 
    saturationLevel: 0 
  });
  
  const [lockedColors, setLockedColors] = useState<LockedColors>({});

  // Initialize from URL or History
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSeed = params.get('seed');
    const urlMode = params.get('mode') as GenerationMode;
    
    if (urlSeed && urlMode) {
      // Parse Design Options from URL
      const sat = params.get('sat') ? parseInt(params.get('sat')!) : undefined;
      const con = params.get('con') ? parseInt(params.get('con')!) : undefined;
      const bri = params.get('bri') ? parseInt(params.get('bri')!) : undefined;
      const bw = params.get('bw') ? parseInt(params.get('bw')!) : undefined;
      const sh = params.get('sh') ? parseInt(params.get('sh')!) : undefined;
      const so = params.get('so') ? parseInt(params.get('so')!) : undefined;
      const gr = params.get('gr') ? parseInt(params.get('gr')!) : undefined;
      const rd = params.get('rd') ? parseInt(params.get('rd')!) : undefined;

      // Update options if present
      setDesignOptions(prev => ({
        ...prev,
        borderWidth: bw ?? prev.borderWidth,
        shadowStrength: sh ?? prev.shadowStrength,
        shadowOpacity: so ?? prev.shadowOpacity,
        gradientLevel: gr ?? prev.gradientLevel,
        radius: rd ?? prev.radius,
        brightnessLevel: bri ?? prev.brightnessLevel,
        contrastLevel: con ?? prev.contrastLevel,
        saturationLevel: sat ?? prev.saturationLevel
      }));

      // Generate Theme directly with these params
      // We pass sat/con/bri explicitly because the state update above might not be flushed yet
      generateNewTheme(urlMode, urlSeed, sat, con, bri);
      
      // Remove encoded params cleanly from URL bar to show pretty URL if desired, 
      // but we want to KEEP them for sharing.
      return;
    }

    const saved = localStorage.getItem('theme_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) {
        setHistory(parsed);
        setHistoryIndex(parsed.length - 1);
        setCurrentTheme(parsed[parsed.length - 1]);
        return;
      }
    }
    generateNewTheme('random');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state to URL
  useEffect(() => {
    if (!currentTheme) return;
    const params = new URLSearchParams();
    params.set('mode', currentTheme.mode);
    params.set('seed', currentTheme.seed);
    params.set('sat', designOptions.saturationLevel.toString());
    params.set('con', designOptions.contrastLevel.toString());
    params.set('bri', designOptions.brightnessLevel.toString());
    params.set('bw', designOptions.borderWidth.toString());
    params.set('sh', designOptions.shadowStrength.toString());
    params.set('so', designOptions.shadowOpacity.toString());
    params.set('gr', designOptions.gradientLevel.toString());
    params.set('rd', designOptions.radius.toString());
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [currentTheme, designOptions]);

  // Persist history
  useEffect(() => {
    localStorage.setItem('theme_history', JSON.stringify(history));
  }, [history]);

  // Regenerate theme when color-affecting sliders change
  // This is a separate ref to track if this is the initial mount
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    // Skip effect on initial mount (handled by initialization useEffect)
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    // Only regenerate if we have a current theme
    if (currentTheme) {
      generateNewTheme(currentTheme.mode, currentTheme.seed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designOptions.saturationLevel, designOptions.contrastLevel, designOptions.brightnessLevel]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkUI(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const generateNewTheme = useCallback((
    genMode: GenerationMode, 
    seed?: string, 
    saturation?: number,
    contrast?: number,
    brightness?: number,
    overridePalette?: string[]
  ) => {
    // If param is undefined, use current state.
    const sLevel = saturation !== undefined ? saturation : designOptions.saturationLevel;
    const cLevel = contrast !== undefined ? contrast : designOptions.contrastLevel;
    const bLevel = brightness !== undefined ? brightness : designOptions.brightnessLevel;
    
    const { light, dark, seed: newSeed } = generateTheme(genMode, seed, sLevel, cLevel, bLevel, overridePalette);
    
    // Preserve locked colors from current theme
    // Also lock related tokens when a base token is locked
    const mergedLight = { ...light };
    const mergedDark = { ...dark };
    
    // Map of token to its related tokens that should also be locked
    // Map of token to its related tokens that should also be locked
    // This ensures that when a "master" token is locked, its dependent tokens 
    // stay harmonious with it (preventing broken contrast or hue mismatches)
    const relatedTokens: Record<string, string[]> = {
      bg: ['card', 'card2'], // Card usually depends on BG context
      card: ['card2'],
      text: ['textMuted', 'border'], // Typography hierarchy and borders should match text
      textMuted: [],
      textOnColor: [],  // Always white, but lockable
      primary: ['primaryFg', 'ring'],
      secondary: ['secondaryFg'],
      accent: ['accentFg'],
      good: ['goodFg'],
      bad: ['badFg'],
      warn: ['warnFg'],
      border: [],
    };
    
    if (currentTheme) {
      Object.keys(lockedColors).forEach(key => {
        if (lockedColors[key as keyof ThemeTokens]) {
          // Lock the main token
          mergedLight[key as keyof ThemeTokens] = currentTheme.light[key as keyof ThemeTokens];
          mergedDark[key as keyof ThemeTokens] = currentTheme.dark[key as keyof ThemeTokens];
          
          // Also lock related tokens
          const related = relatedTokens[key] || [];
          related.forEach(relatedKey => {
            mergedLight[relatedKey as keyof ThemeTokens] = currentTheme.light[relatedKey as keyof ThemeTokens];
            mergedDark[relatedKey as keyof ThemeTokens] = currentTheme.dark[relatedKey as keyof ThemeTokens];
          });
        }
      });
    }
    
    const newTheme: DualTheme = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      light: mergedLight,
      dark: mergedDark,
      seed: newSeed,
      mode: genMode
    };

    setHistory(prev => {
      // Add new theme to the beginning (left side)
      const newHist = [newTheme, ...prev];
      // Keep only the most recent MAX_HISTORY items (FIFO - remove from right)
      if (newHist.length > MAX_HISTORY) {
        return newHist.slice(0, MAX_HISTORY);
      }
      return newHist;
    });
    // New items are always at index 0
    setHistoryIndex(0);
    setCurrentTheme(newTheme);
  }, [historyIndex, designOptions.saturationLevel, designOptions.contrastLevel, designOptions.brightnessLevel, lockedColors, currentTheme]);

  // Update a single token (manual edit)
  const handleTokenUpdate = useCallback((side: 'light' | 'dark', key: keyof ThemeTokens, value: string) => {
    if (!currentTheme) return;

    // Create updated theme object
    const updatedTheme = {
      ...currentTheme,
      [side]: {
        ...currentTheme[side],
        [key]: value
      }
    };
    
    // Push modification to history
    // This allows Undo (Cmd+Z) to revert this change
    setHistory(prev => {
       const newHist = [updatedTheme, ...prev];
       if (newHist.length > MAX_HISTORY) return newHist.slice(0, MAX_HISTORY);
       return newHist;
    });
    setHistoryIndex(0);
    setCurrentTheme(updatedTheme);
  }, [currentTheme]);

  // Toggle lock on a color token
  const toggleColorLock = useCallback((key: keyof ThemeTokens) => {
    setLockedColors(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);


  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        generateNewTheme(mode);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, generateNewTheme]);

  const undo = () => {
    // Go back in time (increment index)
    // History is [Newest, ..., Oldest]
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setCurrentTheme(history[historyIndex + 1]);
    }
  };

  const redo = () => {
    // Go forward in time (decrement index)
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setCurrentTheme(history[historyIndex - 1]);
    }
  };

  const handleImageConfirm = (palette: string[]) => {
    setMode('image');
    generateNewTheme('analogous', undefined, undefined, undefined, undefined, palette); 
    setShowImagePickerModal(false);
  };

  const exportTheme = () => {
     if (!currentTheme) return;
     
     // Convert theme colors to the current format
     const formatTheme = (tokens: ThemeTokens) => {
       const formatted: any = {};
       Object.entries(tokens).forEach(([key, hex]) => {
         formatted[key] = formatColor(hex, format);
       });
       return formatted;
     };
     
     const exportData = {
       generator: "https://taichi.bucaastudio.com/",
       seed: currentTheme.seed,
       mode: currentTheme.mode,
       format: format,
       light: formatTheme(currentTheme.light),
       dark: formatTheme(currentTheme.dark)
     };
     
     const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `theme-${currentTheme.seed.replace('#','')}-${format}.json`;
     a.click();
  };

  const updateOption = (key: keyof DesignOptions, value: number) => {
    setDesignOptions(prev => {
      const next = { ...prev, [key]: value };
      return next;
    });

    // If changing color generation params, regenerate
    if ((key === 'contrastLevel' || key === 'saturationLevel') && currentTheme) {
      const newSat = key === 'saturationLevel' ? value : undefined;
      const newCon = key === 'contrastLevel' ? value : undefined;
      generateNewTheme(currentTheme.mode, currentTheme.seed, newSat, newCon);
    }
  };
  


  if (!currentTheme) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;

  // Derive Shell Colors from the current theme + isDarkUI state
  const shellTheme = isDarkUI ? currentTheme.dark : currentTheme.light;
  
  // Create dynamic style object for the shell
  const shellStyles = {
    backgroundColor: shellTheme.bg,
    color: shellTheme.text,
    borderColor: shellTheme.border,
  };
  
  // Specific overrides for inputs to ensure contrast within the shell
  const inputStyle = {
    backgroundColor: shellTheme.card,
    borderColor: shellTheme.border,
    color: shellTheme.text,
  };

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden overflow-x-hidden font-sans transition-colors duration-500"
      style={shellStyles}
    >
      
      {/* --- Toolbar --- */}
      <header 
        className="border-b shrink-0 z-50 relative transition-colors duration-500"
        style={{ borderColor: shellTheme.border, backgroundColor: shellTheme.bg }}
      >
        {/* Main Header Bar */}
        <div className="h-16 flex items-center justify-between px-3 lg:px-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg shadow-sm flex items-center justify-center" style={{ backgroundColor: shellTheme.primary }}>
              <TaichiIcon size={24} />
            </div>
            <h1 className="font-bold text-lg hidden md:block">Taichi Theme Generator</h1>
          </div>

          {/* Mobile: Generate + Palette + Options Buttons */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={() => generateNewTheme(mode)}
              className="text-white rounded-lg font-medium shadow-md transition-all active:transform active:scale-95 flex items-center overflow-hidden"
              style={{ backgroundColor: shellTheme.primary, color: shellTheme.primaryFg }}
            >
              <div className="px-3 py-2 flex items-center gap-1.5">
                <Shuffle size={14} />
                <span className="font-semibold text-xs">Generate</span>
              </div>
            </button>

            <button 
              onClick={() => setShowSwatches(!showSwatches)} 
              className={`p-2 rounded-lg transition-colors ${showSwatches ? 'bg-current text-white' : 'hover:bg-white/10'}`}
              style={showSwatches ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
              title="Color Palette"
            >
              <Palette size={18} />
            </button>

            <button 
              onClick={() => setShowOptions(!showOptions)} 
              className={`p-2 rounded-lg transition-colors ${showOptions ? 'bg-current text-white' : 'hover:bg-white/10'}`}
              style={showOptions ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
              title="Design Options"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>

          {/* Desktop: All Controls */}
          <div className="hidden md:flex items-center gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center rounded-lg p-0.5 gap-0.5 shrink-0" style={{ backgroundColor: shellTheme.card2 }}>
              <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 rounded-md disabled:opacity-30 transition-colors hover:bg-white/10">
                <Undo size={16} />
              </button>
              <div className="w-px h-4 mx-1 bg-current opacity-20"></div>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded-md disabled:opacity-30 transition-colors scale-x-[-1] hover:bg-white/10">
                <Undo size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => generateNewTheme(mode)}
                className="text-white rounded-md font-medium shadow-md transition-all active:transform active:scale-95 flex items-center overflow-hidden group"
                style={{ backgroundColor: shellTheme.primary, color: shellTheme.primaryFg }}
              >
                <div className="pl-3 pr-2 py-1.5 flex items-center gap-2">
                  <Shuffle size={16} />
                  <span className="font-semibold text-sm">Generate</span>
                </div>
                <div className="pr-1.5 py-1">
                  <div className="bg-black/20 text-current text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                    Space
                  </div>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value as GenerationMode)}
                className="text-sm rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 border cursor-pointer"
                style={{ ...inputStyle, outlineColor: shellTheme.primary }}
              >
                <option value="random">Random</option>
                <option value="monochrome">Monochrome</option>
                <option value="analogous">Analogous</option>
                <option value="complementary">Complementary</option>
                <option value="split-complementary">Split</option>
                <option value="triadic">Triadic</option>
                <option value="tetradic">Tetradic</option>
                <option value="compound">Compound</option>
                <option value="triadic-split">Triadic Split</option>
              </select>

              <select 
                value={format} 
                onChange={(e) => setFormat(e.target.value as ColorFormat)}
                className="text-sm rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 border cursor-pointer"
                style={{ ...inputStyle, outlineColor: shellTheme.primary }}
              >
                <option value="hex">HEX</option>
                <option value="rgb">RGB</option>
                <option value="cmyk">CMYK</option>
                <option value="hsl">HSL</option>
                <option value="lab">LAB</option>
                <option value="lch">LCH</option>
                <option value="oklch">OKLCH</option>
                <option value="display-p3">Display P3</option>
              </select>
            </div>

            <div className="h-6 w-px mx-1 bg-current opacity-20"></div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setShowSwatches(!showSwatches)} 
                className={`p-1.5 rounded-lg transition-colors ${showSwatches ? 'bg-current text-white/90' : 'hover:bg-white/10'}`}
                style={showSwatches ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
                title="Color Palette"
              >
                <Palette size={18} />
              </button>

              <button 
                onClick={() => setShowOptions(!showOptions)} 
                className={`p-1.5 rounded-lg transition-colors ${showOptions ? 'bg-current text-white/90' : 'hover:bg-white/10'}`}
                style={showOptions ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
                title="Design Options"
              >
                <SlidersHorizontal size={18} />
              </button>

              <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-current text-white/90' : 'hover:bg-white/10'}`}
                style={showHistory ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
                title="History"
              >
                <History size={18} />
              </button>

              <button 
                onClick={() => setShowImagePickerModal(true)} 
                className={`p-1.5 rounded-lg transition-colors ${showImagePickerModal ? 'bg-current text-white/90' : 'hover:bg-white/10'}`}
                style={showImagePickerModal ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
                title="Pick from Image"
              >
                <ImageIcon size={18} />
              </button>

              <button 
                onClick={exportTheme} 
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                title="Export JSON"
              >
                <Download size={18} />
              </button>

              <button 
                onClick={() => setShowShareModal(true)} 
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                title="Share Theme"
              >
                <Share size={18} />
              </button>

              <button
                onClick={() => setIsDarkUI(!isDarkUI)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                title="Toggle UI Theme"
              >
                {isDarkUI ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>

          {/* Right: Hamburger Menu (mobile only) */}
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-white/10"
            aria-label="Menu"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div 
            className="md:hidden border-t p-4 space-y-4"
            style={{ borderColor: shellTheme.border, backgroundColor: shellTheme.card }}
          >
            {/* Mode and Format Selectors */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70">Mode</label>
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value as GenerationMode)}
                className="w-full text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 border cursor-pointer"
                style={{ ...inputStyle, outlineColor: shellTheme.primary }}
              >
                <option value="random">Random</option>
                <option value="monochrome">Monochrome</option>
                <option value="analogous">Analogous</option>
                <option value="complementary">Complementary</option>
                <option value="split-complementary">Split Complementary</option>
                <option value="triadic">Triadic</option>
                <option value="tetradic">Tetradic</option>
                <option value="compound">Compound</option>
                <option value="triadic-split">Triadic Split</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70">Format</label>
              <select 
                value={format} 
                onChange={(e) => setFormat(e.target.value as ColorFormat)}
                className="w-full text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 border cursor-pointer"
                style={{ ...inputStyle, outlineColor: shellTheme.primary }}
              >
                <option value="hex">HEX</option>
                <option value="rgb">RGB</option>
                <option value="cmyk">CMYK</option>
                <option value="hsl">HSL</option>
                <option value="lab">LAB</option>
                <option value="lch">LCH</option>
                <option value="oklch">OKLCH</option>
                <option value="display-p3">Display P3</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={() => { setShowSwatches(!showSwatches); setShowMobileMenu(false); }}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${showSwatches ? 'bg-current text-white' : 'border'}`}
                style={showSwatches ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : { borderColor: shellTheme.border }}
              >
                <Palette size={18} />
                <span className="text-sm font-medium">Palette</span>
              </button>

              <button 
                onClick={() => { setShowOptions(!showOptions); setShowMobileMenu(false); }}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${showOptions ? 'bg-current text-white' : 'border'}`}
                style={showOptions ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : { borderColor: shellTheme.border }}
              >
                <SlidersHorizontal size={18} />
                <span className="text-sm font-medium">Options</span>
              </button>

              <button 
                onClick={() => { setShowHistory(!showHistory); setShowMobileMenu(false); }}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${showHistory ? 'bg-current text-white' : 'border'}`}
                style={showHistory ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : { borderColor: shellTheme.border }}
              >
                <History size={18} />
                <span className="text-sm font-medium">History</span>
              </button>

              <button 
                onClick={() => { setShowImagePickerModal(true); setShowMobileMenu(false); }}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${showImagePickerModal ? 'bg-current text-white' : 'border'}`}
                style={showImagePickerModal ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : { borderColor: shellTheme.border }}
              >
                <ImageIcon size={18} />
                <span className="text-sm font-medium">Image</span>
              </button>

              <button 
                onClick={() => { exportTheme(); setShowMobileMenu(false); }}
                className="p-3 rounded-lg border transition-colors flex items-center justify-center gap-2"
                style={{ borderColor: shellTheme.border }}
              >
                <Download size={18} />
                <span className="text-sm font-medium">Export</span>
              </button>

              <button 
                onClick={() => { setShowShareModal(true); setShowMobileMenu(false); }}
                className="p-3 rounded-lg border transition-colors flex items-center justify-center gap-2"
                style={{ borderColor: shellTheme.border }}
              >
                <Share size={18} />
                <span className="text-sm font-medium">Share</span>
              </button>

              <button
                onClick={() => { setIsDarkUI(!isDarkUI); setShowMobileMenu(false); }}
                className="p-3 rounded-lg border transition-colors flex items-center justify-center gap-2"
                style={{ borderColor: shellTheme.border }}
              >
                {isDarkUI ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-sm font-medium">{isDarkUI ? 'Light' : 'Dark'}</span>
              </button>

              <button 
                onClick={() => { undo(); setShowMobileMenu(false); }}
                disabled={historyIndex <= 0}
                className="p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
                style={{ borderColor: shellTheme.border }}
              >
                <Undo size={18} />
                <span className="text-sm font-medium">Undo</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Notice Banner */}
      {showMobileNotice && (
        <div 
          className="md:hidden flex items-center justify-between px-4 py-2 text-xs shrink-0"
          style={{ backgroundColor: shellTheme.card, borderBottom: `1px solid ${shellTheme.border}` }}
        >
          <span className="text-t-text">For best results, use this website on a desktop computer.</span>
          <button 
            onClick={() => setShowMobileNotice(false)}
            className="ml-2 p-1 rounded hover:bg-black/10 transition-colors"
            style={{ color: shellTheme.textMuted }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {showOptions && (
        <div 
          className="border-b px-4 py-4 shrink-0 shadow-inner z-40 relative grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-4 transition-colors duration-500"
          style={{ backgroundColor: shellTheme.bg, borderColor: shellTheme.border }}
        >
           {/* Border Width */}
           <div className="space-y-3">
             <div className="flex justify-between items-center">
               <label className="text-xs font-bold uppercase tracking-wider opacity-70">Border</label>
               <span className="text-xs font-mono opacity-50">{designOptions.borderWidth}px</span>
             </div>
             <input 
               type="range" min="0" max="5" step="1"
               value={designOptions.borderWidth}
               onChange={(e) => updateOption('borderWidth', parseInt(e.target.value))}
               className="w-full h-1.5 bg-current opacity-20 rounded-lg appearance-none cursor-pointer accent-current"
               style={{ accentColor: shellTheme.primary }}
             />
             <div className="flex justify-between text-[10px] opacity-40 px-0.5">
               <span>None</span><span>Thick</span>
             </div>
           </div>

           {/* Shadow Strength (Size) */}
           <div className="space-y-3">
             <div className="flex justify-between items-center">
               <label className="text-xs font-bold uppercase tracking-wider opacity-70">Shadow Size</label>
               <span className="text-xs font-mono opacity-50">Lvl {designOptions.shadowStrength}</span>
             </div>
             <input 
               type="range" min="0" max="5" step="1"
               value={designOptions.shadowStrength}
               onChange={(e) => updateOption('shadowStrength', parseInt(e.target.value))}
               className="w-full h-1.5 bg-current opacity-20 rounded-lg appearance-none cursor-pointer accent-current"
               style={{ accentColor: shellTheme.primary }}
             />
             <div className="flex justify-between text-[10px] opacity-40 px-0.5">
               <span>Flat</span><span>Float</span>
             </div>
           </div>

           {/* Shadow Opacity */}
           <div className="space-y-3">
             <div className="flex justify-between items-center">
               <label className="text-xs font-bold uppercase tracking-wider opacity-70">Shadow Opacity</label>
               <span className="text-xs font-mono opacity-50">{designOptions.shadowOpacity}%</span>
             </div>
             <input 
               type="range" min="5" max="95" step="5"
               value={designOptions.shadowOpacity}
               onChange={(e) => updateOption('shadowOpacity', parseInt(e.target.value))}
               className="w-full h-1.5 bg-current opacity-20 rounded-lg appearance-none cursor-pointer accent-current"
               style={{ accentColor: shellTheme.primary }}
             />
             <div className="flex justify-between text-[10px] opacity-40 px-0.5">
               <span>5%</span><span>95%</span>
             </div>
           </div>

           {/* Corner Radius */}
           <div className="space-y-3">
             <div className="flex justify-between items-center">
               <label className="text-xs font-bold uppercase tracking-wider opacity-70">Roundness</label>
               <span className="text-xs font-mono opacity-50">Lvl {designOptions.radius}</span>
             </div>
             <input 
               type="range" min="0" max="5" step="1"
               value={designOptions.radius}
               onChange={(e) => updateOption('radius', parseInt(e.target.value))}
               className="w-full h-1.5 bg-current opacity-20 rounded-lg appearance-none cursor-pointer accent-current"
               style={{ accentColor: shellTheme.primary }}
             />
             <div className="flex justify-between text-[10px] opacity-40 px-0.5">
               <span>Square</span><span>Round</span>
             </div>
           </div>

           {/* Gradient Level */}
           <div className="space-y-3">
             <div className="flex justify-between items-center">
               <label className="text-xs font-bold uppercase tracking-wider opacity-70">Gradients</label>
               <span className="text-xs font-mono opacity-50">Lvl {designOptions.gradientLevel}</span>
             </div>
             <input 
               type="range" min="0" max="5" step="1"
               value={designOptions.gradientLevel}
               onChange={(e) => updateOption('gradientLevel', parseInt(e.target.value))}
               className="w-full h-1.5 bg-current opacity-20 rounded-lg appearance-none cursor-pointer accent-current"
               style={{ accentColor: shellTheme.primary }}
             />
             <div className="flex justify-between text-[10px] opacity-40 px-0.5">
               <span>None</span><span>Diag</span>
             </div>
           </div>

             {/* Saturation Level */}
           <div className="space-y-3">
             <div className="flex justify-between items-center">
               <label className="text-xs font-bold uppercase tracking-wider opacity-70">Saturation</label>
               <span className="text-xs font-mono opacity-50">{designOptions.saturationLevel > 0 ? '+' : ''}{designOptions.saturationLevel}</span>
             </div>
             <input 
               type="range" min="-5" max="5" step="1"
               value={designOptions.saturationLevel}
               onChange={(e) => updateOption('saturationLevel', parseInt(e.target.value))}
               className="w-full h-1.5 bg-current opacity-20 rounded-lg appearance-none cursor-pointer accent-current"
               style={{ accentColor: shellTheme.primary }}
             />
             <div className="flex justify-between text-[10px] opacity-40 px-0.5">
               <span>Mono</span><span>Vivid</span>
             </div>
           </div>

           {/* Brightness Level */}
           <div className="space-y-3">
             <div className="flex justify-between items-center">
               <label className="text-xs font-bold uppercase tracking-wider opacity-70">Brightness</label>
               <span className="text-xs font-mono opacity-50">{designOptions.brightnessLevel > 0 ? '+' : ''}{designOptions.brightnessLevel}</span>
             </div>
             <input 
               type="range" min="-5" max="5" step="1"
               value={designOptions.brightnessLevel}
               onChange={(e) => updateOption('brightnessLevel', parseInt(e.target.value))}
               className="w-full h-1.5 bg-current opacity-20 rounded-lg appearance-none cursor-pointer accent-current"
               style={{ accentColor: shellTheme.primary }}
             />
             <div className="flex justify-between text-[10px] opacity-40 px-0.5">
               <span>Dark</span><span>Bright</span>
             </div>
           </div>

           {/* Contrast Level */}
           <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider opacity-70">Contrast</label>
                <span className="text-xs font-mono opacity-50">{designOptions.contrastLevel > 0 ? '+' : ''}{designOptions.contrastLevel}</span>
              </div>
              <input 
                type="range" min="-5" max="5" step="1"
                value={designOptions.contrastLevel}
                onChange={(e) => updateOption('contrastLevel', parseInt(e.target.value))}
                className="w-full h-1.5 bg-current opacity-20 rounded-lg appearance-none cursor-pointer accent-current"
                style={{ accentColor: shellTheme.primary }}
              />
              <div className="flex justify-between text-[10px] opacity-40 px-0.5">
                <span>Soft</span><span>Max</span>
              </div>
           </div>
        </div>
      )}

      {/* --- History Drawer --- */}
      {showHistory && (
        <div 
          className="h-32 border-b flex overflow-x-auto p-4 gap-4 shrink-0 shadow-inner z-40 relative"
          style={{ backgroundColor: shellTheme.bg, borderColor: shellTheme.border }}
        >
          {history.map((theme, idx) => (
            <button 
              key={theme.id}
              onClick={() => {
                setHistoryIndex(idx);
                setCurrentTheme(theme);
              }}
              className={`flex flex-col min-w-[80px] w-20 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${historyIndex === idx ? 'ring-2' : 'border-transparent'}`}
              style={{ 
                borderColor: historyIndex === idx ? shellTheme.primary : 'transparent', 
                ringColor: shellTheme.primary 
              }}
            >
              <div className="flex-1 w-full flex">
                 <div className="w-1/2 h-full" style={{ backgroundColor: theme.light.primary }}></div>
                 <div className="w-1/2 h-full" style={{ backgroundColor: theme.dark.bg }}></div>
              </div>
              <div 
                className="h-6 text-[10px] flex items-center justify-center font-mono"
                style={{ backgroundColor: shellTheme.card2, color: shellTheme.textMuted }}
              >
                {theme.mode === 'random' ? 'Rndm' : 
                 theme.mode === 'monochrome' ? 'Mono' :
                 theme.mode === 'analogous' ? 'Anlg' :
                 theme.mode === 'complementary' ? 'Comp' :
                 theme.mode === 'split-complementary' ? 'Splt' :
                 theme.mode === 'triadic' ? 'Tria' :
                 theme.mode === 'tetradic' ? 'Tetr' :
                 theme.mode === 'compound' ? 'Cmpd' :
                 theme.mode === 'triadic-split' ? 'TrSp' :
                 theme.mode === 'image' ? 'Img' : theme.mode.slice(0,4)}
              </div>
            </button>
          ))}
          {history.length === 0 && <div className="text-sm opacity-50 m-auto">No history yet</div>}
        </div>
      )}

      {/* --- Main Content Area (Sync Scroll) --- */}
      <div className="flex-1 overflow-y-auto relative scroll-smooth group">
        
        {/* Sticky Swatches */}
        {showSwatches && (
        <SwatchStrip 
           light={currentTheme.light} 
           dark={currentTheme.dark} 
           format={format}
           onFormatChange={setFormat}
           isDarkUI={isDarkUI}
           onUpdate={handleTokenUpdate}
           lockedColors={lockedColors}
           onToggleLock={toggleColorLock}
        />
        )}

        {/* Split Preview */}
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-140px)]">
          {/* Light Side */}
          <div 
            className="w-full md:w-1/2 bg-t-bg transition-colors duration-500" 
            style={getStyleVars(currentTheme.light)}
          >
             <PreviewSection themeName="Light" options={designOptions} />
          </div>

          {/* Dark Side */}
          <div 
            className="w-full md:w-1/2 bg-t-bg transition-colors duration-500" 
            style={getStyleVars(currentTheme.dark)}
          >
             <PreviewSection themeName="Dark" options={designOptions} />
          </div>
        </div>

        </div>
      {/* Modals */}
      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        url={window.location.href}
        theme={currentTheme.light} // Use light theme for share modal UI
      />

      <ImagePickerModal
        isOpen={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onConfirm={handleImageConfirm}
        theme={currentTheme.dark} // Use dark theme for picker modal UI
      />
    </div>
  );
};

export default App;