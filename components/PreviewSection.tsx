import React, { useEffect, useState } from 'react';
import {
  Palette, Shuffle, Image as ImageIcon,
  ChevronRight, Check, Copy, Download, Share2,
  Sliders, Sparkles, Upload, Github,
  Lock
} from 'lucide-react';
import { DesignOptions, ThemeTokens } from '../types';

type WorkspaceTab = 'overview' | 'tokens' | 'delivery';

interface PreviewProps {
  themeName: string;
  themeTokens: ThemeTokens;
  options: DesignOptions;
  onUpdateOption?: (key: keyof DesignOptions, value: number | boolean) => void;
  onOpenImagePicker?: () => void;
  onRandomize?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onToggleSwatches?: () => void;
  onToggleOptions?: () => void;
  onToggleHistory?: () => void;
  onToggleTheme?: () => void;
  autoSyncPreview?: boolean;
  onAutoSyncPreviewChange?: (value: boolean) => void;
  syncedWorkspaceTab?: WorkspaceTab;
  onSyncedWorkspaceTabChange?: (tab: WorkspaceTab) => void;
}

// Controlled Slider Component
const ControlledSlider: React.FC<{
  rClass: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}> = ({ rClass, label, value, onChange, min = -5, max = 5 }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium text-t-text">{label}</label>
        <span className="text-xs font-mono text-t-primary font-bold">
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <input 
        type="range" 
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full h-1.5 ${rClass} cursor-pointer text-t-primary transition-colors`}
      />
    </div>
  );
};

// Color Swatch with Copy
const ColorSwatch: React.FC<{
  name: string;
  colorClass: string;
  description: string;
  rClass: string;
}> = ({ name, colorClass, description, rClass }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(`var(--${name})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <div 
      className={`relative flex w-full items-center gap-3 p-2 pr-8 bg-t-card/50 ${rClass} cursor-pointer hover:bg-t-card transition-colors group/swatch`}
      onClick={handleCopy}
    >
      <div className={`w-8 h-8 ${rClass} ${colorClass} shadow-inner shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-t-text truncate">{name}</div>
        <div className="text-[10px] text-t-textMuted truncate">{description}</div>
      </div>
      <span className="absolute right-2 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center">
        {copied ? (
          <Check size={14} className="text-t-good shrink-0" />
        ) : (
          <Copy size={14} className="text-t-textMuted opacity-0 group-hover/swatch:opacity-100 transition-opacity shrink-0" />
        )}
      </span>
    </div>
  );
};

const PreviewSection: React.FC<PreviewProps> = ({
  themeName,
  themeTokens,
  options,
  onUpdateOption,
  onOpenImagePicker,
  onRandomize,
  onExport,
  onShare,
  onToggleSwatches,
  onToggleOptions,
  onToggleHistory,
  onToggleTheme,
  autoSyncPreview,
  onAutoSyncPreviewChange,
  syncedWorkspaceTab,
  onSyncedWorkspaceTabChange
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => ({
    start: true,
    adjust: true,
    swatches: true,
    export: true
  }));
  const [localWorkspaceTab, setLocalWorkspaceTab] = useState<WorkspaceTab>('overview');
  const [reviewNotes, setReviewNotes] = useState('Check contrast for body text and confirm brand accents.');
  const [deliveryNote, setDeliveryNote] = useState('Theme ready for QA. Share CSS tokens with engineering.');
  const [tokenFilter, setTokenFilter] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [reviewLevel, setReviewLevel] = useState<'quick' | 'balanced' | 'deep'>('balanced');
  const [checklist, setChecklist] = useState({
    contrast: true,
    tokens: false,
    export: false
  });
  
  // Style utilities based on options
  const getRadius = (level: number) => {
    switch(level) {
      case 0: return 'rounded-none';
      case 1: return 'rounded-sm';
      case 2: return 'rounded-md';
      case 3: return 'rounded-lg';
      case 4: return 'rounded-xl';
      case 5: return 'rounded-2xl';
      default: return 'rounded-lg';
    }
  };
  
  const getBorder = (width: number) => {
    const clamped = Math.min(Math.max(width, 0), 2);
    if (clamped === 0) return 'border-0';
    if (clamped === 1) return 'border border-themed';
    return 'border-2 border-themed';
  };
  
  const getShadow = (strength: number, opacity: number) => {
    const clampedStrength = Math.min(Math.max(strength, 0), 5);
    const alpha = Math.min(Math.max(opacity, 0), 100) / 100;
    if (clampedStrength === 0) return 'shadow-none';
    const shadowLevels = [
      '',
      `0_1px_2px_0_rgba(0,0,0,${alpha})`,
      `0_1px_3px_0_rgba(0,0,0,${alpha}),_0_1px_2px_-1px_rgba(0,0,0,${alpha})`,
      `0_4px_6px_-1px_rgba(0,0,0,${alpha}),_0_2px_4px_-2px_rgba(0,0,0,${alpha})`,
      `0_10px_15px_-3px_rgba(0,0,0,${alpha}),_0_4px_6px_-4px_rgba(0,0,0,${alpha})`,
      `0_25px_50px_-12px_rgba(0,0,0,${alpha})`,
    ];
    return `shadow-[${shadowLevels[clampedStrength]}]`;
  };
  
  const rClass = getRadius(options.radius);
  const bClass = getBorder(options.borderWidth);
  const sClass = getShadow(options.shadowStrength, options.shadowOpacity);
  
  // Gradient class for buttons/backgrounds when enabled
  const gradientClass = options.gradients 
    ? 'bg-t-primary bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--primary),white_18%),color-mix(in_oklab,var(--primary),black_10%))]'
    : 'bg-t-primary';
  
  const gradientAccent = options.gradients 
    ? 'bg-t-accent bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--accent),white_18%),color-mix(in_oklab,var(--accent),black_10%))]'
    : 'bg-t-accent';
    
  const gradientSecondary = options.gradients 
    ? 'bg-t-secondary bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--secondary),white_18%),color-mix(in_oklab,var(--secondary),black_10%))]'
    : 'bg-t-secondary';

  // Hero overlay uses the theme's bg color so it stays consistent with
  // brightness/contrast adjustments (instead of hardcoded black/white)
  const heroOverlayOpacity = themeName === 'Dark' ? 'B3' : 'BF'; // B3=70%, BF=75%
  const badgeAccentClass = themeName === 'Dark' ? 'text-t-accent' : 'text-t-secondary';
  const hoverLiftClass = 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(0,0,0,0.16)]';
  const hoverPanelClass = 'transition-colors duration-200 hover:bg-t-bg/80';
  const hoverCardClass = 'transition-colors duration-200 hover:bg-t-card2';
  const tokenChipClass = 'font-semibold px-1.5 py-0.5 rounded bg-t-text/10';
  const neutralChipClass = 'font-semibold px-2 py-1 rounded bg-[color-mix(in_oklab,var(--text),transparent_12%)] ring-1 ring-[color-mix(in_oklab,var(--border),transparent_45%)]';
  const ringChipClass = 'font-semibold px-1.5 py-0.5 rounded bg-t-text/10 ring-1 ring-[var(--ring)]';
  const isAutoSync = autoSyncPreview ?? true;
  const activeWorkspaceTab = isAutoSync && syncedWorkspaceTab ? syncedWorkspaceTab : localWorkspaceTab;

  useEffect(() => {
    if (isAutoSync && syncedWorkspaceTab) {
      setLocalWorkspaceTab(syncedWorkspaceTab);
    }
  }, [isAutoSync, syncedWorkspaceTab]);

  const checklistItems = [
    { key: 'contrast', label: 'Contrast check verified', helper: 'Text on background passes AA.' },
    { key: 'tokens', label: 'Tokens locked', helper: 'Primary and accent are pinned.' },
    { key: 'export', label: 'Export package ready', helper: 'CSS + JSON prepared.' }
  ] as const;

  const completedCount = checklistItems.filter(item => checklist[item.key]).length;
  const checklistProgress = Math.round((completedCount / checklistItems.length) * 100);

  const tokenRows = [
    { key: 'primary', label: 'Primary', value: themeTokens.primary, varName: '--primary' },
    { key: 'secondary', label: 'Secondary', value: themeTokens.secondary, varName: '--secondary' },
    { key: 'accent', label: 'Accent', value: themeTokens.accent, varName: '--accent' },
    { key: 'good', label: 'Good', value: themeTokens.good, varName: '--good' },
    { key: 'bad', label: 'Bad', value: themeTokens.bad, varName: '--bad' },
    { key: 'bg', label: 'Background', value: themeTokens.bg, varName: '--bg' },
    { key: 'card', label: 'Surface', value: themeTokens.card, varName: '--card' },
    { key: 'text', label: 'Text', value: themeTokens.text, varName: '--text' },
    { key: 'border', label: 'Border', value: themeTokens.border, varName: '--border' },
    { key: 'ring', label: 'Ring', value: themeTokens.ring, varName: '--ring' }
  ];
  const filteredTokens = tokenRows.filter(token => {
    const query = tokenFilter.trim().toLowerCase();
    if (!query) return true;
    return (
      token.label.toLowerCase().includes(query) ||
      token.key.toLowerCase().includes(query) ||
      token.varName.toLowerCase().includes(query)
    );
  });

  const buildCssText = () => {
    const cssTokens: Array<[string, string]> = [
      ['--bg', themeTokens.bg],
      ['--card', themeTokens.card],
      ['--card2', themeTokens.card2],
      ['--text', themeTokens.text],
      ['--text-muted', themeTokens.textMuted],
      ['--text-on-color', themeTokens.textOnColor],
      ['--primary', themeTokens.primary],
      ['--primary-fg', themeTokens.primaryFg],
      ['--secondary', themeTokens.secondary],
      ['--secondary-fg', themeTokens.secondaryFg],
      ['--accent', themeTokens.accent],
      ['--accent-fg', themeTokens.accentFg],
      ['--border', themeTokens.border],
      ['--ring', themeTokens.ring],
      ['--good', themeTokens.good],
      ['--good-fg', themeTokens.goodFg],
      ['--warn', themeTokens.warn],
      ['--warn-fg', themeTokens.warnFg],
      ['--bad', themeTokens.bad],
      ['--bad-fg', themeTokens.badFg]
    ];
    const lines = cssTokens.map(([key, value]) => `  ${key}: ${value};`);
    return `:root {\n${lines.join('\n')}\n}\n`;
  };

  const handleCopyToken = (tokenKey: string, value: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(value);
    setCopiedToken(tokenKey);
    setTimeout(() => setCopiedToken(null), 1200);
  };

  const handleDownloadCss = () => {
    const cssText = buildCssText();
    const blob = new Blob([cssText], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taichi-${themeName.toLowerCase()}-theme.css`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleCopyTokens = () => {
    if (!navigator.clipboard) return;
    const cssText = buildCssText();
    navigator.clipboard.writeText(cssText);
  };

  const handleWorkspaceTabChange = (tab: WorkspaceTab) => {
    if (isAutoSync) {
      onSyncedWorkspaceTabChange?.(tab);
    } else {
      setLocalWorkspaceTab(tab);
    }
  };

  const handleAutoSyncToggle = (next: boolean) => {
    if (!next) {
      setLocalWorkspaceTab(activeWorkspaceTab);
    } else {
      onSyncedWorkspaceTabChange?.(localWorkspaceTab);
    }
    onAutoSyncPreviewChange?.(next);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="p-6 md:p-10 space-y-10 bg-t-bg min-h-full">
      
      {/* Hero Section with Background Image */}
      <section
        className={`relative overflow-hidden ${rClass} ${bClass} ${sClass} ${hoverLiftClass} p-8 md:p-12`}
        style={{
          backgroundImage: `url('/hero-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Solid Color Overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `${themeTokens.bg}${heroOverlayOpacity}` }} />

        <div className={`absolute left-4 top-4 z-10 inline-flex items-center justify-center ${rClass} ${bClass} px-3 py-1.5 text-[11px] font-semibold backdrop-blur leading-none`} style={{ backgroundColor: themeTokens.card, color: themeTokens.text }}>
          <span className={badgeAccentClass}>{themeName} preview</span>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-2 pt-8">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tight text-left leading-tight">
            <span className="text-t-text block">Taichi</span>
            <span className="block">
              <span className={`bg-clip-text text-transparent ${options.gradients ? 'bg-t-primary bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--primary),white_18%),color-mix(in_oklab,var(--primary),black_10%))]' : 'bg-t-primary'}`}>
                Theme Generator
              </span>
            </span>
          </h1>
          <p className="text-lg text-t-textMuted max-w-xl text-left pt-4">
            Generate balanced color palettes using the <strong className="text-t-primary">OKLCH color space</strong>, automatically create matching light and dark themes, and tune{' '}
            <span className={`text-t-bg ${neutralChipClass}`}>background</span>,{' '}
            <span className={`text-t-card ${neutralChipClass}`}>surface</span>,{' '}
            <span className="text-t-text font-semibold">text</span>,{' '}
            <span className="text-t-text font-semibold px-2 py-1 rounded ring-1 ring-t-border">border</span>,{' '}
            <span className={`text-t-text ${ringChipClass}`}>ring</span>,{' '}
            <span className={`text-t-primary ${tokenChipClass}`}>primary</span>,{' '}
            <span className={`text-t-secondary ${tokenChipClass}`}>secondary</span>,{' '}
            <span className={`text-t-accent ${tokenChipClass}`}>accent</span>,{' '}
            <span className={`text-t-good ${tokenChipClass}`}>good</span>, and{' '}
            <span className={`text-t-bad ${tokenChipClass}`}>bad</span> colors across real UI components. Export CSS variables and share themes with your team.
          </p>
          <p className="text-sm text-t-textMuted max-w-xl text-left pt-2">
            Press [Space] to Generate a new theme
          </p>
        </div>
        
        {/* Glass Edge */}
        <div className={`absolute inset-0 ${rClass} ${bClass} pointer-events-none`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          {/* Generator Actions */}
          <section className={`${bClass} ${rClass} ${sClass} ${hoverLiftClass} ${hoverCardClass} bg-t-card overflow-hidden`}>
            <button 
              onClick={() => toggleSection('start')}
              className="w-full flex items-center justify-between p-4 hover:bg-t-card2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${rClass} ${gradientClass} flex items-center justify-center text-t-primaryFg`}>
                  <Shuffle size={20} />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-t-text">Generator Actions</h2>
                  <p className="text-sm text-t-textMuted">Upload an image or press Space to randomize</p>
                </div>
              </div>
              <ChevronRight className={`text-t-textMuted transition-transform ${expandedSections.start ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.start && (
              <div className="border-t border-themed p-6 space-y-4">
                <p className="text-sm text-t-textMuted">
                  Start by uploading an image to extract colors, or press <kbd className="px-2 py-1 bg-t-text/10 rounded text-t-text font-mono text-xs">Space</kbd> to generate a random harmonious palette.
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => onOpenImagePicker?.()}
                    className={`${gradientAccent} text-t-accentFg px-6 py-3 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}
                  >
                    <Upload size={18} />
                    Upload Image
                  </button>
                  
                  <button
                    onClick={onRandomize}
                    disabled={!onRandomize}
                    className={`${gradientClass} text-t-primaryFg px-6 py-3 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Shuffle size={18} />
                    Randomize
                    <span className="text-xs opacity-75 ml-1 px-2 py-0.5 rounded" style={{ backgroundColor: `${themeTokens.primaryFg}25` }}>Space</span>
                  </button>
                </div>
                
                <div className={`p-4 ${rClass} ${bClass} bg-t-primary/10 border-t-primary/30 transition-colors hover:bg-t-primary/15`}>
                  <p className="text-sm text-t-primary flex items-start gap-2">
                    <Sparkles size={16} className="shrink-0 mt-0.5" />
                    <span><strong>Pro tip:</strong> Lock colors or options you want to keep, then generate to only change the unlocked ones.</span>
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Color Tokens */}
          <section className={`${bClass} ${rClass} ${sClass} ${hoverLiftClass} ${hoverCardClass} bg-t-card overflow-hidden`}>
            <button 
              onClick={() => toggleSection('swatches')}
              className="w-full flex items-center justify-between p-4 hover:bg-t-card2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${rClass} bg-t-good flex items-center justify-center text-t-goodFg`}>
                  <Palette size={20} />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-t-text">Color Tokens</h2>
                  <p className="text-sm text-t-textMuted">Click any token to copy its CSS variable</p>
                </div>
              </div>
              <ChevronRight className={`text-t-textMuted transition-transform ${expandedSections.swatches ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.swatches && (
              <div className="border-t border-themed p-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <ColorSwatch name="primary" colorClass="bg-t-primary" description="Main brand" rClass={rClass} />
                  <ColorSwatch name="secondary" colorClass="bg-t-secondary" description="Supporting" rClass={rClass} />
                  <ColorSwatch name="accent" colorClass="bg-t-accent" description="Highlight" rClass={rClass} />
                  <ColorSwatch name="bg" colorClass={`bg-t-bg ${bClass}`} description="Background" rClass={rClass} />
                  <ColorSwatch name="card" colorClass={`bg-t-card ${bClass}`} description="Cards" rClass={rClass} />
                  <ColorSwatch name="text" colorClass="bg-t-text" description="Primary text" rClass={rClass} />
                  <ColorSwatch name="textMuted" colorClass="bg-t-textMuted" description="Muted text" rClass={rClass} />
                  <ColorSwatch name="good" colorClass="bg-t-good" description="Success" rClass={rClass} />
                  <ColorSwatch name="warn" colorClass="bg-t-warn" description="Warning" rClass={rClass} />
                  <ColorSwatch name="bad" colorClass="bg-t-bad" description="Error" rClass={rClass} />
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Palette Controls */}
          <section className={`${bClass} ${rClass} ${sClass} ${hoverLiftClass} ${hoverCardClass} bg-t-card overflow-hidden`}>
            <button 
              onClick={() => toggleSection('adjust')}
              className="w-full flex items-center justify-between p-4 hover:bg-t-card2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${rClass} ${gradientSecondary} flex items-center justify-center text-t-secondaryFg`}>
                  <Sliders size={20} />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-t-text">Palette Controls</h2>
                  <p className="text-sm text-t-textMuted">Fine-tune saturation, brightness, and contrast</p>
                </div>
              </div>
              <ChevronRight className={`text-t-textMuted transition-transform ${expandedSections.adjust ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.adjust && (
              <div className="border-t border-themed p-6 space-y-6">
                <p className="text-sm text-t-textMuted">
                  These sliders affect how colors are generated. Changes apply in real-time.
                </p>
                
                {onUpdateOption ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ControlledSlider 
                      rClass={rClass}
                      label="Saturation" 
                      value={options.saturationLevel}
                      onChange={(v) => onUpdateOption('saturationLevel', v)}
                    />
                    <ControlledSlider 
                      rClass={rClass}
                      label="Brightness" 
                      value={options.brightnessLevel}
                      onChange={(v) => onUpdateOption('brightnessLevel', v)}
                    />
                    <ControlledSlider 
                      rClass={rClass}
                      label="Contrast" 
                      value={options.contrastLevel}
                      onChange={(v) => onUpdateOption('contrastLevel', v)}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-t-textMuted italic">Controls not available in this view</p>
                )}
                
                <div className="flex flex-wrap gap-6 pt-4 border-t border-themed">
                  <button
                    onClick={() => onUpdateOption?.('darkFirst', !options.darkFirst)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <span
                      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
                      style={{ backgroundColor: options.darkFirst ? themeTokens.primary : `${themeTokens.text}30` }}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full shadow transition-transform duration-200 ${options.darkFirst ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} style={{ backgroundColor: options.darkFirst ? themeTokens.primaryFg : themeTokens.bg }} />
                    </span>
                    <div className="text-left">
                      <span className="text-sm font-medium text-t-text group-hover:text-t-primary transition-colors">Dark First</span>
                      <p className="text-xs text-t-textMuted">Generate dark theme as primary</p>
                    </div>
                  </button>

                  <button
                    onClick={() => onUpdateOption?.('gradients', !options.gradients)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <span
                      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
                      style={{ backgroundColor: options.gradients ? themeTokens.primary : `${themeTokens.text}30` }}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full shadow transition-transform duration-200 ${options.gradients ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} style={{ backgroundColor: options.gradients ? themeTokens.primaryFg : themeTokens.bg }} />
                    </span>
                    <div className="text-left">
                      <span className="text-sm font-medium text-t-text group-hover:text-t-primary transition-colors">Gradients</span>
                      <p className="text-xs text-t-textMuted">Apply gradients to colored elements</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Export & Share */}
          <section className={`${bClass} ${rClass} ${sClass} ${hoverLiftClass} ${hoverCardClass} bg-t-card overflow-hidden`}>
            <button 
              onClick={() => toggleSection('export')}
              className="w-full flex items-center justify-between p-4 hover:bg-t-card2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${rClass} bg-t-text text-t-bg flex items-center justify-center`}>
                  <Download size={20} />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-t-text">Export & Share</h2>
                  <p className="text-sm text-t-textMuted">Download CSS or share via URL</p>
                </div>
              </div>
              <ChevronRight className={`text-t-textMuted transition-transform ${expandedSections.export ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.export && (
              <div className="border-t border-themed p-6 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleDownloadCss}
                    className={`${gradientClass} text-t-primaryFg px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}
                  >
                    <Download size={16} />
                    Download CSS
                  </button>

                  <button
                    onClick={onShare}
                    disabled={!onShare}
                    className={`${gradientSecondary} text-t-secondaryFg px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Share2 size={16} />
                    Share URL
                  </button>
                  
                  <button
                    onClick={handleCopyTokens}
                    className={`bg-t-text/10 text-t-text px-5 py-2.5 ${rClass} font-medium ${bClass} ${sClass} transition-all hover:bg-t-text/20 active:scale-95 flex items-center gap-2`}
                  >
                    <Copy size={16} />
                    Copy All Tokens
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className={`${bClass} ${rClass} ${sClass} ${hoverLiftClass} ${hoverCardClass} bg-t-card p-6 space-y-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-t-textMuted">Workspace</p>
            <h2 className="text-xl font-bold text-t-text">Theme Review Hub</h2>
            <p className="text-sm text-t-textMuted">
              Validate tokens, track readiness, and prep exports without leaving the preview.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRandomize}
              disabled={!onRandomize}
              className={`${gradientClass} text-t-primaryFg px-3 py-2 ${rClass} ${sClass} text-xs font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Shuffle size={14} />
              New Variation
            </button>
            <button
              onClick={handleCopyTokens}
              className={`bg-t-text/10 text-t-text px-3 py-2 ${rClass} ${bClass} text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-t-text/20`}
            >
              <Copy size={14} />
              Copy CSS
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['overview', 'tokens', 'delivery'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleWorkspaceTabChange(tab)}
              className={`${rClass} px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeWorkspaceTab === tab
                  ? 'bg-t-primary/15 text-t-primary hover:bg-t-primary/20'
                  : 'bg-t-text/10 text-t-text hover:bg-t-text/20 hover:text-t-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeWorkspaceTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-5 space-y-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-t-textMuted">Readiness</p>
                  <h3 className="text-lg font-semibold text-t-text">Theme checklist</h3>
                </div>
                <span className={`text-xs font-semibold ${rClass} bg-t-primary/15 text-t-primary px-2 py-1`}>
                  {checklistProgress}% ready
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-t-text/10">
                <div
                  className={`h-full ${rClass} ${gradientClass}`}
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <label key={item.key} className="flex items-start gap-3 text-sm text-t-text">
                    <input
                      type="checkbox"
                      checked={checklist[item.key]}
                      onChange={() =>
                        setChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                      className="mt-1 h-4 w-4"                    />
                    <span>
                      <span className="font-semibold">{item.label}</span>
                      <span className="block text-xs text-t-textMuted">{item.helper}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-5 space-y-3`}>
                <label className="text-xs font-semibold uppercase tracking-wider text-t-textMuted">
                  Review Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className={`w-full resize-none px-3 py-2 ${rClass} ${bClass} bg-t-bg text-sm text-t-text focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
                />
                <label className="flex items-center justify-between text-xs text-t-textMuted">
                  <span>Auto-sync preview: {isAutoSync ? 'On' : 'Off'}</span>
                  <input
                    type="checkbox"
                    checked={isAutoSync}
                    onChange={(e) => handleAutoSyncToggle(e.target.checked)}
                    className="h-4 w-4"                  />
                </label>
              </div>
              <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-5 space-y-3`}>
                <label className="text-xs font-semibold uppercase tracking-wider text-t-textMuted">
                  Review depth
                </label>
                <select
                  value={reviewLevel}
                  onChange={(e) => setReviewLevel(e.target.value as typeof reviewLevel)}
                  className={`w-full px-3 py-2 ${rClass} ${bClass} bg-t-bg text-sm text-t-text focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
                >
                  <option value="quick">Quick pass</option>
                  <option value="balanced">Balanced review</option>
                  <option value="deep">Deep audit</option>
                </select>
                <button
                  onClick={onToggleTheme}
                  disabled={!onToggleTheme}
                  className={`w-full ${rClass} ${bClass} bg-t-card text-sm font-semibold text-t-text py-2 transition-colors hover:bg-t-card2 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  Toggle UI theme preview
                </button>
              </div>
            </div>
          </div>
        )}

        {activeWorkspaceTab === 'tokens' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-t-textMuted">Token inventory</p>
                <h3 className="text-lg font-semibold text-t-text">Core theme tokens</h3>
              </div>
              <input
                value={tokenFilter}
                onChange={(e) => setTokenFilter(e.target.value)}
                placeholder="Filter tokens"
                className={`w-full sm:w-56 px-3 py-2 ${rClass} ${bClass} bg-t-bg text-sm text-t-text focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
              />
            </div>
            <div className="space-y-2">
              {filteredTokens.map((token) => (
                <div
                  key={token.key}
                  className={`flex flex-wrap items-center justify-between gap-3 ${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 px-3 py-2`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-8 w-8 ${rClass} ${bClass}`}
                      style={{ backgroundColor: token.value }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-t-text truncate">{token.label}</p>
                      <p className="text-[11px] text-t-textMuted">{token.varName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-t-text">
                    <span className="truncate">{token.value}</span>
                    <button
                      onClick={() => handleCopyToken(token.key, token.value)}
                      className={`flex items-center justify-center ${rClass} ${bClass} bg-t-card px-2 py-1 text-xs transition-colors hover:bg-t-card2`}
                    >
                      {copiedToken === token.key ? (
                        <Check size={12} className="text-t-good" />
                      ) : (
                        <Copy size={12} className="text-t-textMuted" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {filteredTokens.length === 0 && (
                <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 px-3 py-6 text-center text-sm text-t-textMuted`}>
                  No tokens match that filter.
                </div>
              )}
            </div>
          </div>
        )}

        {activeWorkspaceTab === 'delivery' && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-5 space-y-4`}>
              <div>
                <p className="text-xs uppercase tracking-wider text-t-textMuted">Deliverables</p>
                <h3 className="text-lg font-semibold text-t-text">Exports & sharing</h3>
              </div>
              <p className="text-sm text-t-textMuted">
                Package tokens for engineering or share a live URL with your team.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadCss}
                  className={`${gradientClass} text-t-primaryFg px-3 py-2 ${rClass} ${sClass} text-xs font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95`}
                >
                  <Download size={14} />
                  Download CSS
                </button>
                <button
                  onClick={onExport}
                  disabled={!onExport}
                  className={`bg-t-text/10 text-t-text px-3 py-2 ${rClass} ${bClass} text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-t-text/20 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <Download size={14} />
                  Export JSON
                </button>
                <button
                  onClick={onShare}
                  disabled={!onShare}
                  className={`bg-t-text/10 text-t-text px-3 py-2 ${rClass} ${bClass} text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-t-text/20 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <Share2 size={14} />
                  Share URL
                </button>
              </div>
            </div>
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-5 space-y-4`}>
              <div>
                <p className="text-xs uppercase tracking-wider text-t-textMuted">Release note</p>
                <h3 className="text-lg font-semibold text-t-text">Team update</h3>
              </div>
              <textarea
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                rows={5}
                className={`w-full resize-none px-3 py-2 ${rClass} ${bClass} bg-t-bg text-sm text-t-text focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (!navigator.clipboard) return;
                    navigator.clipboard.writeText(deliveryNote);
                  }}
                  className={`bg-t-text/10 text-t-text px-3 py-2 ${rClass} ${bClass} text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-t-text/20`}
                >
                  <Copy size={14} />
                  Copy note
                </button>
                <button
                  onClick={onShare}
                  disabled={!onShare}
                  className={`${gradientSecondary} text-t-secondaryFg px-3 py-2 ${rClass} ${sClass} text-xs font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <Share2 size={14} />
                  Open share sheet
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className={`relative overflow-hidden ${bClass} ${rClass} ${sClass} ${hoverLiftClass} ${hoverCardClass} bg-t-card p-6`}>
        <div className="absolute -top-20 -right-16 h-44 w-44 rounded-full bg-t-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 left-12 h-52 w-52 rounded-full bg-t-accent/15 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,var(--primary)_0%,transparent_70%)] opacity-10" />

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-t-textMuted">
              <span className="h-2.5 w-2.5 rounded-full bg-t-primary" />
              Component Showcase
            </div>
            <h2 className="text-lg font-bold">
              <span className="text-t-primary">Your Theme</span>{' '}
              <span className="text-t-accent">In Action</span>
            </h2>
            <p className="text-sm text-t-textMuted max-w-xl">
              Every component below uses your generated tokens. Press <kbd className="px-1.5 py-0.5 rounded bg-t-text/10 font-mono text-[10px] text-t-text">Space</kbd> to regenerate and watch them all update.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {/* Buttons */}
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-textMuted">Buttons</p>
              <div className="flex flex-wrap gap-2">
                <button className={`${gradientClass} text-t-primaryFg px-4 py-2 ${rClass} ${sClass} text-xs font-semibold transition-all hover:scale-105 active:scale-95`}>
                  Primary
                </button>
                <button className={`${gradientSecondary} text-t-secondaryFg px-4 py-2 ${rClass} ${sClass} text-xs font-semibold transition-all hover:scale-105 active:scale-95`}>
                  Secondary
                </button>
                <button className={`${gradientAccent} text-t-accentFg px-4 py-2 ${rClass} ${sClass} text-xs font-semibold transition-all hover:scale-105 active:scale-95`}>
                  Accent
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={`bg-t-primary/15 text-t-primary px-4 py-2 ${rClass} ${bClass} text-xs font-semibold transition-colors hover:bg-t-primary/25`}>
                  Soft
                </button>
                <button className={`bg-t-text/10 text-t-text px-4 py-2 ${rClass} ${bClass} text-xs font-semibold transition-colors hover:bg-t-text/20`}>
                  Ghost
                </button>
                <button className={`bg-t-bad text-t-badFg px-4 py-2 ${rClass} ${sClass} text-xs font-semibold transition-all hover:scale-105 active:scale-95`}>
                  Danger
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button disabled className={`${gradientClass} text-t-primaryFg px-4 py-2 ${rClass} text-xs font-semibold opacity-50 cursor-not-allowed`}>
                  Disabled
                </button>
                <button className={`bg-transparent text-t-primary px-4 py-2 ${rClass} text-xs font-semibold underline underline-offset-2 transition-colors hover:text-t-accent`}>
                  Link
                </button>
              </div>
            </div>

            {/* Badges & Tags */}
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-textMuted">Badges & Tags</p>
              <div className="flex flex-wrap gap-2">
                <span className={`${rClass} bg-t-primary/15 px-2.5 py-1 text-[11px] font-semibold text-t-primary`}>Primary</span>
                <span className={`${rClass} bg-t-secondary/15 px-2.5 py-1 text-[11px] font-semibold text-t-secondary`}>Secondary</span>
                <span className={`${rClass} bg-t-accent/15 px-2.5 py-1 text-[11px] font-semibold text-t-accent`}>Accent</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`${rClass} bg-t-good/15 px-2.5 py-1 text-[11px] font-semibold text-t-good`}>Deployed</span>
                <span className={`${rClass} bg-t-warn/15 px-2.5 py-1 text-[11px] font-semibold text-t-warn`}>Pending</span>
                <span className={`${rClass} bg-t-bad/15 px-2.5 py-1 text-[11px] font-semibold text-t-bad`}>Failed</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`${rClass} ${bClass} px-2.5 py-1 text-[11px] font-semibold text-t-text`}>Outlined</span>
                <span className={`${rClass} bg-t-primary text-t-primaryFg px-2.5 py-1 text-[11px] font-semibold`}>Solid</span>
                <span className={`rounded-full bg-t-accent/15 px-2.5 py-1 text-[11px] font-semibold text-t-accent`}>Pill</span>
              </div>
            </div>

            {/* Typography */}
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-textMuted">Typography</p>
              <div className="space-y-1.5">
                <p className="text-xl font-black text-t-text leading-tight">Display Heading</p>
                <p className="text-sm font-semibold text-t-text">Section Title</p>
                <p className="text-xs text-t-text">Body text uses your primary text token for maximum readability on the background surface.</p>
                <p className="text-xs text-t-textMuted">Muted text for secondary information and helpers.</p>
                <p className="text-xs"><span className="text-t-primary font-semibold">Primary link</span> &middot; <span className="text-t-accent font-semibold">Accent link</span> &middot; <span className="text-t-secondary font-semibold">Secondary link</span></p>
              </div>
            </div>

            {/* Form Controls */}
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-textMuted">Form Controls</p>
              <input
                type="text"
                placeholder="Email address"
                className={`w-full px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs text-t-text focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
              />
              <div className="grid grid-cols-2 gap-2">
                <select className={`w-full px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs text-t-text cursor-pointer focus:outline-none focus:ring-2 focus:ring-t-primary/30`}>
                  <option>Designer</option>
                  <option>Developer</option>
                  <option>Product</option>
                </select>
                <input
                  type="text"
                  placeholder="Search..."
                  className={`w-full px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs text-t-text focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-t-text cursor-pointer">
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                  <span>Remember me</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-t-text cursor-pointer">
                  <input type="radio" name="demo" defaultChecked className="h-4 w-4" />
                  <span>Option A</span>
                </label>
              </div>
              <textarea
                rows={2}
                placeholder="Leave a note..."
                className={`w-full resize-none px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs text-t-text focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
              />
            </div>

            {/* Alerts & Banners */}
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-textMuted">Alerts & Banners</p>
              <div className={`${rClass} ${bClass} bg-t-good/15 border-t-good/30 px-3 py-2.5 text-xs text-t-good flex items-center gap-2`}>
                <Check size={14} className="shrink-0" />
                <span><strong>Success:</strong> Changes saved to your theme.</span>
              </div>
              <div className={`${rClass} ${bClass} bg-t-warn/15 border-t-warn/30 px-3 py-2.5 text-xs text-t-warn flex items-center gap-2`}>
                <Sparkles size={14} className="shrink-0" />
                <span><strong>Warning:</strong> Low contrast on muted text.</span>
              </div>
              <div className={`${rClass} ${bClass} bg-t-bad/15 border-t-bad/30 px-3 py-2.5 text-xs text-t-bad flex items-center gap-2`}>
                <Lock size={14} className="shrink-0" />
                <span><strong>Error:</strong> Export failed. Retry?</span>
              </div>
              <div className={`${rClass} ${bClass} bg-t-primary/10 border-t-primary/30 px-3 py-2.5 text-xs text-t-primary flex items-center gap-2`}>
                <Sparkles size={14} className="shrink-0" />
                <span><strong>Info:</strong> New palette generated.</span>
              </div>
            </div>

            {/* Cards & Surfaces */}
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-textMuted">Cards & Surfaces</p>
              <div className={`${rClass} ${bClass} ${sClass} bg-t-card p-3 space-y-2`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 ${rClass} ${gradientClass} flex items-center justify-center text-t-primaryFg text-xs font-bold`}>T</div>
                  <div>
                    <p className="text-xs font-semibold text-t-text">Theme Card</p>
                    <p className="text-[10px] text-t-textMuted">bg-t-card surface</p>
                  </div>
                </div>
                <div className={`${rClass} bg-t-card2 p-2 text-[10px] text-t-textMuted`}>
                  Nested bg-t-card2 surface
                </div>
              </div>
              <div className={`${rClass} ${bClass} bg-t-bg p-3 space-y-1`}>
                <p className="text-xs font-semibold text-t-text">Base Surface</p>
                <p className="text-[10px] text-t-textMuted">bg-t-bg — the page background itself</p>
              </div>
            </div>

            {/* Progress & Metrics */}
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-textMuted">Progress & Metrics</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-t-text font-semibold">Primary</span>
                  <span className="text-t-primary font-semibold">72%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-t-text/10">
                  <div className={`h-full rounded-full ${gradientClass}`} style={{ width: '72%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-t-text font-semibold">Accent</span>
                  <span className="text-t-accent font-semibold">45%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-t-text/10">
                  <div className={`h-full rounded-full ${gradientAccent}`} style={{ width: '45%' }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className={`${rClass} ${bClass} bg-t-card p-2 text-center`}>
                  <p className="text-lg font-bold text-t-primary">24</p>
                  <p className="text-[10px] text-t-textMuted">Tokens</p>
                </div>
                <div className={`${rClass} ${bClass} bg-t-card p-2 text-center`}>
                  <p className="text-lg font-bold text-t-accent">2</p>
                  <p className="text-[10px] text-t-textMuted">Themes</p>
                </div>
                <div className={`${rClass} ${bClass} bg-t-card p-2 text-center`}>
                  <p className="text-lg font-bold text-t-good">AA</p>
                  <p className="text-[10px] text-t-textMuted">WCAG</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-textMuted">Navigation</p>
              <div className="flex gap-1">
                <button className={`${rClass} bg-t-primary/15 px-3 py-1.5 text-[11px] font-semibold text-t-primary`}>Active</button>
                <button className={`${rClass} bg-t-text/10 px-3 py-1.5 text-[11px] font-semibold text-t-text hover:bg-t-text/20 transition-colors`}>Tokens</button>
                <button className={`${rClass} bg-t-text/10 px-3 py-1.5 text-[11px] font-semibold text-t-text hover:bg-t-text/20 transition-colors`}>Export</button>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-t-textMuted">
                <span className="text-t-primary">Home</span>
                <ChevronRight size={10} />
                <span className="text-t-primary">Themes</span>
                <ChevronRight size={10} />
                <span className="text-t-text font-semibold">Current</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-t-text font-semibold">Page 2 of 5</span>
                <div className="flex items-center gap-1">
                  <button className={`${rClass} ${bClass} bg-t-card px-2 py-1 text-[11px] text-t-text transition-colors hover:bg-t-card2`}>1</button>
                  <button className={`${rClass} ${bClass} bg-t-primary/15 px-2 py-1 text-[11px] text-t-primary font-semibold`}>2</button>
                  <button className={`${rClass} ${bClass} bg-t-card px-2 py-1 text-[11px] text-t-text transition-colors hover:bg-t-card2`}>3</button>
                  <button className={`${rClass} ${bClass} bg-t-card px-2 py-1 text-[11px] text-t-text transition-colors hover:bg-t-card2`}>4</button>
                  <button className={`${rClass} ${bClass} bg-t-card px-2 py-1 text-[11px] text-t-text transition-colors hover:bg-t-card2`}>5</button>
                </div>
              </div>
            </div>

            {/* List Items */}
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-textMuted">List Items</p>
              <div className="space-y-1.5">
                {[
                  { name: 'Background', token: '--bg', color: 'bg-t-bg' },
                  { name: 'Primary', token: '--primary', color: 'bg-t-primary' },
                  { name: 'Accent', token: '--accent', color: 'bg-t-accent' },
                ].map((item) => (
                  <div key={item.token} className={`flex items-center gap-3 ${rClass} ${bClass} bg-t-card px-3 py-2 transition-colors hover:bg-t-card2`}>
                    <div className={`w-5 h-5 ${rClass} ${item.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-t-text">{item.name}</p>
                      <p className="text-[10px] text-t-textMuted font-mono">{item.token}</p>
                    </div>
                    <Copy size={12} className="text-t-textMuted shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-6 pt-10 pb-8 border-t border-themed transition-colors duration-500">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <a 
              href="https://www.producthunt.com/products/taichi-light-dark-theme-generator?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-taichi-light-dark-theme-generator" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block hover:opacity-90 transition-opacity"
            >
              <img 
                alt="Taichi - Light & Dark Theme Generator - Generate perfectly matched Light & Dark UI themes | Product Hunt" 
                width="160" 
                height="35" 
                src={`https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1055269&theme=${themeName === 'Dark' ? 'dark' : 'light'}&t=1735400000000`} 
              />
            </a>
          </div>

          <div className="flex items-center gap-6">
            <a 
              href="/api-docs.html" 
              className="flex items-center gap-1.5 text-xs text-t-textMuted hover:text-t-primary transition-colors"
              title="API Documentation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              API
            </a>
            <a href="https://github.com/BucaaStudio/Taichi-Theme-Generator" target="_blank" rel="noopener noreferrer" className="text-t-textMuted hover:text-t-primary transition-colors">
              <Github size={20} />
            </a>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-t-textMuted">
          <p>
            Taichi Theme Generator © 2025 - 2026 |{' '}
            <a
              href="https://www.bucaastudio.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-t-primary transition-colors"
            >
              Bucaa Studio
            </a>
            . All Rights Reserved. v26.2.1
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PreviewSection;
