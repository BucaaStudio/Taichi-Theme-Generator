import React, { useState } from 'react';
import {
  Palette, Shuffle,
  ChevronRight, Check, Copy, Download, Share2,
  Sliders, Sparkles, Upload, Github,
  Lock, Server, Bot, Eye
} from 'lucide-react';
import { DesignOptions, ThemeTokens } from '../types';
import ThemeShowcase from './ThemeShowcase';
import { auditContrast, fixContrast } from '../utils/contrastReport';
import { contrastRatio, selectForegroundHex } from '../utils/contrast';

type AdjustmentOptionKey =
  | 'saturationLevel'
  | 'brightnessLevel'
  | 'contrastLevel'
  | 'lightSaturationLevel'
  | 'lightBrightnessLevel'
  | 'lightContrastLevel'
  | 'darkSaturationLevel'
  | 'darkBrightnessLevel'
  | 'darkContrastLevel';

interface PreviewProps {
  isAiTheme?: boolean;
  themeName: string;
  themeTokens: ThemeTokens;
  options: DesignOptions;
  onUpdateOption?: (key: keyof DesignOptions, value: number | boolean) => void;
  onOpenImagePicker?: () => void;
  onRandomize?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onFixContrast?: (updates: Partial<ThemeTokens>) => void;
}

