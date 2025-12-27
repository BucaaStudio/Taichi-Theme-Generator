import React, { useState } from 'react';
import { 
  Palette, Shuffle, Lock, Unlock, Image as ImageIcon,
  ChevronRight, Check, Copy, Download, Share2, 
  Sliders, Eye, RefreshCw, Sparkles, Upload
} from 'lucide-react';
import { DesignOptions, ThemeTokens } from '../types';

interface PreviewProps {
  themeName: string;
  options: DesignOptions;
  onUpdateOption?: (key: keyof DesignOptions, value: number | boolean) => void;
  onOpenImagePicker?: () => void;
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
      className={`flex items-center gap-3 p-2 bg-t-card/50 ${rClass} cursor-pointer hover:bg-t-card transition-colors group/swatch`}
      onClick={handleCopy}
    >
      <div className={`w-8 h-8 ${rClass} ${colorClass} shadow-inner shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-t-text truncate">{name}</div>
        <div className="text-[10px] text-t-textMuted truncate">{description}</div>
      </div>
      {copied ? (
        <Check size={14} className="text-t-good shrink-0" />
      ) : (
        <Copy size={14} className="text-t-textMuted opacity-0 group-hover/swatch:opacity-100 transition-opacity shrink-0" />
      )}
    </div>
  );
};

const PreviewSection: React.FC<PreviewProps> = ({ themeName, options, onUpdateOption, onOpenImagePicker }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('generate');
  
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
  
  const getBorder = (width: number) => width > 0 ? `border-${width} border-t-border` : 'border-0';
  
  const getShadow = (strength: number) => {
    if (strength === 0) return 'shadow-none';
    const sizes = ['shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'];
    return sizes[Math.min(strength, 5)];
  };
  
  const rClass = getRadius(options.radius);
  const bClass = getBorder(options.borderWidth);
  const sClass = getShadow(options.shadowStrength);
  
  // Gradient class for buttons/backgrounds when enabled
  const gradientClass = options.gradients 
    ? 'bg-gradient-to-br from-t-primary via-t-primary to-t-secondary' 
    : 'bg-t-primary';
  
  const gradientAccent = options.gradients 
    ? 'bg-gradient-to-br from-t-accent via-t-accent to-t-primary' 
    : 'bg-t-accent';
    
  const gradientSecondary = options.gradients 
    ? 'bg-gradient-to-br from-t-secondary via-t-secondary to-t-accent' 
    : 'bg-t-secondary';

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-t-bg min-h-full">
      
      {/* Main Title */}
      <header className="text-center space-y-4 pb-6 border-b border-t-border">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-t-text tracking-tight">
          Taichi Theme Generator
        </h1>
        <p className="text-lg text-t-textMuted max-w-2xl mx-auto">
          Generate balanced color palettes using the <strong className="text-t-primary">OKLCH color space</strong>. 
          This is the <span className={`font-bold ${themeName === 'Dark' ? 'text-t-accent' : 'text-t-secondary'}`}>{themeName}</span> theme preview.
        </p>
      </header>

      {/* Step 1: Generate */}
      <section className="space-y-4">
        <button 
          onClick={() => toggleSection('generate')}
          className={`w-full flex items-center justify-between p-4 ${bClass} ${rClass} ${sClass} bg-t-card hover:bg-t-card2 transition-colors`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${rClass} ${gradientClass} flex items-center justify-center text-t-textOnColor`}>
              <Shuffle size={20} />
            </div>
            <div className="text-left">
              <h2 className="font-bold text-t-text">Step 1: Generate</h2>
              <p className="text-sm text-t-textMuted">Press Space or click to create new colors</p>
            </div>
          </div>
          <ChevronRight className={`text-t-textMuted transition-transform ${expandedSection === 'generate' ? 'rotate-90' : ''}`} />
        </button>
        
