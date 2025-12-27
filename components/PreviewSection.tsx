import React, { useState } from 'react';
import { 
  Bell, Check, X, AlertTriangle, Info, Search, Menu, ChevronRight, ChevronDown,
  Settings, User, Lock, Mail, Upload, Home, BarChart2, DollarSign, Star,
  Twitter, Github, Facebook, Layers, Eye, Palette, Sun, Moon, Zap, Shield,
  Code, BookOpen, ArrowRight, Clock, Heart, Share2, MessageCircle, Play,
  Download, ExternalLink, Copy, CheckCircle, XCircle, HelpCircle, Coffee
} from 'lucide-react';
import { ThemeTokens, DesignOptions } from '../types';

interface PreviewProps {
  themeName: string; // 'Light' or 'Dark'
  options: DesignOptions;
}

// Helper: Use the textOnColor token for text on colored backgrounds
const getTextOnColor = () => 'text-t-textOnColor';

// Clickable Navigation Tabs Component
const NavTabsDemo: React.FC<{
  bClass: string;
  rClass: string;
  sClass: string;
  bBottom: string;
  rClassInner: string;
  options: DesignOptions;
  themeName: string;
}> = ({ bClass, rClass, sClass, bBottom, rClassInner, options, themeName }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const tabs = ['Overview', 'Algorithm', 'API', 'Examples'];
  const fgOnColor = getTextOnColor();
  
  return (
    <div className={`${bClass} ${rClass} ${sClass} overflow-hidden bg-t-card transition-all duration-300`}>
      <div className={`${bBottom} p-4 flex items-center justify-between gap-4`} style={{ backgroundColor: 'color-mix(in srgb, var(--card) 90%, var(--text) 10%)' }}>
        <div className="flex gap-3 sm:gap-4 text-sm font-medium text-t-textMuted flex-wrap">
          {tabs.map(tab => (
            <span
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`cursor-pointer transition-colors pb-4 -mb-4.5 ${
                activeTab === tab 
                  ? 'text-t-primary border-b-2 border-t-primary' 
                  : 'hover:text-t-text'
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className={`h-8 w-8 shrink-0 ${rClass} bg-t-accent flex items-center justify-center ${fgOnColor} text-xs font-bold shadow-sm hover:scale-110 transition-transform cursor-pointer`}>BS</div>
      </div>
    </div>
  );
};

// Volume Slider Component with working state
const VolumeSlider: React.FC<{
  rClass: string;
  bClass: string;
  sClass: string;
  label: string;
  defaultValue?: number;
}> = ({ rClass, bClass, sClass, label, defaultValue = 69 }) => {
  const [volume, setVolume] = useState(defaultValue);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium text-t-text">{label}</label>
        <span className="text-xs font-mono text-t-primary font-bold">{volume}%</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={volume}
        onChange={(e) => setVolume(parseInt(e.target.value))}
        className={`w-full h-2 bg-t-text/15 ${rClass} ${bClass} ${sClass} appearance-none cursor-pointer accent-t-primary transition-colors`} 
      />
    </div>
  );
};

// Accordion Component
const Accordion: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  rClass: string;
  bClass: string;
  sClass: string;
}> = ({ title, children, defaultOpen = false, rClass, bClass, sClass }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={`${bClass} ${rClass} ${sClass} bg-t-card overflow-hidden transition-all duration-300`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-t-text/5 transition-colors"
      >
        <span className="font-medium text-t-text">{title}</span>
        <ChevronDown 
          size={18} 
          className={`text-t-textMuted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="px-4 pb-4 text-sm text-t-textMuted">
          {children}
        </div>
      </div>
    </div>
  );
};

// Badge Component
const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'good' | 'bad' | 'outline';
  rClass: string;
}> = ({ children, variant = 'primary', rClass }) => {
  const variants = {
    primary: 'bg-t-primary/15 text-t-primary border-t-primary/30',
    secondary: 'bg-t-secondary/15 text-t-secondary border-t-secondary/30',
    accent: 'bg-t-accent/15 text-t-accent border-t-accent/30',
    good: 'bg-t-good/15 text-t-good border-t-good/30',
    bad: 'bg-t-bad/15 text-t-bad border-t-bad/30',
    outline: 'bg-transparent text-t-textMuted border-t-text/20',
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 ${rClass} text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
};

// Progress Bar Component
const ProgressBar: React.FC<{
  value: number;
  label?: string;
  variant?: 'primary' | 'accent' | 'good';
  rClass: string;
}> = ({ value, label, variant = 'primary', rClass }) => {
  const colors = {
    primary: 'bg-t-primary',
    accent: 'bg-t-accent',
    good: 'bg-t-good',
  };
  
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs">
          <span className="text-t-textMuted">{label}</span>
          <span className="text-t-text font-medium">{value}%</span>
        </div>
      )}
      <div className={`h-2 bg-t-text/10 ${rClass} overflow-hidden`}>
        <div 
          className={`h-full ${colors[variant]} ${rClass} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

// Tooltip Component
const Tooltip: React.FC<{
  children: React.ReactNode;
  text: string;
  rClass: string;
}> = ({ children, text, rClass }) => {
  return (
    <div className="relative group inline-block">
      {children}
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-t-text text-t-bg text-xs ${rClass} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10`}>
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-t-text" />
      </div>
    </div>
  );
};

