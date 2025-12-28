import React, { useEffect, useState } from 'react';
import {
  Palette, Shuffle, Image as ImageIcon,
  ChevronRight, Check, Copy, Download, Share2,
  Sliders, Sparkles, Upload, Github,
  History, Sun, Moon, Menu, Lock
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
        className={`w-full h-2 bg-t-text/15 ${rClass} appearance-none cursor-pointer accent-t-primary transition-colors`} 
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
    if (clamped === 1) return 'border border-t-border';
    return 'border-2 border-t-border';
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

  const heroOverlayClass = themeName === 'Dark' ? 'bg-black/60' : 'bg-white/70';
  const badgeAccentClass = themeName === 'Dark' ? 'text-t-accent' : 'text-t-secondary';
  const hoverLiftClass = 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(0,0,0,0.16)]';
  const hoverPanelClass = 'transition-colors duration-200 hover:bg-t-bg/80';
  const hoverCardClass = 'transition-colors duration-200 hover:bg-t-card2';
  const tokenChipClass = 'font-semibold px-1.5 py-0.5 rounded bg-t-text/10';
  const neutralChipClass = 'font-semibold px-2 py-1 rounded bg-[color-mix(in_oklab,var(--text),transparent_12%)] ring-1 ring-[color-mix(in_oklab,var(--border),transparent_45%)]';
  const ringChipClass = 'font-semibold px-1.5 py-0.5 rounded bg-t-text/10 ring-1 ring-[var(--ring)]';
  const manualIconSize = 20;
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
        className={`relative overflow-hidden ${rClass} ${sClass} ${hoverLiftClass} p-8 md:p-12`}
        style={{
          backgroundImage: `url('/hero-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className={`absolute left-4 top-4 z-10 inline-flex items-center ${rClass} ${bClass} border-t-border/50 bg-t-bg/70 px-3 py-1.5 text-[11px] font-semibold text-t-text backdrop-blur`}>
          <span className={badgeAccentClass}>{themeName} preview</span>
        </div>

        {/* Solid Color Overlay */}
        <div className={`absolute inset-0 ${heroOverlayClass} pointer-events-none`} />
        
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
            <span className={`text-t-border ${neutralChipClass}`}>border</span>,{' '}
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
        <div className={`absolute inset-0 ${rClass} ${bClass} border-white/10 pointer-events-none`} />
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
                <div className={`w-10 h-10 ${rClass} ${gradientClass} flex items-center justify-center text-t-textOnColor`}>
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
              <div className="border-t border-t-border/40 p-6 space-y-4">
                <p className="text-sm text-t-textMuted">
                  Start by uploading an image to extract colors, or press <kbd className="px-2 py-1 bg-t-text/10 rounded text-t-text font-mono text-xs">Space</kbd> to generate a random harmonious palette.
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => onOpenImagePicker?.()}
                    className={`${gradientAccent} text-t-textOnColor px-6 py-3 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}
                  >
                    <Upload size={18} />
                    Upload Image
                  </button>
                  
                  <button
                    onClick={onRandomize}
                    disabled={!onRandomize}
                    className={`${gradientClass} text-t-textOnColor px-6 py-3 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Shuffle size={18} />
                    Randomize
                    <span className="text-xs opacity-75 ml-1 bg-black/20 px-2 py-0.5 rounded">Space</span>
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
                <div className={`w-10 h-10 ${rClass} bg-t-good flex items-center justify-center text-t-textOnColor`}>
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
              <div className="border-t border-t-border/40 p-6 space-y-4">
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
                <div className={`w-10 h-10 ${rClass} ${gradientSecondary} flex items-center justify-center text-t-textOnColor`}>
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
              <div className="border-t border-t-border/40 p-6 space-y-6">
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
                
                <div className="flex flex-wrap gap-6 pt-4 border-t border-t-border">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={options.darkFirst}
                      onChange={(e) => onUpdateOption?.('darkFirst', e.target.checked)}
                      className="w-5 h-5 accent-t-primary rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-medium text-t-text group-hover:text-t-primary transition-colors">Dark First</span>
                      <p className="text-xs text-t-textMuted">Generate dark theme as primary</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={options.gradients}
                      onChange={(e) => onUpdateOption?.('gradients', e.target.checked)}
                      className="w-5 h-5 accent-t-primary rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-medium text-t-text group-hover:text-t-primary transition-colors">Gradients</span>
                      <p className="text-xs text-t-textMuted">Apply gradients to colored elements</p>
                    </div>
                  </label>
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
              <div className="border-t border-t-border/40 p-6 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleDownloadCss}
                    className={`${gradientClass} text-t-textOnColor px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}
                  >
                    <Download size={16} />
                    Download CSS
                  </button>
                  
                  <button
                    onClick={onShare}
                    disabled={!onShare}
                    className={`${gradientSecondary} text-t-textOnColor px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
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
              className={`${gradientClass} text-t-textOnColor px-3 py-2 ${rClass} ${sClass} text-xs font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60`}
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
                      className="mt-1 h-4 w-4 accent-t-primary"
                    />
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
                  className={`w-full resize-none px-3 py-2 ${rClass} ${bClass} bg-t-bg text-sm text-t-text placeholder:text-t-textMuted/70 focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
                />
                <label className="flex items-center justify-between text-xs text-t-textMuted">
                  <span>Auto-sync preview: {isAutoSync ? 'On' : 'Off'}</span>
                  <input
                    type="checkbox"
                    checked={isAutoSync}
                    onChange={(e) => handleAutoSyncToggle(e.target.checked)}
                    className="h-4 w-4 accent-t-primary"
                  />
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
                className={`w-full sm:w-56 px-3 py-2 ${rClass} ${bClass} bg-t-bg text-sm text-t-text placeholder:text-t-textMuted/70 focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
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
                  className={`${gradientClass} text-t-textOnColor px-3 py-2 ${rClass} ${sClass} text-xs font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95`}
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
                className={`w-full resize-none px-3 py-2 ${rClass} ${bClass} bg-t-bg text-sm text-t-text placeholder:text-t-textMuted/70 focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
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
                  className={`${gradientSecondary} text-t-textOnColor px-3 py-2 ${rClass} ${sClass} text-xs font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60`}
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-t-textMuted">
                <span className="h-2.5 w-2.5 rounded-full bg-t-primary" />
                Instruction Manual
                <span className={`${rClass} bg-t-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-t-secondary`}>Hotkeys</span>
                <span className={`${rClass} bg-t-accent/15 px-2 py-0.5 text-[10px] font-semibold text-t-accent`}>Exports</span>
                <span className={`${rClass} bg-t-good/15 px-2 py-0.5 text-[10px] font-semibold text-t-good`}>Locks</span>
              </div>
              <h2 className="text-lg font-bold">
                <span className="text-t-primary">Everything</span>{' '}
                <span className="text-t-accent">You Can Do</span>
              </h2>
              <p className="text-sm text-t-textMuted max-w-xl">
                All buttons, hotkeys, options, locks, and outputs live here so you can move faster and keep both themes aligned.
              </p>
              <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                <span className={`${rClass} bg-t-primary/15 px-2 py-1 text-t-primary`}>Generate</span>
                <span className={`${rClass} bg-t-secondary/15 px-2 py-1 text-t-secondary`}>Modes</span>
                <span className={`${rClass} bg-t-accent/15 px-2 py-1 text-t-accent`}>Share</span>
                <span className={`${rClass} bg-t-good/15 px-2 py-1 text-t-good`}>Review</span>
                <span className={`${rClass} bg-t-bad/15 px-2 py-1 text-t-bad`}>Undo</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onRandomize}
                disabled={!onRandomize}
                className={`${gradientClass} text-t-textOnColor px-3 py-2 ${rClass} ${sClass} text-xs font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <Shuffle size={manualIconSize} />
                Generate
              </button>
              <button
                onClick={onOpenImagePicker}
                disabled={!onOpenImagePicker}
                className={`bg-t-text/10 text-t-text px-3 py-2 ${rClass} ${bClass} text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-t-text/20 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <ImageIcon size={manualIconSize} />
                Image Palette
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
              <div className={`inline-flex items-center gap-2 ${rClass} bg-t-primary/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-t-primary`}>
                <Menu size={manualIconSize} className="text-t-primary" />
                Header Panels
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={onToggleSwatches}
                disabled={!onToggleSwatches}
                className={`flex items-center gap-2 px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs font-semibold text-t-text transition-colors hover:bg-t-card2 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <Palette size={manualIconSize} className="text-t-primary" />
                <span>Palette Swatches</span>
              </button>
              <button
                onClick={onToggleOptions}
                disabled={!onToggleOptions}
                className={`flex items-center gap-2 px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs font-semibold text-t-text transition-colors hover:bg-t-card2 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <Sliders size={manualIconSize} className="text-t-primary" />
                <span>Design Options</span>
              </button>
              <button
                onClick={onToggleHistory}
                disabled={!onToggleHistory}
                className={`flex items-center gap-2 px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs font-semibold text-t-text transition-colors hover:bg-t-card2 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <History size={manualIconSize} className="text-t-primary" />
                <span>History</span>
              </button>
              <button
                onClick={onOpenImagePicker}
                disabled={!onOpenImagePicker}
                className={`flex items-center gap-2 px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs font-semibold text-t-text transition-colors hover:bg-t-card2 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <ImageIcon size={manualIconSize} className="text-t-primary" />
                <span>Image Palette</span>
              </button>
            </div>
            <p className="text-[11px] text-t-textMuted">
              Mobile: tap the menu icon to access mode/format selectors, Generate, and quick actions.
            </p>
            <ul className="space-y-2 text-[11px] text-t-textMuted">
              <li><span className="font-semibold text-t-text">Mobile menu</span> includes Generate, Palette, Options, History, Image, Export, Share, Theme toggle, and Undo.</li>
              <li><span className="font-semibold text-t-text">Mobile notice</span> can be dismissed with the X button.</li>
            </ul>
          </div>

          <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
            <div className={`inline-flex items-center gap-2 ${rClass} bg-t-accent/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-t-accent`}>
              <Share2 size={manualIconSize} className="text-t-accent" />
              Actions & Share
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={handleDownloadCss}
                className={`flex items-center gap-2 px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs font-semibold text-t-text transition-colors hover:bg-t-card2`}
              >
                <Download size={manualIconSize} className="text-t-primary" />
                <span>Download CSS</span>
              </button>
              <button
                onClick={onExport}
                disabled={!onExport}
                className={`flex items-center gap-2 px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs font-semibold text-t-text transition-colors hover:bg-t-card2 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <Download size={manualIconSize} className="text-t-primary" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={onShare}
                disabled={!onShare}
                className={`flex items-center gap-2 px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs font-semibold text-t-text transition-colors hover:bg-t-card2 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <Share2 size={manualIconSize} className="text-t-primary" />
                <span>Share URL</span>
              </button>
              <button
                onClick={onToggleTheme}
                disabled={!onToggleTheme}
                className={`flex items-center gap-2 px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs font-semibold text-t-text transition-colors hover:bg-t-card2 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className="text-t-primary flex items-center gap-1">
                  {themeName === 'Dark' ? <Moon size={manualIconSize} /> : <Sun size={manualIconSize} />}
                </span>
                <span>Toggle UI Theme</span>
              </button>
            </div>
            <ul className="space-y-2 text-[11px] text-t-textMuted">
              <li><span className="font-semibold text-t-text">Share modal:</span> QR code, copy link, and social share (X, Facebook, LinkedIn, Reddit, TikTok). Press <kbd className="px-1.5 py-0.5 rounded bg-t-text/10 font-mono text-[10px] text-t-text">Esc</kbd> to close.</li>
              <li><span className="font-semibold text-t-text">Copy tokens:</span> Copy All Tokens + Copy CSS buttons duplicate formatted variables.</li>
              <li><span className="font-semibold text-t-text">Export & Share card</span> in preview mirrors Download CSS, Share URL, and Copy All Tokens.</li>
            </ul>
          </div>

          <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
            <div className={`inline-flex items-center gap-2 ${rClass} bg-t-secondary/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-t-secondary`}>
              <Shuffle size={manualIconSize} className="text-t-secondary" />
              Generate & History
            </div>
            <ul className="space-y-2 text-xs text-t-textMuted">
              <li><span className="font-semibold text-t-text">Generate</span> (header + preview buttons) creates a new palette and randomizes unlocked options. Hotkey: <kbd className="px-1.5 py-0.5 rounded bg-t-text/10 font-mono text-[10px] text-t-text">Space</kbd>.</li>
              <li><span className="font-semibold text-t-text">Generator Actions</span> include Upload Image and Randomize shortcuts inside the preview.</li>
              <li><span className="font-semibold text-t-text">Undo/Redo</span> with header arrows or <kbd className="px-1.5 py-0.5 rounded bg-t-text/10 font-mono text-[10px] text-t-text">Cmd/Ctrl+Z</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-t-text/10 font-mono text-[10px] text-t-text">Cmd/Ctrl+Shift+Z</kbd>.</li>
              <li><span className="font-semibold text-t-text">History drawer</span> holds up to 20 snapshots. Click a thumbnail to restore.</li>
            </ul>
          </div>

          <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
            <div className={`inline-flex items-center gap-2 ${rClass} bg-t-good/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-t-good`}>
              <Sliders size={manualIconSize} className="text-t-good" />
              Modes & Format
            </div>
            <ul className="space-y-2 text-xs text-t-textMuted">
              <li><span className="font-semibold text-t-text">Mode</span> selector: Random, Monochrome, Analogous, Complementary, Split Complementary, Triadic, Tetradic, Compound, Triadic Split.</li>
              <li><span className="font-semibold text-t-text">Format</span> selector: HEX, RGB, HSL, OKLCH. Affects swatch values, copy output, and exports.</li>
              <li><span className="font-semibold text-t-text">Light + Dark</span> previews update together so you always ship matching themes.</li>
            </ul>
          </div>

          <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
            <div className={`inline-flex items-center gap-2 ${rClass} bg-t-secondary/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-t-secondary`}>
              <Palette size={manualIconSize} className="text-t-secondary" />
              Swatches & Locks
            </div>
            <ul className="space-y-2 text-xs text-t-textMuted">
              <li><span className="font-semibold text-t-text">Sticky swatch strip</span> shows 10 tokens (bg, card, text, textMuted, textOnColor, primary, secondary, accent, good, bad).</li>
              <li><span className="font-semibold text-t-text">Edit & copy</span>: click a half to open the color picker, type a value, press Enter/blur to apply. Alt/Option or Cmd+click copies the formatted value.</li>
              <li><span className="font-semibold text-t-text">Lock icons</span> freeze individual tokens during generation. Color Tokens grid copies CSS variable names (var(--token)).</li>
            </ul>
          </div>

          <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
            <div className={`inline-flex items-center gap-2 ${rClass} bg-t-primary/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-t-primary`}>
              <Sliders size={manualIconSize} className="text-t-primary" />
              Design Options
            </div>
            <ul className="space-y-2 text-xs text-t-textMuted">
              <li><span className="font-semibold text-t-text">Borders</span> none/thin/thick. Shadow size 0–5, shadow opacity 5–50%.</li>
              <li><span className="font-semibold text-t-text">Roundness</span> 0–5. Saturation, Brightness, Contrast range from -5 to +5.</li>
              <li><span className="font-semibold text-t-text">Toggles</span> for Gradients and Dark First. Lock any option to keep it fixed.</li>
              <li><span className="font-semibold text-t-text">Palette Controls</span> card in the preview mirrors saturation/brightness/contrast plus Dark First and Gradients.</li>
            </ul>
          </div>

          <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
            <div className={`inline-flex items-center gap-2 ${rClass} bg-t-accent/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-t-accent`}>
              <Sparkles size={manualIconSize} className="text-t-accent" />
              Workspace & Review Hub
            </div>
            <ul className="space-y-2 text-xs text-t-textMuted">
              <li><span className="font-semibold text-t-text">Tabs</span> (Overview, Tokens, Delivery) with Auto-sync to mirror light/dark panels.</li>
              <li><span className="font-semibold text-t-text">Overview</span> includes checklist, progress bar, review notes, review depth, and Toggle UI theme preview.</li>
              <li><span className="font-semibold text-t-text">Tokens</span> filter, copy individual values, and Copy CSS.</li>
              <li><span className="font-semibold text-t-text">Delivery</span> buttons for Download CSS, Export JSON, Share URL, release note editor, Copy note, and Open share sheet.</li>
              <li><span className="font-semibold text-t-text">New Variation</span> creates a fresh palette without leaving the workspace.</li>
            </ul>
          </div>

          <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
            <div className={`inline-flex items-center gap-2 ${rClass} bg-t-secondary/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-t-secondary`}>
              <ImageIcon size={manualIconSize} className="text-t-secondary" />
              Image Palette
            </div>
            <ul className="space-y-2 text-xs text-t-textMuted">
              <li><span className="font-semibold text-t-text">Pick from Image</span> with upload, drag & drop, or paste (<kbd className="px-1.5 py-0.5 rounded bg-t-text/10 font-mono text-[10px] text-t-text">Cmd/Ctrl+V</kbd>).</li>
              <li><span className="font-semibold text-t-text">Sample</span> the image to fill the selected slot. Toggle checkboxes to include/exclude slots.</li>
              <li><span className="font-semibold text-t-text">Import Selection</span> applies checked colors. Reset clears the image.</li>
            </ul>
          </div>

          <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3`}>
            <div className={`inline-flex items-center gap-2 ${rClass} bg-t-primary/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-t-primary`}>
              <Sparkles size={manualIconSize} className="text-t-primary" />
              Component Samples
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className={`${rClass} bg-t-primary/15 px-2 py-1 text-[10px] font-semibold text-t-primary`}>Badge</span>
                <span className={`${rClass} bg-t-secondary/15 px-2 py-1 text-[10px] font-semibold text-t-secondary`}>Tag</span>
                <span className={`${rClass} bg-t-accent/15 px-2 py-1 text-[10px] font-semibold text-t-accent`}>Accent</span>
                <span className={`${rClass} bg-t-good/15 px-2 py-1 text-[10px] font-semibold text-t-good`}>Success</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={`${gradientClass} text-t-textOnColor px-3 py-2 ${rClass} ${sClass} text-xs font-semibold transition-all hover:scale-105 active:scale-95`}>
                  Primary
                </button>
                <button className={`bg-t-secondary/15 text-t-secondary px-3 py-2 ${rClass} ${bClass} text-xs font-semibold transition-colors hover:bg-t-secondary/25`}>
                  Secondary
                </button>
                <button className={`bg-t-text/10 text-t-text px-3 py-2 ${rClass} ${bClass} text-xs font-semibold transition-colors hover:bg-t-text/20`}>
                  Ghost
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Email address"
                  className={`w-full px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs text-t-text placeholder:text-t-textMuted/70 focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
                />
                <select
                  className={`w-full px-3 py-2 ${rClass} ${bClass} bg-t-card text-xs text-t-text cursor-pointer focus:outline-none focus:ring-2 focus:ring-t-primary/30`}
                >
                  <option>Designer</option>
                  <option>Developer</option>
                  <option>Product</option>
                </select>
              </div>
              <div className={`flex items-center justify-between gap-3 ${rClass} ${bClass} bg-t-card px-3 py-2 text-xs text-t-text`}>
                <div>
                  <p className="font-semibold">Email alerts</p>
                  <p className="text-[11px] text-t-textMuted">Weekly summary</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-t-primary" />
              </div>
              <div className="grid gap-2">
                <div className={`${rClass} ${bClass} bg-t-good/15 px-3 py-2 text-xs text-t-good flex items-center justify-between`}>
                  <span>Success banner</span>
                  <span className="text-[11px] text-t-good">Resolved</span>
                </div>
                <div className={`${rClass} ${bClass} bg-t-bad/15 px-3 py-2 text-xs text-t-bad flex items-center justify-between`}>
                  <span>Error banner</span>
                  <span className="text-[11px] text-t-bad">Action needed</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-t-textMuted">
                  <span>Progress</span>
                  <span className="text-t-primary font-semibold">68%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-t-text/10">
                  <div className={`h-full ${rClass} ${gradientAccent}`} style={{ width: '68%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-t-textMuted">
                <span className="text-t-text font-semibold">Pagination</span>
                <div className="flex items-center gap-1">
                  <button className={`${rClass} ${bClass} bg-t-card px-2 py-1 text-[11px] text-t-text transition-colors hover:bg-t-card2`}>1</button>
                  <button className={`${rClass} ${bClass} bg-t-primary/15 px-2 py-1 text-[11px] text-t-primary transition-colors hover:bg-t-primary/20`}>2</button>
                  <button className={`${rClass} ${bClass} bg-t-card px-2 py-1 text-[11px] text-t-text transition-colors hover:bg-t-card2`}>3</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-6 pt-10 pb-8 border-t border-t-border transition-colors duration-500">
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
            Taichi Theme Generator © 2025 |{' '}
            <a
              href="https://www.bucaastudio.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-t-primary transition-colors"
            >
              Bucaa Studio
            </a>
            . All Rights Reserved. v25.12.2
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PreviewSection;
