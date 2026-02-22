import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Palette, RefreshCw, History, Upload, Image as ImageIcon, 
  Trash2, Undo, Lock, Unlock, ChevronLeft, ChevronRight, Share, Download,
  Moon, Sun, SlidersHorizontal, ChevronUp, ChevronDown, Shuffle, PanelTopClose, PanelTopOpen, X, Menu
} from 'lucide-react';
import { ThemeTokens, DualTheme, GenerationMode, ColorFormat, DesignOptions, LockedColors, LockedOptions } from './types';
import { generateTheme, extractPaletteFromImage, formatColor } from './utils/colorUtils';
import PreviewSection from './components/PreviewSection';
import SwatchStrip from './components/SwatchStrip';
import ShareModal from './components/ShareModal';
import ImagePickerModal from './components/ImagePickerModal';

const MAX_HISTORY = 20;
type WorkspaceTab = 'overview' | 'tokens' | 'delivery';

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

// Custom Taichi (Yin Yang) Icon — themed via lightColor / darkColor props
const TaichiIcon = ({ size = 24, className = "", lightColor = "white", darkColor = "black" }: { size?: number, className?: string, lightColor?: string, darkColor?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    {/* Outer circle (light half) */}
    <circle cx="12" cy="12" r="10" fill={lightColor} stroke="none" />

    {/* Dark half with S-curve */}
    <path
      d="M12 2 A10 10 0 0 1 12 22 A5 5 0 0 1 12 12 A5 5 0 0 0 12 2"
      fill={darkColor}
      stroke="none"
    />

    {/* Light eye (in dark half) */}
    <circle cx="15" cy="7" r="1.8" fill={lightColor} stroke="none" />

    {/* Dark eye (in light half) */}
    <circle cx="9" cy="17" r="1.8" fill={darkColor} stroke="none" />
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
  const [showSwatches, setShowSwatches] = useState(false);
  const [autoSyncPreview, setAutoSyncPreview] = useState(true);
  const [syncedWorkspaceTab, setSyncedWorkspaceTab] = useState<WorkspaceTab>('overview');

  const [showMobileNotice, setShowMobileNotice] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const [designOptions, setDesignOptions] = useState<DesignOptions>({
    borderWidth: 1,
    shadowStrength: 3,
    shadowOpacity: 15,
    gradients: false,
    radius: 3,
    brightnessLevel: 0,
    contrastLevel: 0,
    saturationLevel: 0,
    darkFirst: false,
    splitAdjustments: false,
    lightBrightnessLevel: 0,
    lightContrastLevel: 0,
    lightSaturationLevel: 0,
    darkBrightnessLevel: 0,
    darkContrastLevel: 0,
    darkSaturationLevel: 0,
  });
  
  const [lockedColors, setLockedColors] = useState<LockedColors>({});
  const [lockedOptions, setLockedOptions] = useState<LockedOptions>({});

  // Randomize unlocked design options
  const randomizeDesignOptions = useCallback(() => {
    setDesignOptions(prev => {
      const next = { ...prev };
      
      // Border: 0-2 (none, thin, thick)
      if (!lockedOptions.borderWidth) {
        next.borderWidth = Math.floor(Math.random() * 3);
      }
      
      // Shadow Strength: 0-5
      if (!lockedOptions.shadowStrength) {
        next.shadowStrength = Math.floor(Math.random() * 6);
      }
      
      // Shadow Opacity: 5-50 (step 5)
      if (!lockedOptions.shadowOpacity) {
        next.shadowOpacity = 5 + Math.floor(Math.random() * 10) * 5;
      }
      
      // Radius: 0-5
      if (!lockedOptions.radius) {
        next.radius = Math.floor(Math.random() * 6);
      }
      
      // Gradients: toggle randomly
      if (!lockedOptions.gradients) {
        next.gradients = Math.random() > 0.5;
      }
      
      // Dark First: toggle randomly
      if (!lockedOptions.darkFirst) {
        next.darkFirst = Math.random() > 0.5;
      }

      // Color adjustments: randomize per-mode or shared based on split state
      if (prev.splitAdjustments) {
        if (!lockedOptions.saturationLevel) {
          next.lightSaturationLevel = Math.floor(Math.random() * 11) - 5;
          next.darkSaturationLevel = Math.floor(Math.random() * 11) - 5;
        }
        if (!lockedOptions.brightnessLevel) {
          next.lightBrightnessLevel = Math.floor(Math.random() * 11) - 5;
          next.darkBrightnessLevel = Math.floor(Math.random() * 11) - 5;
        }
        if (!lockedOptions.contrastLevel) {
          next.lightContrastLevel = Math.floor(Math.random() * 11) - 5;
          next.darkContrastLevel = Math.floor(Math.random() * 11) - 5;
        }
      } else {
        if (!lockedOptions.saturationLevel) {
          next.saturationLevel = Math.floor(Math.random() * 11) - 5;
        }
        if (!lockedOptions.brightnessLevel) {
          next.brightnessLevel = Math.floor(Math.random() * 11) - 5;
        }
        if (!lockedOptions.contrastLevel) {
          next.contrastLevel = Math.floor(Math.random() * 11) - 5;
        }
      }
      
      return next;
    });
  }, [lockedOptions]);

  // Toggle lock on a design option
  const toggleOptionLock = useCallback((key: keyof DesignOptions) => {
    setLockedOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

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
      const bwRaw = params.get('bw') ? parseInt(params.get('bw')!) : undefined;
      const bw = bwRaw !== undefined ? Math.min(Math.max(bwRaw, 0), 2) : undefined;
      const sh = params.get('sh') ? parseInt(params.get('sh')!) : undefined;
      const so = params.get('so') ? parseInt(params.get('so')!) : undefined;
      const grParam = params.get('gr');
      const gradients = grParam !== null
        ? grParam === 'true' || grParam === '1' || parseInt(grParam, 10) > 0
        : undefined;
      const rd = params.get('rd') ? parseInt(params.get('rd')!) : undefined;

      // Split adjustment params
      const split = params.get('split') === '1';
      const lsat = params.get('lsat') ? parseInt(params.get('lsat')!) : 0;
      const lcon = params.get('lcon') ? parseInt(params.get('lcon')!) : 0;
      const lbri = params.get('lbri') ? parseInt(params.get('lbri')!) : 0;
      const dsat = params.get('dsat') ? parseInt(params.get('dsat')!) : 0;
      const dcon = params.get('dcon') ? parseInt(params.get('dcon')!) : 0;
      const dbri = params.get('dbri') ? parseInt(params.get('dbri')!) : 0;

      // Update options if present
      setDesignOptions(prev => ({
        ...prev,
        borderWidth: bw ?? prev.borderWidth,
        shadowStrength: sh ?? prev.shadowStrength,
        shadowOpacity: so ?? prev.shadowOpacity,
        gradients: gradients ?? prev.gradients,
        radius: rd ?? prev.radius,
        brightnessLevel: bri ?? prev.brightnessLevel,
        contrastLevel: con ?? prev.contrastLevel,
        saturationLevel: sat ?? prev.saturationLevel,
        splitAdjustments: split,
        lightBrightnessLevel: split ? lbri : (bri ?? prev.brightnessLevel),
        lightContrastLevel: split ? lcon : (con ?? prev.contrastLevel),
        lightSaturationLevel: split ? lsat : (sat ?? prev.saturationLevel),
        darkBrightnessLevel: split ? dbri : (bri ?? prev.brightnessLevel),
        darkContrastLevel: split ? dcon : (con ?? prev.contrastLevel),
        darkSaturationLevel: split ? dsat : (sat ?? prev.saturationLevel),
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
    params.set('bw', designOptions.borderWidth.toString());
    params.set('sh', designOptions.shadowStrength.toString());
    params.set('so', designOptions.shadowOpacity.toString());
    params.set('gr', designOptions.gradients ? '1' : '0');
    params.set('rd', designOptions.radius.toString());

    if (designOptions.splitAdjustments) {
      params.set('split', '1');
      params.set('lsat', designOptions.lightSaturationLevel.toString());
      params.set('lcon', designOptions.lightContrastLevel.toString());
      params.set('lbri', designOptions.lightBrightnessLevel.toString());
      params.set('dsat', designOptions.darkSaturationLevel.toString());
      params.set('dcon', designOptions.darkContrastLevel.toString());
      params.set('dbri', designOptions.darkBrightnessLevel.toString());
    } else {
      params.set('sat', designOptions.saturationLevel.toString());
      params.set('con', designOptions.contrastLevel.toString());
      params.set('bri', designOptions.brightnessLevel.toString());
    }

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
  }, [
    designOptions.saturationLevel, designOptions.contrastLevel, designOptions.brightnessLevel,
    designOptions.darkFirst, designOptions.splitAdjustments,
    designOptions.lightBrightnessLevel, designOptions.lightContrastLevel, designOptions.lightSaturationLevel,
    designOptions.darkBrightnessLevel, designOptions.darkContrastLevel, designOptions.darkSaturationLevel,
  ]);

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
    // Compute effective adjustment levels
    // When split is on, use per-mode values; otherwise use shared values
    let lightSat: number, lightCon: number, lightBri: number;
    let darkSat: number, darkCon: number, darkBri: number;

    if (designOptions.splitAdjustments) {
      lightSat = designOptions.lightSaturationLevel;
      lightCon = designOptions.lightContrastLevel;
      lightBri = designOptions.lightBrightnessLevel;
      darkSat = designOptions.darkSaturationLevel;
      darkCon = designOptions.darkContrastLevel;
      darkBri = designOptions.darkBrightnessLevel;
    } else {
      const sLevel = saturation !== undefined ? saturation : designOptions.saturationLevel;
      const cLevel = contrast !== undefined ? contrast : designOptions.contrastLevel;
      const bLevel = brightness !== undefined ? brightness : designOptions.brightnessLevel;
      lightSat = sLevel;
      lightCon = cLevel;
      lightBri = bLevel;
      darkSat = sLevel;
      darkCon = cLevel;
      darkBri = bLevel;
    }

    const { light, dark, seed: newSeed } = generateTheme(
      genMode, seed, lightSat, lightCon, lightBri, overridePalette, designOptions.darkFirst,
      darkSat, darkCon, darkBri
    );
    
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
  }, [historyIndex, designOptions.saturationLevel, designOptions.contrastLevel, designOptions.brightnessLevel,
      designOptions.darkFirst, designOptions.splitAdjustments,
      designOptions.lightBrightnessLevel, designOptions.lightContrastLevel, designOptions.lightSaturationLevel,
      designOptions.darkBrightnessLevel, designOptions.darkContrastLevel, designOptions.darkSaturationLevel,
      lockedColors, currentTheme]);

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

  // Undo: go back in history
  const undo = useCallback(() => {
    // History is [Newest, ..., Oldest]
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setCurrentTheme(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  // Redo: go forward in history
  const redo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setCurrentTheme(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);


  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if ((e.code === 'Space' || e.key === 'Enter') && !isEditable) {
        e.preventDefault();
        // Blur any focused button so the browser focus ring disappears
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        // Randomize unlocked design options first
        randomizeDesignOptions();
        // Then generate new theme (will use the new options)
        generateNewTheme(mode);
      }
      if (!isEditable && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      // Arrow keys for history navigation (when not in editable fields)
      if (!isEditable && e.key === 'ArrowLeft') {
        e.preventDefault();
        undo();
      }
      if (!isEditable && e.key === 'ArrowRight') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, generateNewTheme, randomizeDesignOptions, undo, redo]);


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
    const nextValue = key === 'borderWidth'
      ? Math.min(Math.max(value, 0), 2)
      : value;
    setDesignOptions(prev => ({ ...prev, [key]: nextValue }));
    // Color adjustment regeneration is handled by the useEffect dependency array
  };

  const handleRandomize = useCallback(() => {
    randomizeDesignOptions();
    generateNewTheme(mode);
  }, [randomizeDesignOptions, generateNewTheme, mode]);

  const handleToggleSwatches = useCallback(() => setShowSwatches(prev => !prev), []);
  const handleToggleOptions = useCallback(() => setShowOptions(prev => !prev), []);
  const handleToggleHistory = useCallback(() => setShowHistory(prev => !prev), []);
  const handleToggleTheme = useCallback(() => setIsDarkUI(prev => !prev), []);
  const handleShare = useCallback(() => setShowShareModal(true), []);
  


  if (!currentTheme) return <div className="h-screen flex items-center justify-center bg-gray-900 text-gray-100">Loading...</div>;

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
              <TaichiIcon size={24} lightColor={shellTheme.primaryFg} darkColor={shellTheme.primary} />
            </div>
            <h1 className="font-bold text-lg hidden md:block">Taichi Theme Generator</h1>
          </div>

          {/* Mobile: Generate + Palette + Options Buttons */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={() => { randomizeDesignOptions(); generateNewTheme(mode); }}
              className="rounded-lg font-medium shadow-md transition-all active:transform active:scale-95 flex items-center overflow-hidden"
              style={{ backgroundColor: shellTheme.primary, color: shellTheme.primaryFg }}
            >
              <div className="px-3 py-2 flex items-center gap-1.5">
                <Shuffle size={14} />
                <span className="font-semibold text-xs">Generate</span>
              </div>
            </button>

            <button 
              onClick={() => setShowSwatches(!showSwatches)}
              className={`p-2 rounded-lg transition-colors shrink-0 ${showSwatches ? '' : 'hover-themed'}`}
              style={showSwatches ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
              title="Color Palette"
            >
              <Palette size={18} />
            </button>

            <button 
              onClick={() => setShowOptions(!showOptions)}
              className={`p-2 rounded-lg transition-colors shrink-0 ${showOptions ? '' : 'hover-themed'}`}
              style={showOptions ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
              title="Design Options"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>

          {/* Desktop: All Controls */}
          <div className="hidden md:flex items-center gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center rounded-lg p-0.5 gap-0.5 shrink-0" style={{ backgroundColor: shellTheme.card2 }}>
              <button onClick={undo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded-md disabled:opacity-30 transition-colors hover-themed">
                <Undo size={16} />
              </button>
              <div className="w-px h-4 mx-1" style={{ backgroundColor: shellTheme.border }}></div>
              <button onClick={redo} disabled={historyIndex <= 0} className="p-1.5 rounded-md disabled:opacity-30 transition-colors hover-themed">
                <Undo size={16} className="scale-x-[-1]" />
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => { randomizeDesignOptions(); generateNewTheme(mode); }}
                className="rounded-md font-medium shadow-md transition-all active:transform active:scale-95 flex items-center overflow-hidden group"
                style={{ backgroundColor: shellTheme.primary, color: shellTheme.primaryFg }}
              >
                <div className="pl-3 pr-2 py-1.5 flex items-center gap-2">
                  <Shuffle size={16} />
                  <span className="font-semibold text-sm">Generate</span>
                </div>
                <div className="pr-1.5 py-1">
                  <div className="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm" style={{ backgroundColor: `${shellTheme.primaryFg}20` }}>
                    Space
                  </div>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value as GenerationMode)}
                className="text-sm rounded-md px-2 py-1.5 focus:outline-none border cursor-pointer"
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
                className="text-sm rounded-md px-2 py-1.5 focus:outline-none border cursor-pointer"
                style={{ ...inputStyle, outlineColor: shellTheme.primary }}
              >
                <option value="hex">HEX</option>
                <option value="rgb">RGB</option>
                <option value="hsl">HSL</option>
                <option value="oklch">OKLCH</option>
              </select>
            </div>

            <div className="h-6 w-px mx-1" style={{ backgroundColor: shellTheme.border }}></div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setShowSwatches(!showSwatches)}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${showSwatches ? '' : 'hover-themed'}`}
                style={showSwatches ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
                title="Color Palette"
              >
                <Palette size={18} />
              </button>

              <button 
                onClick={() => setShowOptions(!showOptions)}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${showOptions ? '' : 'hover-themed'}`}
                style={showOptions ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
                title="Design Options"
              >
                <SlidersHorizontal size={18} />
              </button>

              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1.5 rounded-lg transition-colors ${showHistory ? '' : 'hover-themed'}`}
                style={showHistory ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
                title="History"
              >
                <History size={18} />
              </button>

              <button 
                onClick={() => setShowImagePickerModal(true)}
                className={`p-1.5 rounded-lg transition-colors ${showImagePickerModal ? '' : 'hover-themed'}`}
                style={showImagePickerModal ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : {}}
                title="Pick from Image"
              >
                <ImageIcon size={18} />
              </button>

              <button 
                onClick={exportTheme}
                className="p-1.5 rounded-lg transition-colors hover-themed"
                title="Export JSON"
              >
                <Download size={18} />
              </button>

              <button 
                onClick={() => setShowShareModal(true)}
                className="p-1.5 rounded-lg transition-colors hover-themed"
                title="Share Theme"
              >
                <Share size={18} />
              </button>

              <button
                onClick={() => setIsDarkUI(!isDarkUI)}
                className="p-1.5 rounded-lg transition-colors hover-themed"
                title="Toggle UI Theme"
              >
                {isDarkUI ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>

          {/* Right: Hamburger Menu (mobile only) */}
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-lg transition-colors hover-themed"
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
                className="w-full text-sm rounded-md px-3 py-2 focus:outline-none border cursor-pointer"
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
                className="w-full text-sm rounded-md px-3 py-2 focus:outline-none border cursor-pointer"
                style={{ ...inputStyle, outlineColor: shellTheme.primary }}
              >
                <option value="hex">HEX</option>
                <option value="rgb">RGB</option>
                <option value="hsl">HSL</option>
                <option value="oklch">OKLCH</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={() => { setShowSwatches(!showSwatches); setShowMobileMenu(false); }}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${showSwatches ? '' : 'border'}`}
                style={showSwatches ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : { borderColor: shellTheme.border }}
              >
                <Palette size={18} />
                <span className="text-sm font-medium">Palette</span>
              </button>

              <button 
                onClick={() => { setShowOptions(!showOptions); setShowMobileMenu(false); }}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${showOptions ? '' : 'border'}`}
                style={showOptions ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : { borderColor: shellTheme.border }}
              >
                <SlidersHorizontal size={18} />
                <span className="text-sm font-medium">Options</span>
              </button>

              <button 
                onClick={() => { setShowHistory(!showHistory); setShowMobileMenu(false); }}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${showHistory ? '' : 'border'}`}
                style={showHistory ? { backgroundColor: shellTheme.primary, color: shellTheme.primaryFg } : { borderColor: shellTheme.border }}
              >
                <History size={18} />
                <span className="text-sm font-medium">History</span>
              </button>

              <button 
                onClick={() => { setShowImagePickerModal(true); setShowMobileMenu(false); }}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${showImagePickerModal ? '' : 'border'}`}
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
            className="ml-2 p-1 rounded hover-themed transition-colors"
            style={{ color: shellTheme.textMuted }}
          >
            <X size={14} />
          </button>
        </div>
      )}

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

      {showOptions && (
        <div 
          className="border-b px-3 py-4 shrink-0 shadow-inner z-40 relative transition-colors duration-500"
          style={{ backgroundColor: shellTheme.bg, borderColor: shellTheme.border }}
        >
          <div className="max-w-[1920px] mx-auto w-full space-y-4">
          {/* Row 1: Structural Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
           {/* Border Width */}
           <div className="space-y-2 group/opt">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-1.5">
                 <button
                   onClick={() => toggleOptionLock('borderWidth')}
                   className={`p-0.5 rounded transition-all ${lockedOptions.borderWidth ? 'opacity-100 text-t-primary' : 'opacity-0 group-hover/opt:opacity-60 hover:!opacity-100'}`}
                   title={lockedOptions.borderWidth ? 'Unlock' : 'Lock'}
                 >
                   {lockedOptions.borderWidth ? <Lock size={10} /> : <Unlock size={10} />}
                 </button>
                 <label className="text-xs font-bold uppercase tracking-wider opacity-70">Border</label>
               </div>
               <span className="text-xs font-mono opacity-50">
                 {designOptions.borderWidth === 0 ? 'None' : designOptions.borderWidth === 1 ? 'Thin' : 'Thick'}
               </span>
             </div>
             <input
               type="range" min="0" max="2" step="1"
               value={designOptions.borderWidth}
               onChange={(e) => updateOption('borderWidth', parseInt(e.target.value))}
               className="w-full h-1.5 rounded-lg cursor-pointer"
               style={{ color: shellTheme.primary }}
             />
             <div className="grid grid-cols-3 text-[10px] opacity-40 px-0.5">
               <span>None</span>
               <span className="text-center">Thin</span>
               <span className="text-right">Thick</span>
             </div>
           </div>

           {/* Shadow Strength (Size) */}
           <div className="space-y-2 group/opt">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-1.5">
                 <button
                   onClick={() => toggleOptionLock('shadowStrength')}
                   className={`p-0.5 rounded transition-all ${lockedOptions.shadowStrength ? 'opacity-100 text-t-primary' : 'opacity-0 group-hover/opt:opacity-60 hover:!opacity-100'}`}
                   title={lockedOptions.shadowStrength ? 'Unlock' : 'Lock'}
                 >
                   {lockedOptions.shadowStrength ? <Lock size={10} /> : <Unlock size={10} />}
                 </button>
                 <label className="text-xs font-bold uppercase tracking-wider opacity-70">Shadow Size</label>
               </div>
               <span className="text-xs font-mono opacity-50">Lvl {designOptions.shadowStrength}</span>
             </div>
             <input
               type="range" min="0" max="5" step="1"
               value={designOptions.shadowStrength}
               onChange={(e) => updateOption('shadowStrength', parseInt(e.target.value))}
               className="w-full h-1.5 rounded-lg cursor-pointer"
               style={{ color: shellTheme.primary }}
             />
             <div className="flex justify-between text-[10px] opacity-40 px-0.5">
               <span>None</span><span>Deep</span>
             </div>
           </div>

           {/* Shadow Opacity */}
           <div className="space-y-2 group/opt">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-1.5">
                 <button
                   onClick={() => toggleOptionLock('shadowOpacity')}
                   className={`p-0.5 rounded transition-all ${lockedOptions.shadowOpacity ? 'opacity-100 text-t-primary' : 'opacity-0 group-hover/opt:opacity-60 hover:!opacity-100'}`}
                   title={lockedOptions.shadowOpacity ? 'Unlock' : 'Lock'}
                 >
                   {lockedOptions.shadowOpacity ? <Lock size={10} /> : <Unlock size={10} />}
                 </button>
                 <label className="text-xs font-bold uppercase tracking-wider opacity-70">Shadow Opacity</label>
               </div>
               <span className="text-xs font-mono opacity-50">{designOptions.shadowOpacity}%</span>
             </div>
             <input
               type="range" min="5" max="50" step="5"
               value={designOptions.shadowOpacity}
               onChange={(e) => updateOption('shadowOpacity', parseInt(e.target.value))}
               className="w-full h-1.5 rounded-lg cursor-pointer"
               style={{ color: shellTheme.primary }}
             />
             <div className="flex justify-between text-[10px] opacity-40 px-0.5">
               <span>5%</span><span>50%</span>
             </div>
           </div>

           {/* Corner Radius */}
           <div className="space-y-2 group/opt">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-1.5">
                 <button
                   onClick={() => toggleOptionLock('radius')}
                   className={`p-0.5 rounded transition-all ${lockedOptions.radius ? 'opacity-100 text-t-primary' : 'opacity-0 group-hover/opt:opacity-60 hover:!opacity-100'}`}
                   title={lockedOptions.radius ? 'Unlock' : 'Lock'}
                 >
                   {lockedOptions.radius ? <Lock size={10} /> : <Unlock size={10} />}
                 </button>
                 <label className="text-xs font-bold uppercase tracking-wider opacity-70">Roundness</label>
               </div>
               <span className="text-xs font-mono opacity-50">Lvl {designOptions.radius}</span>
             </div>
             <input
               type="range" min="0" max="5" step="1"
               value={designOptions.radius}
               onChange={(e) => updateOption('radius', parseInt(e.target.value))}
               className="w-full h-1.5 rounded-lg cursor-pointer"
               style={{ color: shellTheme.primary }}
             />
             <div className="flex justify-between text-[10px] opacity-40 px-0.5">
               <span>Square</span><span>Round</span>
             </div>
           </div>
          </div>

          {/* Row 2: Color Adjustments */}
          <div className="pt-2 border-t space-y-3" style={{ borderColor: `${shellTheme.border}60` }}>
            <div className="flex items-center justify-between gap-4">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70">Color Adjustments</label>
              
              {/* Split Light / Dark Toggle - Moved here for better access */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDesignOptions(prev => {
                      if (!prev.splitAdjustments) {
                        return {
                          ...prev,
                          splitAdjustments: true,
                          lightBrightnessLevel: prev.brightnessLevel,
                          lightContrastLevel: prev.contrastLevel,
                          lightSaturationLevel: prev.saturationLevel,
                          darkBrightnessLevel: prev.brightnessLevel,
                          darkContrastLevel: prev.contrastLevel,
                          darkSaturationLevel: prev.saturationLevel,
                        };
                      }
                      return { ...prev, splitAdjustments: false };
                    });
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span
                    className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200"
                    style={{ backgroundColor: designOptions.splitAdjustments ? shellTheme.primary : `${shellTheme.text}30` }}
                  >
                    <span className={`inline-block h-2.5 w-2.5 rounded-full shadow transition-transform duration-200 ${designOptions.splitAdjustments ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} style={{ backgroundColor: designOptions.splitAdjustments ? shellTheme.primaryFg : shellTheme.bg }} />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Split Light / Dark
                  </span>
                </button>
              </div>
            </div>

           {/* Shared sliders (when split is off) */}
           {!designOptions.splitAdjustments && (
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
               {/* Saturation */}
               <div className="space-y-2 group/opt">
                 <div className="flex justify-between items-center">
                   <div className="flex items-center gap-1.5">
                     <button
                       onClick={() => toggleOptionLock('saturationLevel')}
                       className={`p-0.5 rounded transition-all ${lockedOptions.saturationLevel ? 'opacity-100 text-t-primary' : 'opacity-0 group-hover/opt:opacity-60 hover:!opacity-100'}`}
                       title={lockedOptions.saturationLevel ? 'Unlock' : 'Lock'}
                     >
                       {lockedOptions.saturationLevel ? <Lock size={10} /> : <Unlock size={10} />}
                     </button>
                     <label className="text-xs font-bold uppercase tracking-wider opacity-70">Saturation</label>
                   </div>
                   <span className="text-xs font-mono opacity-50">{designOptions.saturationLevel > 0 ? '+' : ''}{designOptions.saturationLevel}</span>
                 </div>
                 <input
                   type="range" min="-5" max="5" step="1"
                   value={designOptions.saturationLevel}
                   onChange={(e) => updateOption('saturationLevel', parseInt(e.target.value))}
                   className="w-full h-1.5 rounded-lg cursor-pointer"
                   style={{ color: shellTheme.primary }}
                 />
                 <div className="flex justify-between text-[10px] opacity-40 px-0.5">
                   <span>Muted</span><span>Vivid</span>
                 </div>
               </div>

               {/* Brightness */}
               <div className="space-y-2 group/opt">
                 <div className="flex justify-between items-center">
                   <div className="flex items-center gap-1.5">
                     <button
                       onClick={() => toggleOptionLock('brightnessLevel')}
                       className={`p-0.5 rounded transition-all ${lockedOptions.brightnessLevel ? 'opacity-100 text-t-primary' : 'opacity-0 group-hover/opt:opacity-60 hover:!opacity-100'}`}
                       title={lockedOptions.brightnessLevel ? 'Unlock' : 'Lock'}
                 >
                   {lockedOptions.brightnessLevel ? <Lock size={10} /> : <Unlock size={10} />}
                     </button>
                     <label className="text-xs font-bold uppercase tracking-wider opacity-70">Brightness</label>
                   </div>
                   <span className="text-xs font-mono opacity-50">{designOptions.brightnessLevel > 0 ? '+' : ''}{designOptions.brightnessLevel}</span>
                 </div>
                 <input
                   type="range" min="-5" max="5" step="1"
                   value={designOptions.brightnessLevel}
                   onChange={(e) => updateOption('brightnessLevel', parseInt(e.target.value))}
                   className="w-full h-1.5 rounded-lg cursor-pointer"
                   style={{ color: shellTheme.primary }}
                 />
                 <div className="flex justify-between text-[10px] opacity-40 px-0.5">
                   <span>Dark</span><span>Bright</span>
                 </div>
               </div>

               {/* Contrast */}
               <div className="space-y-2 group/opt">
                 <div className="flex justify-between items-center">
                   <div className="flex items-center gap-1.5">
                     <button
                       onClick={() => toggleOptionLock('contrastLevel')}
                       className={`p-0.5 rounded transition-all ${lockedOptions.contrastLevel ? 'opacity-100 text-t-primary' : 'opacity-0 group-hover/opt:opacity-60 hover:!opacity-100'}`}
                       title={lockedOptions.contrastLevel ? 'Unlock' : 'Lock'}
                     >
                       {lockedOptions.contrastLevel ? <Lock size={10} /> : <Unlock size={10} />}
                     </button>
                     <label className="text-xs font-bold uppercase tracking-wider opacity-70">Contrast</label>
                   </div>
                   <span className="text-xs font-mono opacity-50">{designOptions.contrastLevel > 0 ? '+' : ''}{designOptions.contrastLevel}</span>
                 </div>
                 <input
                   type="range" min="-5" max="5" step="1"
                   value={designOptions.contrastLevel}
                   onChange={(e) => updateOption('contrastLevel', parseInt(e.target.value))}
                   className="w-full h-1.5 rounded-lg cursor-pointer"
                   style={{ color: shellTheme.primary }}
                 />
                 <div className="flex justify-between text-[10px] opacity-40 px-0.5">
                   <span>Soft</span><span>Max</span>
                 </div>
               </div>
             </div>
           )}

           {/* Per-mode sliders (when split is on) */}
           {designOptions.splitAdjustments && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Light Mode Adjustments */}
               <div className="space-y-3 p-3 rounded-lg border" style={{ borderColor: `${shellTheme.border}80`, backgroundColor: `${shellTheme.card}40` }}>
                 <div className="flex items-center gap-1.5">
                   <Sun size={13} className="opacity-70" />
                   <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Light Mode</span>
                 </div>
                 <div className="grid grid-cols-3 gap-x-3 gap-y-3">
                   {/* Light Saturation */}
                   <div className="space-y-1.5 group/opt">
                     <div className="flex justify-between items-center">
                       <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Saturation</label>
                       <span className="text-[10px] font-mono opacity-40">{designOptions.lightSaturationLevel > 0 ? '+' : ''}{designOptions.lightSaturationLevel}</span>
                     </div>
                     <input
                       type="range" min="-5" max="5" step="1"
                       value={designOptions.lightSaturationLevel}
                       onChange={(e) => updateOption('lightSaturationLevel', parseInt(e.target.value))}
                       className="w-full h-1.5 rounded-lg cursor-pointer"
                       style={{ color: shellTheme.primary }}
                     />
                     <div className="flex justify-between text-[9px] opacity-30 px-0.5">
                       <span>Muted</span><span>Vivid</span>
                     </div>
                   </div>
                   {/* Light Brightness */}
                   <div className="space-y-1.5 group/opt">
                     <div className="flex justify-between items-center">
                       <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Brightness</label>
                       <span className="text-[10px] font-mono opacity-40">{designOptions.lightBrightnessLevel > 0 ? '+' : ''}{designOptions.lightBrightnessLevel}</span>
                     </div>
                     <input
                       type="range" min="-5" max="5" step="1"
                       value={designOptions.lightBrightnessLevel}
                       onChange={(e) => updateOption('lightBrightnessLevel', parseInt(e.target.value))}
                       className="w-full h-1.5 rounded-lg cursor-pointer"
                       style={{ color: shellTheme.primary }}
                     />
                     <div className="flex justify-between text-[9px] opacity-30 px-0.5">
                       <span>Dark</span><span>Bright</span>
                     </div>
                   </div>
                   {/* Light Contrast */}
                   <div className="space-y-1.5 group/opt">
                     <div className="flex justify-between items-center">
                       <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Contrast</label>
                       <span className="text-[10px] font-mono opacity-40">{designOptions.lightContrastLevel > 0 ? '+' : ''}{designOptions.lightContrastLevel}</span>
                     </div>
                     <input
                       type="range" min="-5" max="5" step="1"
                       value={designOptions.lightContrastLevel}
                       onChange={(e) => updateOption('lightContrastLevel', parseInt(e.target.value))}
                       className="w-full h-1.5 rounded-lg cursor-pointer"
                       style={{ color: shellTheme.primary }}
                     />
                     <div className="flex justify-between text-[9px] opacity-30 px-0.5">
                       <span>Soft</span><span>Max</span>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Dark Mode Adjustments */}
               <div className="space-y-3 p-3 rounded-lg border" style={{ borderColor: `${shellTheme.border}80`, backgroundColor: `${shellTheme.card}40` }}>
                 <div className="flex items-center gap-1.5">
                   <Moon size={13} className="opacity-70" />
                   <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Dark Mode</span>
                 </div>
                 <div className="grid grid-cols-3 gap-x-3 gap-y-3">
                   {/* Dark Saturation */}
                   <div className="space-y-1.5 group/opt">
                     <div className="flex justify-between items-center">
                       <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Saturation</label>
                       <span className="text-[10px] font-mono opacity-40">{designOptions.darkSaturationLevel > 0 ? '+' : ''}{designOptions.darkSaturationLevel}</span>
                     </div>
                     <input
                       type="range" min="-5" max="5" step="1"
                       value={designOptions.darkSaturationLevel}
                       onChange={(e) => updateOption('darkSaturationLevel', parseInt(e.target.value))}
                       className="w-full h-1.5 rounded-lg cursor-pointer"
                       style={{ color: shellTheme.primary }}
                     />
                     <div className="flex justify-between text-[9px] opacity-30 px-0.5">
                       <span>Muted</span><span>Vivid</span>
                     </div>
                   </div>
                   {/* Dark Brightness */}
                   <div className="space-y-1.5 group/opt">
                     <div className="flex justify-between items-center">
                       <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Brightness</label>
                       <span className="text-[10px] font-mono opacity-40">{designOptions.darkBrightnessLevel > 0 ? '+' : ''}{designOptions.darkBrightnessLevel}</span>
                     </div>
                     <input
                       type="range" min="-5" max="5" step="1"
                       value={designOptions.darkBrightnessLevel}
                       onChange={(e) => updateOption('darkBrightnessLevel', parseInt(e.target.value))}
                       className="w-full h-1.5 rounded-lg cursor-pointer"
                       style={{ color: shellTheme.primary }}
                     />
                     <div className="flex justify-between text-[9px] opacity-30 px-0.5">
                       <span>Dark</span><span>Bright</span>
                     </div>
                   </div>
                   {/* Dark Contrast */}
                   <div className="space-y-1.5 group/opt">
                     <div className="flex justify-between items-center">
                       <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Contrast</label>
                       <span className="text-[10px] font-mono opacity-40">{designOptions.darkContrastLevel > 0 ? '+' : ''}{designOptions.darkContrastLevel}</span>
                     </div>
                     <input
                       type="range" min="-5" max="5" step="1"
                       value={designOptions.darkContrastLevel}
                       onChange={(e) => updateOption('darkContrastLevel', parseInt(e.target.value))}
                       className="w-full h-1.5 rounded-lg cursor-pointer"
                       style={{ color: shellTheme.primary }}
                     />
                     <div className="flex justify-between text-[9px] opacity-30 px-0.5">
                       <span>Soft</span><span>Max</span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           )}
          </div>

          {/* Row 3: Toggles */}
          <div className="flex flex-wrap gap-6 pt-2 border-t" style={{ borderColor: `${shellTheme.border}60` }}>
           {/* Dark First Toggle */}
           <div className="flex items-center gap-2 group/opt">
             <button
               onClick={() => toggleOptionLock('darkFirst')}
               className={`p-0.5 rounded transition-all ${lockedOptions.darkFirst ? 'opacity-100 text-t-primary' : 'opacity-0 group-hover/opt:opacity-60 hover:!opacity-100'}`}
               title={lockedOptions.darkFirst ? 'Unlock' : 'Lock'}
             >
               {lockedOptions.darkFirst ? <Lock size={10} /> : <Unlock size={10} />}
             </button>
             <button
               onClick={() => setDesignOptions(prev => ({ ...prev, darkFirst: !prev.darkFirst }))}
               onMouseDown={(e) => e.preventDefault()}
               className="flex items-center gap-2 cursor-pointer"
             >
               <span
                 className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200"
                 style={{ backgroundColor: designOptions.darkFirst ? shellTheme.primary : `${shellTheme.text}30` }}
               >
                 <span className={`inline-block h-3.5 w-3.5 rounded-full shadow transition-transform duration-200 ${designOptions.darkFirst ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} style={{ backgroundColor: designOptions.darkFirst ? shellTheme.primaryFg : shellTheme.bg }} />
               </span>
               <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                 Dark First
               </span>
             </button>
           </div>

           {/* Gradients Toggle */}
           <div className="flex items-center gap-2 group/opt">
             <button
               onClick={() => toggleOptionLock('gradients')}
               className={`p-0.5 rounded transition-all ${lockedOptions.gradients ? 'opacity-100 text-t-primary' : 'opacity-0 group-hover/opt:opacity-60 hover:!opacity-100'}`}
               title={lockedOptions.gradients ? 'Unlock' : 'Lock'}
             >
               {lockedOptions.gradients ? <Lock size={10} /> : <Unlock size={10} />}
             </button>
             <button
               onClick={() => setDesignOptions(prev => ({ ...prev, gradients: !prev.gradients }))}
               onMouseDown={(e) => e.preventDefault()}
               className="flex items-center gap-2 cursor-pointer"
             >
               <span
                 className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200"
                 style={{ backgroundColor: designOptions.gradients ? shellTheme.primary : `${shellTheme.text}30` }}
               >
                 <span className={`inline-block h-3.5 w-3.5 rounded-full shadow transition-transform duration-200 ${designOptions.gradients ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} style={{ backgroundColor: designOptions.gradients ? shellTheme.primaryFg : shellTheme.bg }} />
               </span>
               <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                 Gradients
               </span>
             </button>
           </div>

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
        
        {/* Split Preview */}
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-140px)]">
          {/* Light Side */}
          <div 
            className="w-full md:w-1/2 bg-t-bg transition-colors duration-500" 
            style={getStyleVars(currentTheme.light)}
          >
             <PreviewSection
               themeName="Light"
               themeTokens={currentTheme.light}
               options={designOptions}
               onUpdateOption={updateOption}
               onOpenImagePicker={() => setShowImagePickerModal(true)}
               onRandomize={handleRandomize}
               onExport={exportTheme}
               onShare={handleShare}
               onToggleSwatches={handleToggleSwatches}
               onToggleOptions={handleToggleOptions}
               onToggleHistory={handleToggleHistory}
               onToggleTheme={handleToggleTheme}
               autoSyncPreview={autoSyncPreview}
               onAutoSyncPreviewChange={setAutoSyncPreview}
               syncedWorkspaceTab={syncedWorkspaceTab}
               onSyncedWorkspaceTabChange={setSyncedWorkspaceTab}
             />
          </div>

          {/* Dark Side */}
          <div 
            className="w-full md:w-1/2 bg-t-bg transition-colors duration-500" 
            style={getStyleVars(currentTheme.dark)}
          >
             <PreviewSection
               themeName="Dark"
               themeTokens={currentTheme.dark}
               options={designOptions}
               onUpdateOption={updateOption}
               onOpenImagePicker={() => setShowImagePickerModal(true)}
               onRandomize={handleRandomize}
               onExport={exportTheme}
               onShare={handleShare}
               onToggleSwatches={handleToggleSwatches}
               onToggleOptions={handleToggleOptions}
               onToggleHistory={handleToggleHistory}
               onToggleTheme={handleToggleTheme}
               autoSyncPreview={autoSyncPreview}
               onAutoSyncPreviewChange={setAutoSyncPreview}
               syncedWorkspaceTab={syncedWorkspaceTab}
               onSyncedWorkspaceTabChange={setSyncedWorkspaceTab}
             />
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
        isDark={isDarkUI}
      />
    </div>
  );
};

export default App;