        {expandedSection === 'generate' && (
          <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-6 space-y-4`}>
            <p className="text-sm text-t-textMuted">
              Each generation creates a harmonious palette based on color theory. The harmony mode (analogous, complementary, etc.) determines color relationships.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <button className={`${gradientClass} text-t-textOnColor px-6 py-3 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}>
                <Shuffle size={18} />
                Generate New
                <span className="text-xs opacity-75 ml-1 bg-black/20 px-2 py-0.5 rounded">Space</span>
              </button>
              
              <button className={`bg-t-text/10 text-t-text px-6 py-3 ${rClass} font-medium ${bClass} ${sClass} transition-all hover:bg-t-text/20 active:scale-95 flex items-center gap-2`}>
                <RefreshCw size={18} />
                Undo
                <span className="text-xs opacity-50 ml-1">⌘Z</span>
              </button>
            </div>
            
            <div className={`p-4 ${rClass} bg-t-primary/10 border border-t-primary/30`}>
              <p className="text-sm text-t-primary flex items-start gap-2">
                <Sparkles size={16} className="shrink-0 mt-0.5" />
                <span><strong>Pro tip:</strong> Lock individual colors in the swatch strip to keep them while regenerating others.</span>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Step 2: Adjust Controls */}
      <section className="space-y-4">
        <button 
          onClick={() => toggleSection('adjust')}
          className={`w-full flex items-center justify-between p-4 ${bClass} ${rClass} ${sClass} bg-t-card hover:bg-t-card2 transition-colors`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${rClass} ${gradientSecondary} flex items-center justify-center text-t-textOnColor`}>
              <Sliders size={20} />
            </div>
            <div className="text-left">
              <h2 className="font-bold text-t-text">Step 2: Adjust Controls</h2>
              <p className="text-sm text-t-textMuted">Fine-tune saturation, brightness, and contrast</p>
            </div>
          </div>
          <ChevronRight className={`text-t-textMuted transition-transform ${expandedSection === 'adjust' ? 'rotate-90' : ''}`} />
        </button>
        
        {expandedSection === 'adjust' && (
          <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-6 space-y-6`}>
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
            
            {/* Toggle Options */}
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

      {/* Step 3: Pick from Image */}
      <section className="space-y-4">
        <button 
          onClick={() => toggleSection('image')}
          className={`w-full flex items-center justify-between p-4 ${bClass} ${rClass} ${sClass} bg-t-card hover:bg-t-card2 transition-colors`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${rClass} ${gradientAccent} flex items-center justify-center text-t-textOnColor`}>
              <ImageIcon size={20} />
            </div>
            <div className="text-left">
              <h2 className="font-bold text-t-text">Step 3: Pick from Image</h2>
              <p className="text-sm text-t-textMuted">Extract colors from an uploaded image</p>
            </div>
          </div>
          <ChevronRight className={`text-t-textMuted transition-transform ${expandedSection === 'image' ? 'rotate-90' : ''}`} />
        </button>
        
        {expandedSection === 'image' && (
          <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-6 space-y-4`}>
            <p className="text-sm text-t-textMuted">
              Upload an image to automatically extract a 5-color palette. Great for matching themes to existing brand assets or photographs.
            </p>
            