// Avatar Group Component
const AvatarGroup: React.FC<{ rClass: string }> = ({ rClass }) => {
  const avatars = ['A', 'B', 'C', 'D'];
  const colors = ['bg-t-primary', 'bg-t-secondary', 'bg-t-accent', 'bg-t-good'];
  
  return (
    <div className="flex -space-x-2">
      {avatars.map((letter, i) => (
        <div 
          key={i}
          className={`w-8 h-8 rounded-full ${colors[i]} flex items-center justify-center text-xs font-bold text-t-textOnColor border-2 border-t-card`}
        >
          {letter}
        </div>
      ))}
      <div className={`w-8 h-8 rounded-full bg-t-text/10 flex items-center justify-center text-xs font-medium text-t-textMuted border-2 border-t-card`}>
        +5
      </div>
    </div>
  );
};

// Data Table Component
const DataTable: React.FC<{
  rClass: string;
  bClass: string;
  sClass: string;
}> = ({ rClass, bClass, sClass }) => {
  const data = [
    { token: 'L (Lightness)', light: '0.97', dark: '0.08', purpose: 'Background luminance' },
    { token: 'C (Chroma)', light: '0.15', dark: '0.12', purpose: 'Color saturation' },
    { token: 'H (Hue)', light: '220°', dark: '220°', purpose: 'Color identity' },
  ];
  
  return (
    <div className={`${bClass} ${rClass} ${sClass} overflow-hidden bg-t-card`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-t-text/10">
            <th className="text-left p-3 text-t-textMuted font-medium">OKLCH Token</th>
            <th className="text-left p-3 text-t-textMuted font-medium">Light</th>
            <th className="text-left p-3 text-t-textMuted font-medium">Dark</th>
            <th className="text-left p-3 text-t-textMuted font-medium hidden sm:table-cell">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-t-text/5 last:border-b-0 hover:bg-t-text/5 transition-colors">
              <td className="p-3 text-t-text font-mono">{row.token}</td>
              <td className="p-3 text-t-primary font-mono">{row.light}</td>
              <td className="p-3 text-t-accent font-mono">{row.dark}</td>
              <td className="p-3 text-t-textMuted hidden sm:table-cell">{row.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const HeroBanner: React.FC<{
  rClass: string;
  sClass: string;
  sClassHover: string;
  themeName: string;
  bClass: string;
}> = ({ rClass, sClass, sClassHover, themeName, bClass }) => {
  const fgOnColor = getTextOnColor();
  
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Display Section</h3>
      <div className={`relative overflow-hidden isolate ${rClass} ${sClass} ${bClass} aspect-[16/9] flex items-center justify-center p-4 sm:p-8 md:p-12 group transition-all duration-300 hover:${sClassHover} hover:-translate-y-1`} style={{ willChange: 'transform' }}>
        {/* Real Background Image */}
        <div className="absolute inset-0 transition-transform duration-[3000ms] ease-in-out group-hover:scale-110 group-hover:rotate-1">
          <img 
            src="/hero-bg.jpg" 
            alt="Hero Background" 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Dynamic Theme Overlay - Fixed to card background */}
        <div className={`absolute inset-0 ${themeName === 'Dark' ? 'bg-black/60' : 'bg-white/60'} backdrop-blur-[1px] transition-colors duration-500`} />
        

        
        {/* Animated shimmer effect on hover - plays once */}
        {/* Smooth Wave Background instead of radial gradients */}

        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
        
        {/* SVG Mesh Pattern Overlay for Texture */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/08/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%23000' stroke-width='1' fill='none'/%3E%3C/svg%3E")` }} />

        {/* Content */}
        <div className="relative z-10 text-center space-y-2 sm:space-y-4 max-w-2xl px-2 sm:px-4">
          <div className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-t-secondary ${fgOnColor} text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] shadow-lg rounded-full mb-1 sm:mb-2`}>
            OKLCH Powered
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-t-text leading-[1.05] tracking-tight drop-shadow-xl transition-all duration-500 group-hover:scale-[1.01] mb-6">
            Perceptually <span className="text-t-secondary font-serif italic">Uniform</span> <br className="hidden sm:block"/>
            <span className="text-t-primary font-serif italic underline decoration-4 decoration-t-accent/30">Color</span> Science.
          </h2>
          <p className="text-t-text font-medium text-xs sm:text-sm md:text-lg max-w-lg mx-auto leading-relaxed drop-shadow-md">
            Built on OKLCH color space for mathematically balanced palettes that look great everywhere.
          </p>
        </div>
        
        {/* Glass Edge & Light Border */}
        <div className={`absolute inset-0 border-2 border-white/10 pointer-events-none ${rClass}`} />
      </div>
    </section>
  );
};

const PreviewSection: React.FC<PreviewProps> = ({ themeName, options }) => {
  // --- Style Mappers ---
  const fgOnColor = getTextOnColor();
  
  // Radius - Equal visual distance between levels
  const getRadius = (level: number) => {
    switch(level) {
      case 0: return 'rounded-none';
      case 1: return 'rounded-sm';
      case 2: return 'rounded-md';
      case 3: return 'rounded-xl';
      case 4: return 'rounded-2xl';
      case 5: return 'rounded-3xl';
      default: return 'rounded-lg';
    }
  };
  const rClass = getRadius(options.radius);
  const rClassInner = getRadius(Math.max(0, options.radius - 1));
  
  const rFull = options.radius === 5 ? 'rounded-full' : rClass;
  const rPill = options.radius === 5 ? 'rounded-full' : rClass;

  // Border - using text color with opacity
  const getBorderClass = (level: number) => {
    switch(level) {
      case 0: return 'border-0';
      case 1: return 'border';
      case 2: return 'border-2';
      case 3: return 'border-[3px]';
      case 4: return 'border-4';
      case 5: return 'border-[5px]';
      default: return 'border';
    }
  };
  
  const getBorderBottomClass = (level: number) => {
    switch(level) {
       case 0: return 'border-b-0';
       case 1: return 'border-b';
       case 2: return 'border-b-2';
       case 3: return 'border-b-[3px]';
       case 4: return 'border-b-4';
       case 5: return 'border-b-[5px]';
       default: return 'border-b';
    }
  };

  const bClass = options.borderWidth > 0 ? `${getBorderClass(options.borderWidth)} border-t-text/20` : 'border border-transparent';
  const bBottom = options.borderWidth > 0 ? `${getBorderBottomClass(options.borderWidth)} border-t-text/20` : 'border-b border-transparent';
  const bAction = options.borderWidth > 0 ? `${getBorderClass(options.borderWidth)} border-t-text/20` : '';

  // Shadow
  const getShadow = (level: number) => {
    switch(level) {
      case 0: return '';
      case 1: return 'shadow-sm';
      case 2: return 'shadow';
      case 3: return 'shadow-md';
      case 4: return 'shadow-lg';
      case 5: return 'shadow-xl';
      default: return 'shadow';
    }
  };
  const shadowOpacityClass = `shadow-black/[${options.shadowOpacity / 100}]`;
  const sClass = `${getShadow(options.shadowStrength)} ${shadowOpacityClass}`;
  const sHoverSize = getShadow(Math.min(5, options.shadowStrength + 2));
  const sClassHover = `${sHoverSize} ${shadowOpacityClass}`;
  
  // Gradients
  const getGradientClass = (level: number, colorName: string, fgColor: string, isLight: boolean) => {
     if (level === 0) return `bg-t-${colorName} ${fgColor}`;
     
     const base = `bg-t-${colorName}`;
     const mixColor = isLight ? 'black' : 'white';
     
     switch(level) {
       case 1: 
         return `bg-gradient-to-b from-t-${colorName} to-[color-mix(in_srgb,var(--${colorName})_95%,${mixColor})] ${fgColor}`;
       case 2:
         return `bg-gradient-to-b from-t-${colorName} to-[color-mix(in_srgb,var(--${colorName})_85%,${mixColor})] ${fgColor}`;
       case 3:
         return `bg-gradient-to-br from-t-${colorName} via-t-${colorName} to-[color-mix(in_srgb,var(--${colorName})_90%,${mixColor})] ${fgColor}`;
       case 4:
         return `bg-gradient-to-br from-t-${colorName} via-t-${colorName} to-[color-mix(in_srgb,var(--${colorName})_80%,${mixColor})] ${fgColor}`;
       case 5:
         return `bg-gradient-to-br from-t-${colorName} via-t-${colorName} to-[color-mix(in_srgb,var(--${colorName})_60%,${mixColor})] ${fgColor}`;
       default:
         return `bg-t-${colorName} ${fgColor}`;
     }
  };
  
  const isLight = themeName === 'Light';
  
  const primaryBg = getGradientClass(options.gradientLevel, 'primary', fgOnColor, isLight);
  const secondaryBg = getGradientClass(options.gradientLevel, 'secondary', fgOnColor, isLight);
  const accentBg = getGradientClass(options.gradientLevel, 'accent', fgOnColor, isLight);
  const goodBg = getGradientClass(options.gradientLevel, 'good', fgOnColor, isLight);
  const badBg = getGradientClass(options.gradientLevel, 'bad', fgOnColor, isLight);
  
  const textGradient = options.gradientLevel > 1
    ? `text-transparent bg-clip-text bg-gradient-to-r from-t-primary to-[color-mix(in_srgb,var(--primary)_${100 - (options.gradientLevel * 10)}%,${isLight ? 'black' : 'white'})]`
    : `text-t-primary`;

  return (
    <div className="p-8 space-y-12 min-h-full flex flex-col overflow-x-hidden w-full">
      
      {/* Introduction Typography - Shows: bg, text, primary, secondary, accent, surface */}
      <section className="space-y-4">
        <div className={`inline-flex items-center px-3 py-1 ${rFull} text-xs font-medium bg-t-primary/15 text-t-primary ${bClass.replace('border-t-text/20', '')} border-t-primary/30 transition-all duration-300`}>
          {themeName} Theme Preview
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-t-text">
          Taichi <span className={textGradient}>Theme Generator</span>
        </h1>
        <p className="text-xl text-t-textMuted max-w-2xl leading-relaxed">
          Generate beautiful, balanced color palettes using the <strong className="text-t-primary">OKLCH color space</strong> — a perceptually uniform model where equal numeric changes produce equal visual changes. Adjust saturation, brightness, and contrast to fine-tune your entire theme.
        </p>
      </section>

      <hr className={options.borderWidth > 0 ? 'border-t-text/20' : 'border-transparent'} />

      {/* How It Works Section */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">How It Works</h3>
        
        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-5 transition-all duration-300 hover:-translate-y-1 group`}>
            <div className={`w-10 h-10 ${rClassInner} bg-t-primary/15 text-t-primary flex items-center justify-center mb-3 group-hover:bg-t-primary group-hover:text-t-textOnColor transition-colors`}>
              <Palette size={20} />
            </div>
            <h4 className="font-bold text-t-text mb-1">1. OKLCH First</h4>
            <p className="text-sm text-t-textMuted">All color math happens in OKLCH — Lightness, Chroma, and Hue are computed separately for precision.</p>
          </div>
          
          <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-5 transition-all duration-300 hover:-translate-y-1 group`}>
            <div className={`w-10 h-10 ${rClassInner} bg-t-secondary/15 text-t-secondary flex items-center justify-center mb-3 group-hover:bg-t-secondary group-hover:text-t-textOnColor transition-colors`}>
              <Sun size={20} />
            </div>
            <h4 className="font-bold text-t-text mb-1">2. Light Mode First</h4>
            <p className="text-sm text-t-textMuted">We generate the light theme first using neutral foundation targets, then derive dark mode deterministically.</p>
          </div>
          
          <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-5 transition-all duration-300 hover:-translate-y-1 group`}>
            <div className={`w-10 h-10 ${rClassInner} bg-t-accent/15 text-t-accent flex items-center justify-center mb-3 group-hover:bg-t-accent group-hover:text-t-textOnColor transition-colors`}>
              <Shield size={20} />
            </div>
            <h4 className="font-bold text-t-text mb-1">3. Scored & Validated</h4>
            <p className="text-sm text-t-textMuted">Every palette passes WCAG contrast checks and quality scoring before it's shown to you.</p>
          </div>
        </div>
      </section>

      <HeroBanner 
        rClass={rClass} 
        sClass={sClass} 
        sClassHover={sClassHover}
        themeName={themeName}
        bClass={bClass}
      />

      {/* OKLCH Explanation with Data Table */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">OKLCH Color Space</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-t-textMuted">
              OKLCH represents colors using three intuitive parameters:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <div className={`w-6 h-6 ${rClassInner} bg-t-primary/15 text-t-primary flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className="text-xs font-bold">L</span>
                </div>
                <div>
                  <span className="font-medium text-t-text">Lightness (0–1)</span>
                  <p className="text-sm text-t-textMuted">How bright or dark the color appears</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className={`w-6 h-6 ${rClassInner} bg-t-secondary/15 text-t-secondary flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className="text-xs font-bold">C</span>
                </div>
                <div>
                  <span className="font-medium text-t-text">Chroma (0–0.4)</span>
                  <p className="text-sm text-t-textMuted">Color intensity or saturation level</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className={`w-6 h-6 ${rClassInner} bg-t-accent/15 text-t-accent flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className="text-xs font-bold">H</span>
                </div>
                <div>
                  <span className="font-medium text-t-text">Hue (0–360°)</span>
                  <p className="text-sm text-t-textMuted">The color's position on the color wheel</p>
                </div>
              </li>
            </ul>
          </div>
          
          <DataTable rClass={rClass} bClass={bClass} sClass={sClass} />
        </div>
      </section>

      {/* Harmony Modes */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Color Harmony Modes</h3>
        
        <div className="flex flex-wrap gap-2">
          {['Analogous', 'Complementary', 'Split-Comp', 'Triadic', 'Tetradic', 'Compound'].map((mode, i) => (
            <Badge key={mode} variant={i % 2 === 0 ? 'primary' : 'secondary'} rClass={rPill}>
              {mode}
            </Badge>
          ))}
        </div>
        
        <p className="text-t-textMuted text-sm">
          Each harmony mode generates candidate hues at specific angular offsets from your base hue. 
          For example, <span className="text-t-primary font-medium">Triadic</span> uses 120° intervals, 
          while <span className="text-t-secondary font-medium">Complementary</span> picks the opposite hue at 180°.
        </p>
      </section>

      {/* Buttons & Actions */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Actions & Buttons</h3>
        <div className="flex flex-wrap gap-4 items-center">
          
          {/* Primary Button */}
          <button className={`${primaryBg} px-5 py-2.5 ${rPill} font-semibold ${sClass} ${bAction} transition-all duration-300 
            hover:${sHoverSize} hover:${shadowOpacityClass} hover:-translate-y-0.5 hover:brightness-110 
            active:translate-y-0 active:scale-95 active:shadow-none focus:ring-4 focus:ring-t-primary/30`}>
            Primary Action
          </button>

          {/* Secondary Button */}
          <button className={`${secondaryBg} px-5 py-2.5 ${rPill} font-semibold ${bAction} ${sClass} transition-all duration-300 
            hover:${sHoverSize} hover:${shadowOpacityClass} hover:-translate-y-0.5 hover:brightness-110
            active:translate-y-0 active:scale-95 active:shadow-none focus:ring-4 focus:ring-t-secondary/30`}>
            Secondary
          </button>

          {/* Accent Button */}
          <button className={`${accentBg} px-5 py-2.5 ${rPill} font-semibold ${bAction} ${sClass} transition-all duration-300 
            hover:${sHoverSize} hover:${shadowOpacityClass} hover:-translate-y-0.5 hover:brightness-110
            active:translate-y-0 active:scale-95 active:shadow-none focus:ring-4 focus:ring-t-accent/30`}>
            Accent
          </button>

          {/* Outline Button */}
          <button className={`${bClass} text-t-text bg-t-card px-5 py-2.5 ${rPill} font-semibold ${sClass} transition-all duration-300 
            hover:border-t-primary hover:text-t-primary hover:bg-t-bg hover:${sHoverSize} hover:${shadowOpacityClass}
            active:scale-95 active:bg-t-primary/5 focus:ring-4 focus:ring-t-primary/30`}>
            Outline
          </button>

          {/* Destructive Button */}
          <button className={`${badBg} px-5 py-2.5 ${rPill} font-semibold ${sClass} ${bAction} transition-all duration-200 
            hover:shadow-md hover:brightness-110 hover:${sHoverSize} hover:${shadowOpacityClass}
            active:scale-95 active:brightness-90`}>
            Danger
          </button>

          {/* Success Button */}
          <button className={`${goodBg} px-5 py-2.5 ${rPill} font-semibold ${sClass} ${bAction} transition-all duration-200 
            hover:shadow-md hover:brightness-110 hover:${sHoverSize} hover:${shadowOpacityClass}
            active:scale-95 active:brightness-90`}>
            Success
          </button>
        </div>
        
        {/* Icon Buttons & Tooltips */}
        <div className="flex gap-4 items-center">
          <Tooltip text="Settings" rClass={rClassInner}>
            <button className={`p-3 ${rFull} ${primaryBg} ${sClass} ${bAction} transition-all duration-200 
              hover:scale-110 hover:rotate-12 hover:${sClassHover}
              active:scale-90 active:rotate-0`}>
              <Settings size={20} />
            </button>
          </Tooltip>
          <Tooltip text="Notifications" rClass={rClassInner}>
            <button className={`p-3 ${rFull} bg-t-text/10 text-t-text ${sClass} ${bAction} transition-all duration-200
              hover:bg-t-primary/20 hover:text-t-primary hover:${sClassHover}
              active:bg-t-primary/30 active:scale-90`}>
              <Bell size={20} />
            </button>
          </Tooltip>
          <Tooltip text="Copy Code" rClass={rClassInner}>
            <button className={`p-3 ${rFull} bg-t-text/10 text-t-text ${sClass} ${bAction} transition-all duration-200
              hover:bg-t-accent/20 hover:text-t-accent hover:${sClassHover}
              active:bg-t-accent/30 active:scale-90`}>
              <Copy size={20} />
            </button>
          </Tooltip>
          <AvatarGroup rClass={rClass} />
        </div>
      </section>

      {/* Form Elements */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Form Elements</h3>
        <div className="grid gap-6 max-w-xl">
          <div className="space-y-2">
            <label className="text-sm font-medium text-t-text">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-t-textMuted transition-colors group-focus-within:text-t-primary" size={18} />
              <input 
                type="text" 
                placeholder="you@example.com"
                className={`w-full bg-t-card ${bClass} ${rPill} ${sClass} pl-10 pr-4 py-2.5 text-t-text placeholder:text-t-textMuted transition-all duration-300
                hover:border-t-primary/50
                focus:outline-none focus:border-t-primary focus:ring-2 focus:ring-t-primary/20`}
              />
            </div>
            <p className="text-xs text-t-textMuted">We'll never share your email.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-t-text">Harmony Mode</label>
              <select className={`w-full bg-t-card ${bClass} ${rPill} ${sClass} px-4 py-2.5 text-t-text transition-all duration-300
                hover:border-t-primary/50
                focus:outline-none focus:border-t-primary focus:ring-2 focus:ring-t-primary/20`}>
                <option>Analogous</option>
                <option>Complementary</option>
                <option>Triadic</option>
                <option>Tetradic</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-t-text">Contrast Level</label>
              <select className={`w-full bg-t-card ${bClass} ${rPill} ${sClass} px-4 py-2.5 text-t-text transition-all duration-300
                hover:border-t-primary/50
                focus:outline-none focus:border-t-primary focus:ring-2 focus:ring-t-primary/20`}>
                <option>AA (4.5:1)</option>
                <option>AAA (7:1)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-t-text">Options</label>
              <div className="flex items-center h-[42px] gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className={`w-4 h-4 accent-t-primary ${rClassInner} cursor-pointer`} defaultChecked />
                  <span className="text-t-text group-hover:text-t-primary transition-colors">WCAG AA</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className={`w-4 h-4 accent-t-primary ${rClassInner} cursor-pointer`} />
                  <span className="text-t-text group-hover:text-t-primary transition-colors">Dark First</span>
                </label>
              </div>
            </div>
          </div>

          {/* Range Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <VolumeSlider rClass={rClass} bClass={bClass} sClass={sClass} label="Saturation" defaultValue={65} />
            <VolumeSlider rClass={rClass} bClass={bClass} sClass={sClass} label="Contrast" defaultValue={80} />
          </div>
        </div>
      </section>

      {/* Progress & Stats */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Progress & Metrics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-5 space-y-4`}>
            <h4 className="font-bold text-t-text">Palette Quality Score</h4>
            <ProgressBar value={87} label="Contrast Headroom" variant="primary" rClass={rClassInner} />
            <ProgressBar value={92} label="Harmony Consistency" variant="accent" rClass={rClassInner} />
            <ProgressBar value={78} label="Chroma Balance" variant="good" rClass={rClassInner} />
          </div>
          
          <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-5`}>
            <h4 className="font-bold text-t-text mb-4">Token Distribution</h4>
            <div className="grid grid-cols-4 gap-2">
              {['bg', 'card', 'text', 'primary', 'secondary', 'accent', 'good', 'bad'].map((token) => (
                <div key={token} className="text-center">
                  <div className={`w-full aspect-square ${rClassInner} bg-t-${token} mb-1`} />
                  <span className="text-[10px] text-t-textMuted">{token}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Accordions */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">FAQ / Accordions</h3>
        
        <div className="space-y-2 max-w-2xl">
          <Accordion title="Why OKLCH instead of HSL?" defaultOpen={true} rClass={rClass} bClass={bClass} sClass={sClass}>
            HSL isn't perceptually uniform — a 50% lightness in yellow looks much brighter than 50% in blue. 
            OKLCH fixes this by using a perceptually-adjusted lightness scale, so colors feel consistent across the spectrum.
          </Accordion>
          <Accordion title="How is dark mode generated?" rClass={rClass} bClass={bClass} sClass={sClass}>
            Dark mode is derived mathematically from light mode using inverted lightness with calibrated offsets. 
            The formula <code className="bg-t-text/10 px-1 rounded">dark.L = 1 - light.L ± offset</code> ensures brand hues are preserved while backgrounds and text flip appropriately.
          </Accordion>
          <Accordion title="What is the scoring engine?" rClass={rClass} bClass={bClass} sClass={sClass}>
            Every generated palette is scored on: contrast headroom (above WCAG minimums), harmony consistency, 
            chroma balance, UI usability, and aesthetic quality. Palettes failing hard checks (contrast &lt; 4.5:1) are rejected.
          </Accordion>
        </div>
      </section>

      {/* Alerts */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Feedback & Alerts</h3>
        <div className="flex flex-col gap-3">
          <div className={`flex items-center gap-3 p-4 ${rPill} ${sClass} bg-t-secondary/10 border border-t-secondary/30 text-t-text transition-all duration-300 hover:scale-[1.01]`}>
            <Info className="text-t-secondary shrink-0" size={20} />
            <div className="flex-1 text-sm"><span className="font-bold">Info:</span> All colors are validated for WCAG AA contrast (4.5:1 minimum).</div>
          </div>
          <div className={`flex items-center gap-3 p-4 ${rPill} ${sClass} bg-t-good/10 border border-t-good/30 text-t-text transition-all duration-300 hover:scale-[1.01]`}>
            <CheckCircle className="text-t-good shrink-0" size={20} />
            <div className="flex-1 text-sm"><span className="font-bold">Passed:</span> Palette scored 87/100 with no hard rejects.</div>
          </div>
          <div className={`flex items-center gap-3 p-4 ${rPill} ${sClass} bg-t-bad/10 border border-t-bad/30 text-t-text transition-all duration-300 hover:scale-[1.01]`}>
            <XCircle className="text-t-bad shrink-0" size={20} />
            <div className="flex-1 text-sm"><span className="font-bold">Rejected:</span> Primary too similar to danger color (deltaE: 0.08).</div>
          </div>
        </div>
      </section>

      {/* Navigation Example */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Navigation & Tabs</h3>
        <NavTabsDemo bClass={bClass} rClass={rClass} sClass={sClass} bBottom={bBottom} rClassInner={rClassInner} options={options} themeName={themeName} />
        <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-6 transition-all duration-300`}>
          <div className="flex items-center text-xs text-t-textMuted mb-6">
            <span className="hover:text-t-primary cursor-pointer transition-colors">Home</span> <ChevronRight size={12} className="mx-1"/> 
            <span className="hover:text-t-primary cursor-pointer transition-colors">Documentation</span> <ChevronRight size={12} className="mx-1"/> 
            <span className="text-t-text font-medium">OKLCH Engine</span>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-t-textMuted">
              The palette engine generates candidate colors based on your selected harmony mode, 
              then scores each candidate for contrast, separation, and aesthetic quality before 
              selecting the optimal combination.
            </p>
          </div>
        </div>
      </section>

      <div className="flex-1"></div>

      {/* Footer */}
      <footer className={`mt-12 border-t ${options.borderWidth > 0 ? 'border-t-text/20' : 'border-transparent'} pt-12 pb-4`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="font-bold text-t-text flex items-center gap-2">
              <div className={`w-6 h-6 ${rClassInner} ${primaryBg}`}></div>
              Taichi
            </div>
            <p className="text-sm text-t-textMuted leading-relaxed">
              Perceptually-balanced color palettes using OKLCH color science.
            </p>
          </div>
          <div className="space-y-4">
            <div className="font-bold text-t-text text-sm uppercase tracking-wider">Algorithm</div>
            <ul className="space-y-2 text-sm text-t-textMuted">
              <li className="hover:text-t-primary cursor-pointer transition-colors">OKLCH Conversion</li>
              <li className="hover:text-t-primary cursor-pointer transition-colors">Gamut Mapping</li>
              <li className="hover:text-t-primary cursor-pointer transition-colors">Contrast Scoring</li>
            </ul>
          </div>
          <div className="space-y-4">
            <div className="font-bold text-t-text text-sm uppercase tracking-wider">Resources</div>
            <ul className="space-y-2 text-sm text-t-textMuted">
              <li className="hover:text-t-primary cursor-pointer transition-colors">API Documentation</li>
              <li className="hover:text-t-primary cursor-pointer transition-colors">Color Theory</li>
              <li className="hover:text-t-primary cursor-pointer transition-colors">WCAG Guidelines</li>
            </ul>
          </div>
          <div className="space-y-4">
            <div className="font-bold text-t-text text-sm uppercase tracking-wider">Export</div>
            <ul className="space-y-2 text-sm text-t-textMuted">
              <li className="hover:text-t-primary cursor-pointer transition-colors">CSS Variables</li>
              <li className="hover:text-t-primary cursor-pointer transition-colors">Tailwind Config</li>
              <li className="hover:text-t-primary cursor-pointer transition-colors">JSON Tokens</li>
            </ul>
          </div>
        </div>
        
        <div className={`${bBottom} mb-4`}></div>
        <div className={`flex flex-col md:flex-row justify-between items-center text-xs text-t-textMuted pt-4 gap-4`}>
          <span>
            Taichi Theme Generator © 2025 | Bucaa Studio. All Rights Reserved. v{__APP_VERSION__}
          </span>
          <div className="flex gap-6">
            <Twitter size={18} className="cursor-pointer hover:text-t-primary transition-colors" />
            <Github size={18} className="cursor-pointer hover:text-t-accent transition-colors" />
            <Coffee size={18} className="cursor-pointer hover:text-t-secondary transition-colors" />
          </div>
        </div>
      </footer>

    </div>
  );
};

export default PreviewSection;