// Controlled Slider Component
const ControlledSlider: React.FC<{
  rClass: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  accentColor: string;
  labelColor: string;
  min?: number;
  max?: number;
}> = ({ rClass, label, value, onChange, accentColor, labelColor, min = -5, max = 5 }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium" style={{ color: labelColor }}>{label}</label>
        <span className="text-xs font-mono font-bold" style={{ color: accentColor }}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <input 
        type="range" 
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full h-1.5 ${rClass} cursor-pointer transition-colors`}
        style={{ color: accentColor }}
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
  onFixContrast,
  isAiTheme
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => ({
    start: false,
    adjust: true,
    swatches: false,
    export: false
  }));
  const [copiedCommand, setCopiedCommand] = useState(false);
  
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

  const alphaHex = (hex: string, alpha: number) => {
    const normalized = Math.max(0, Math.min(1, alpha));
    const a = Math.round(normalized * 255).toString(16).padStart(2, '0');
    return /^#([0-9a-f]{6})$/i.test(hex) ? `${hex}${a}` : hex;
  };

  const readableOn = (
    preferred: string,
    background: string,
    fallback: string,
    minRatio: number
  ) => {
    if (contrastRatio(preferred, background) >= minRatio) return preferred;
    if (contrastRatio(fallback, background) >= minRatio) return fallback;
    return selectForegroundHex(background);
  };

  const cardReadableText = readableOn(
    themeTokens.text,
    themeTokens.card,
    selectForegroundHex(themeTokens.card),
    4.2
  );
  const cardReadableMuted = readableOn(
    themeTokens.textMuted,
    themeTokens.card,
    cardReadableText,
    2.6
  );
  const interactiveAccent = readableOn(themeTokens.primary, themeTokens.card, cardReadableText, 3);
  const previewLabelColor = readableOn(themeTokens.accent, themeTokens.card, cardReadableText, 3);
  // Keep headline color tied directly to semantic primary token.
  // Visibility is enforced upstream in the generator guardrails.
  const headingAccent = themeTokens.primary;
  const useGradientHeading = options.gradients;
  const toggleOnBg = interactiveAccent;
  const toggleOffBg = alphaHex(cardReadableText, 0.28);
  const toggleOnKnob = selectForegroundHex(toggleOnBg);
  const toggleOffKnob = readableOn(themeTokens.bg, themeTokens.card, selectForegroundHex(themeTokens.card), 2);

  // Hero overlay uses the theme's bg color so it stays consistent with
  // brightness/contrast adjustments (instead of hardcoded black/white)
  const heroOverlayOpacity = themeName === 'Dark' ? 'B3' : 'BF'; // B3=70%, BF=75%
  const hoverLiftClass = 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(0,0,0,0.16)]';
  const hoverPanelClass = 'transition-colors duration-200 hover:bg-t-bg/80';
  const hoverCardClass = 'transition-colors duration-200 hover:bg-t-card2';
  const tokenChipClass = 'font-semibold px-1.5 py-0.5 rounded bg-t-text/10';
  const neutralChipClass = 'font-semibold px-2 py-1 rounded bg-[color-mix(in_oklab,var(--text),transparent_12%)] ring-1 ring-[color-mix(in_oklab,var(--border),transparent_45%)]';
  const isDarkPanel = themeName === 'Dark';
  const saturationKey: AdjustmentOptionKey = options.splitAdjustments
    ? (isDarkPanel ? 'darkSaturationLevel' : 'lightSaturationLevel')
    : 'saturationLevel';
  const brightnessKey: AdjustmentOptionKey = options.splitAdjustments
    ? (isDarkPanel ? 'darkBrightnessLevel' : 'lightBrightnessLevel')
    : 'brightnessLevel';
  const contrastKey: AdjustmentOptionKey = options.splitAdjustments
    ? (isDarkPanel ? 'darkContrastLevel' : 'lightContrastLevel')
    : 'contrastLevel';

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
    const mixes = [
      '  --primary-soft: color-mix(in oklab, var(--primary) 16%, var(--card));',
      '  --secondary-soft: color-mix(in oklab, var(--secondary) 16%, var(--card));',
      '  --accent-soft: color-mix(in oklab, var(--accent) 16%, var(--card));',
    ];
    return `:root {\n${lines.join('\n')}\n${mixes.join('\n')}\n}\n`;
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

  const mcpCommand = 'claude mcp add --transport http taichi https://taichi.bucaastudio.com/api/mcp';

  const handleCopyMcpCommand = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(mcpCommand);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 1500);
  };

  const contrastResults = auditContrast(themeTokens);
  const contrastFailures = contrastResults.filter((result) => !result.pass);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-t-bg min-h-full">
      
      {/* Hero Section with Background Image */}
      <section
        className={`relative overflow-hidden ${rClass} ${bClass} ${sClass} ${hoverLiftClass} p-4 md:p-5`}
        style={{
          backgroundImage: `url('/hero-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Solid Color Overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `${themeTokens.bg}${heroOverlayOpacity}` }} />

        <div className={`absolute left-4 top-4 z-10 inline-flex items-center justify-center ${rClass} ${bClass} px-3 py-1.5 text-[11px] font-semibold backdrop-blur leading-none`} style={{ backgroundColor: themeTokens.card, color: cardReadableText }}>
          <span style={{ color: previewLabelColor }}>{themeName} preview</span>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-2 pt-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-left leading-tight">
            <span className="text-t-text">Taichi </span>
            <span
              className={useGradientHeading ? 'bg-clip-text text-transparent bg-t-primary bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--primary),white_18%),color-mix(in_oklab,var(--primary),black_10%))]' : ''}
              style={!useGradientHeading ? { color: headingAccent } : undefined}
            >
              AI Dual Theme Generator
            </span>
          </h1>
          <p className="text-sm text-t-textMuted max-w-xl text-left pt-1">
            Generate balanced <strong style={{ color: interactiveAccent }}>OKLCH</strong> palettes with matching light and dark modes across{' '}
            <span className={`text-t-bg ${neutralChipClass}`}>background</span>,{' '}
            <span className="text-t-text font-semibold">text</span>,{' '}
            <span className={`text-t-primary ${tokenChipClass}`}>primary</span>,{' '}
            <span className={`text-t-secondary ${tokenChipClass}`}>secondary</span>,{' '}
            <span className={`text-t-accent ${tokenChipClass}`}>accent</span>, and{' '}
            <span className={`text-t-good ${tokenChipClass}`}>semantic</span> tokens. Also available through the{' '}
            <a href="/api-docs.html" className="font-semibold underline decoration-2 underline-offset-2 transition-opacity hover:opacity-80" style={{ color: interactiveAccent }}>REST API</a> and{' '}
            <a href="/api-docs.html#mcp" className="font-semibold underline decoration-2 underline-offset-2 transition-opacity hover:opacity-80" style={{ color: interactiveAccent }}>MCP server</a>.
          </p>
        </div>
        
        {/* Glass Edge */}
        <div className={`absolute inset-0 ${rClass} ${bClass} pointer-events-none`} />
      </section>

      <ThemeShowcase
        rClass={rClass}
        bClass={bClass}
        sClass={sClass}
        gradientClass={gradientClass}
        gradientSecondary={gradientSecondary}
        gradientAccent={gradientAccent}
      />

      <section className="space-y-4">
        <div>
          {/* Palette Controls */}
          <section className={`${bClass} ${rClass} ${sClass} ${hoverLiftClass} ${hoverCardClass} bg-t-card overflow-hidden`}>
            <button 
              onClick={() => toggleSection('adjust')}
              className="w-full flex items-center justify-between p-4 hover:bg-t-card2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 shrink-0 ${rClass} ${gradientSecondary} flex items-center justify-center text-t-secondaryFg`}>
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
              <div className="border-t border-themed p-4 space-y-4">
                <p className="text-sm text-t-textMuted">
                  {options.splitAdjustments
                    ? `These sliders control ${themeName.toLowerCase()} mode only. Changes apply in real-time.`
                    : isAiTheme
                      ? 'The AI set these to match its theme. Move them to fine-tune; its colors are adjusted, not regenerated.'
                      : 'These sliders affect how colors are generated. Changes apply in real-time.'}
                </p>
                
                {onUpdateOption ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ControlledSlider 
                      rClass={rClass}
                      label={options.splitAdjustments ? `Saturation (${themeName})` : 'Saturation'}
                      value={options[saturationKey]}
                      onChange={(v) => onUpdateOption(saturationKey, v)}
                      accentColor={interactiveAccent}
                      labelColor={cardReadableText}
                    />
                    <ControlledSlider 
                      rClass={rClass}
                      label={options.splitAdjustments ? `Brightness (${themeName})` : 'Brightness'}
                      value={options[brightnessKey]}
                      onChange={(v) => onUpdateOption(brightnessKey, v)}
                      accentColor={interactiveAccent}
                      labelColor={cardReadableText}
                    />
                    <ControlledSlider 
                      rClass={rClass}
                      label={options.splitAdjustments ? `Contrast (${themeName})` : 'Contrast'}
                      value={options[contrastKey]}
                      onChange={(v) => onUpdateOption(contrastKey, v)}
                      accentColor={interactiveAccent}
                      labelColor={cardReadableText}
                    />
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: cardReadableMuted }}>Controls not available in this view</p>
                )}
                
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3 pt-4 border-t border-themed">
                  <button
                    onClick={() => onUpdateOption?.('darkFirst', !options.darkFirst)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <span
                      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
                      style={{ backgroundColor: options.darkFirst ? toggleOnBg : toggleOffBg }}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full shadow transition-transform duration-200 ${options.darkFirst ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} style={{ backgroundColor: options.darkFirst ? toggleOnKnob : toggleOffKnob }} />
                    </span>
                    <div className="text-left">
                      <span className="text-sm font-medium transition-colors" style={{ color: cardReadableText }}>Dark First</span>
                      <p className="text-xs" style={{ color: cardReadableMuted }}>Generate dark theme as primary</p>
                    </div>
                  </button>

                  <button
                    onClick={() => onUpdateOption?.('gradients', !options.gradients)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <span
                      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
                      style={{ backgroundColor: options.gradients ? toggleOnBg : toggleOffBg }}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full shadow transition-transform duration-200 ${options.gradients ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} style={{ backgroundColor: options.gradients ? toggleOnKnob : toggleOffKnob }} />
                    </span>
                    <div className="text-left">
                      <span className="text-sm font-medium transition-colors" style={{ color: cardReadableText }}>Gradients</span>
                      <p className="text-xs" style={{ color: cardReadableMuted }}>Apply gradients to colored elements</p>
                    </div>
                  </button>

                  <button
                    onClick={() => onUpdateOption?.('splitAdjustments', !options.splitAdjustments)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="basis-full flex items-center gap-3 cursor-pointer group"
                  >
                    <span
                      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
                      style={{ backgroundColor: options.splitAdjustments ? toggleOnBg : toggleOffBg }}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full shadow transition-transform duration-200 ${options.splitAdjustments ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} style={{ backgroundColor: options.splitAdjustments ? toggleOnKnob : toggleOffKnob }} />
                    </span>
                    <div className="text-left">
                      <span className="text-sm font-medium transition-colors" style={{ color: cardReadableText }}>Split Light / Dark</span>
                      <p className="text-xs" style={{ color: cardReadableMuted }}>Use independent adjustments per mode</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Contrast check */}
        <section className={`${bClass} ${rClass} ${sClass} bg-t-card overflow-hidden`}>
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={() => toggleSection('contrast')}
              className="flex flex-1 min-w-0 items-center gap-3 text-left"
              aria-expanded={Boolean(expandedSections.contrast)}
            >
              <div className={`w-10 h-10 shrink-0 ${rClass} flex items-center justify-center ${contrastFailures.length ? 'tint-warn' : 'tint-good'}`}>
                {contrastFailures.length ? <Eye size={20} /> : <Check size={20} />}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-t-text">Contrast check</h2>
                <p className="text-sm text-t-textMuted">
                  {contrastFailures.length
                    ? `${contrastFailures.length} of ${contrastResults.length} pairs below WCAG AA in ${themeName.toLowerCase()} mode`
                    : `All ${contrastResults.length} pairs pass WCAG AA in ${themeName.toLowerCase()} mode`}
                </p>
              </div>
            </button>
            {contrastFailures.length > 0 && onFixContrast && (
              <button
                onClick={() => onFixContrast(fixContrast(themeTokens))}
                className={`shrink-0 ${gradientClass} text-t-primaryFg px-3 py-1.5 ${rClass} ${sClass} text-xs font-semibold transition-all hover:scale-105 active:scale-95`}
              >
                Fix all
              </button>
            )}
            <ChevronRight
              onClick={() => toggleSection('contrast')}
              className={`shrink-0 cursor-pointer text-t-textMuted transition-transform ${expandedSections.contrast ? 'rotate-90' : ''}`}
            />
          </div>
          {expandedSections.contrast && (
            <div className="border-t border-themed p-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {contrastResults.map((result) => (
                <div key={result.label} className="flex items-center gap-2 text-xs">
                  <span
                    className={`flex h-5 w-8 shrink-0 items-center justify-center ${rClass} border border-themed text-[10px] font-bold`}
                    style={{ backgroundColor: themeTokens[result.bg], color: themeTokens[result.fg] }}
                  >
                    Aa
                  </span>
                  <span className="flex-1 min-w-0 truncate text-t-text">{result.label}</span>
                  <span className="font-mono text-t-textMuted">{result.ratio.toFixed(1)}</span>
                  <span className={`${rClass} ${result.pass ? 'tint-good' : 'tint-bad'} px-1.5 py-0.5 text-[10px] font-semibold`}>
                    {result.pass ? 'Pass' : `Needs ${result.required}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2 items-start">
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
                  <p className="text-sm text-t-textMuted">Click a token to copy its variable</p>
                </div>
              </div>
              <ChevronRight className={`text-t-textMuted transition-transform ${expandedSections.swatches ? 'rotate-90' : ''}`} />
            </button>
            
            {expandedSections.swatches && (
              <div className="border-t border-themed p-4 space-y-4">
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
              <div className="border-t border-themed p-4 space-y-4">
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
                    onClick={onExport}
                    disabled={!onExport}
                    className={`btn-ghost px-5 py-2.5 ${rClass} font-medium transition-all active:scale-95 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Download size={16} />
                    Export JSON
                  </button>

                  <button
                    onClick={handleCopyTokens}
                    className={`btn-ghost px-5 py-2.5 ${rClass} font-medium transition-all active:scale-95 flex items-center gap-2`}
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

      {/* Developer Access: REST API + MCP */}
      <section className={`${bClass} ${rClass} ${sClass} ${hoverLiftClass} ${hoverCardClass} bg-t-card p-4 md:p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-t-textMuted">Developer Access</p>
            <h2 className="text-xl font-bold text-t-text">Generate themes programmatically</h2>
          </div>
          <a
            href="/api-docs.html"
            className={`bg-t-text/10 text-t-text px-3 py-2 ${rClass} ${bClass} text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-t-text/20`}
          >
            View full docs
            <ChevronRight size={14} />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3 min-w-0`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 shrink-0 ${rClass} ${gradientClass} flex items-center justify-center text-t-primaryFg`}>
                <Server size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-t-text">REST API</p>
                <p className="text-[11px] text-t-textMuted">No auth · rate-limited · JSON</p>
              </div>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              <p className={`${rClass} bg-t-text/10 px-3 py-2 text-t-text truncate`}>
                <span className="text-t-primary font-bold">POST</span> /api/generate-theme
              </p>
              <p className={`${rClass} bg-t-text/10 px-3 py-2 text-t-text truncate`}>
                <span className="text-t-primary font-bold">POST</span> /api/prompt-theme
              </p>
              <p className={`${rClass} bg-t-text/10 px-3 py-2 text-t-text truncate`}>
                <span className="text-t-primary font-bold">POST</span> /api/export-theme
              </p>
            </div>
            <p className="text-xs" style={{ color: cardReadableMuted }}>
              Same engine as this page: 20 tokens per mode, seeded and deterministic.
            </p>
          </div>

          <div className={`${rClass} ${bClass} ${hoverPanelClass} bg-t-bg/60 p-4 space-y-3 min-w-0`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 shrink-0 ${rClass} ${gradientAccent} flex items-center justify-center text-t-accentFg`}>
                <Bot size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-t-text">MCP Server <span className={`ml-1 align-middle text-[10px] font-bold uppercase ${rClass} tint-accent px-1.5 py-0.5`}>New</span></p>
                <p className="text-[11px] text-t-textMuted">generate_theme · generate_theme_from_prompt · export_theme</p>
              </div>
            </div>
            <button
              onClick={handleCopyMcpCommand}
              className={`w-full min-w-0 text-left ${rClass} bg-t-text/10 px-3 py-2 font-mono text-xs text-t-text flex items-center justify-between gap-2 transition-colors hover:bg-t-text/20`}
              title="Copy command"
            >
              <span className="truncate min-w-0">claude mcp add --transport http taichi …/api/mcp</span>
              {copiedCommand ? (
                <Check size={12} className="text-t-good shrink-0" />
              ) : (
                <Copy size={12} className="text-t-textMuted shrink-0" />
              )}
            </button>
            <p className="text-xs" style={{ color: cardReadableMuted }}>
              Streamable HTTP, no session or auth needed — point any MCP client at{' '}
              <span className="font-mono text-t-text">/api/mcp</span>.
            </p>
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
            <a
              href="/api-docs.html#mcp"
              className="flex items-center gap-1.5 text-xs text-t-textMuted hover:text-t-primary transition-colors"
              title="MCP Server for AI Agents"
            >
              <Bot size={16} />
              MCP
            </a>
            <a href="https://github.com/BucaaStudio/Taichi-Theme-Generator" target="_blank" rel="noopener noreferrer" className="text-t-textMuted hover:text-t-primary transition-colors">
              <Github size={20} />
            </a>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-t-textMuted">
          <p>
            Taichi AI Dual Theme Generator © 2025 - 2026 |{' '}
            <a
              href="https://www.bucaastudio.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-t-primary transition-colors"
            >
              Bucaa Studio
            </a>
            . All Rights Reserved. v{__APP_VERSION__}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PreviewSection;