            <button 
              onClick={() => onOpenImagePicker?.()}
              className={`${gradientAccent} text-t-textOnColor px-6 py-3 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}
            >
              <Upload size={18} />
              Upload Image
            </button>
            
            <div className={`p-4 ${rClass} bg-t-accent/10 border border-t-accent/30`}>
              <p className="text-sm text-t-accent flex items-start gap-2">
                <ImageIcon size={16} className="shrink-0 mt-0.5" />
                <span>Supported formats: JPG, PNG, WebP. The algorithm extracts the 5 most prominent colors.</span>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Color Swatches Section */}
      <section className="space-y-4">
        <button 
          onClick={() => toggleSection('swatches')}
          className={`w-full flex items-center justify-between p-4 ${bClass} ${rClass} ${sClass} bg-t-card hover:bg-t-card2 transition-colors`}
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
          <ChevronRight className={`text-t-textMuted transition-transform ${expandedSection === 'swatches' ? 'rotate-90' : ''}`} />
        </button>
        
        {expandedSection === 'swatches' && (
          <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-6 space-y-4`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <ColorSwatch name="primary" colorClass="bg-t-primary" description="Main brand" rClass={rClass} />
              <ColorSwatch name="secondary" colorClass="bg-t-secondary" description="Supporting" rClass={rClass} />
              <ColorSwatch name="accent" colorClass="bg-t-accent" description="Highlight" rClass={rClass} />
              <ColorSwatch name="bg" colorClass="bg-t-bg border border-t-border" description="Background" rClass={rClass} />
              <ColorSwatch name="card" colorClass="bg-t-card border border-t-border" description="Cards" rClass={rClass} />
              <ColorSwatch name="text" colorClass="bg-t-text" description="Primary text" rClass={rClass} />
              <ColorSwatch name="textMuted" colorClass="bg-t-textMuted" description="Muted text" rClass={rClass} />
              <ColorSwatch name="good" colorClass="bg-t-good" description="Success" rClass={rClass} />
              <ColorSwatch name="warn" colorClass="bg-t-warn" description="Warning" rClass={rClass} />
              <ColorSwatch name="bad" colorClass="bg-t-bad" description="Error" rClass={rClass} />
            </div>
          </div>
        )}
      </section>

      {/* Export Section */}
      <section className="space-y-4">
        <button 
          onClick={() => toggleSection('export')}
          className={`w-full flex items-center justify-between p-4 ${bClass} ${rClass} ${sClass} bg-t-card hover:bg-t-card2 transition-colors`}
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
          <ChevronRight className={`text-t-textMuted transition-transform ${expandedSection === 'export' ? 'rotate-90' : ''}`} />
        </button>
        
        {expandedSection === 'export' && (
          <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-6 space-y-4`}>
            <div className="flex flex-wrap gap-3">
              <button className={`${gradientClass} text-t-textOnColor px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}>
                <Download size={16} />
                Download CSS
              </button>
              
              <button className={`${gradientSecondary} text-t-textOnColor px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95 flex items-center gap-2`}>
                <Share2 size={16} />
                Share URL
              </button>
              
              <button className={`bg-t-text/10 text-t-text px-5 py-2.5 ${rClass} font-medium ${bClass} ${sClass} transition-all hover:bg-t-text/20 active:scale-95 flex items-center gap-2`}>
                <Copy size={16} />
                Copy All Tokens
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Live Preview Section */}
      <section className={`${bClass} ${rClass} ${sClass} bg-t-card p-6 space-y-6`}>
        <h2 className="font-bold text-t-text text-lg flex items-center gap-2">
          <Eye size={20} className="text-t-primary" />
          Live Component Preview
        </h2>
        
        {/* Button Showcase */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-t-textMuted">Buttons</h3>
          <div className="flex flex-wrap gap-3">
            <button className={`${gradientClass} text-t-textOnColor px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95`}>
              Primary
            </button>
            <button className={`${gradientSecondary} text-t-textOnColor px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95`}>
              Secondary
            </button>
            <button className={`${gradientAccent} text-t-textOnColor px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95`}>
              Accent
            </button>
            <button className={`bg-t-good text-t-goodFg px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95`}>
              Success
            </button>
            <button className={`bg-t-bad text-t-badFg px-5 py-2.5 ${rClass} font-semibold ${sClass} transition-all hover:scale-105 active:scale-95`}>
              Danger
            </button>
          </div>
        </div>
        
        {/* Status Badges */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-t-textMuted">Status Badges</h3>
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 ${rClass} bg-t-primary/15 text-t-primary text-sm font-medium`}>Primary</span>
            <span className={`px-3 py-1 ${rClass} bg-t-secondary/15 text-t-secondary text-sm font-medium`}>Secondary</span>
            <span className={`px-3 py-1 ${rClass} bg-t-accent/15 text-t-accent text-sm font-medium`}>Accent</span>
            <span className={`px-3 py-1 ${rClass} bg-t-good/15 text-t-good text-sm font-medium`}>Success</span>
            <span className={`px-3 py-1 ${rClass} bg-t-warn/15 text-t-warn text-sm font-medium`}>Warning</span>
            <span className={`px-3 py-1 ${rClass} bg-t-bad/15 text-t-bad text-sm font-medium`}>Error</span>
          </div>
        </div>
        
        {/* Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-t-textMuted">Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${bClass} ${rClass} ${sClass} bg-t-card2 p-4`}>
              <div className={`w-full h-16 ${rClass} ${gradientClass} mb-3`} />
              <h4 className="font-bold text-t-text">Card with Gradient</h4>
              <p className="text-sm text-t-textMuted">Uses your theme's card2 background and primary gradient.</p>
            </div>
            <div className={`${bClass} ${rClass} ${sClass} ${gradientSecondary} p-4`}>
              <h4 className="font-bold text-t-textOnColor mb-1">Filled Card</h4>
              <p className="text-sm text-t-textOnColor/80">A card with secondary gradient background.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-t-textMuted pt-4 border-t border-t-border">
        <p>
          Built with <strong className="text-t-primary">OKLCH</strong> color space for perceptually uniform palettes.
        </p>
        <p className="mt-1 text-xs opacity-70">
          Viewing {themeName} mode • {options.gradients ? 'Gradients enabled' : 'Flat colors'} • Radius level {options.radius}
        </p>
      </footer>
    </div>
  );
};

export default PreviewSection;
