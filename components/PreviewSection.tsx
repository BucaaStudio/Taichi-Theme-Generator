import React, { useState } from 'react';
import { 
  Bell, Check, X, AlertTriangle, Info, Search, Menu, ChevronRight, 
  Settings, User, Lock, Mail, Upload, Home, BarChart2, 
  Twitter, Github, Facebook, Layers
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
  const [activeTab, setActiveTab] = useState('Dashboard');
  const tabs = ['Dashboard', 'Team', 'Settings'];
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
}> = ({ rClass, bClass, sClass }) => {
  const [volume, setVolume] = useState(69);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium text-t-text">Volume</label>
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

const HeroBanner: React.FC<{
  rClass: string;
  sClass: string;
  sClassHover: string;
  themeName: string;
  bClass: string;
}> = ({ rClass, sClass, sClassHover, themeName, bClass }) => {
  const fgOnColor = getTextOnColor(themeName);
  
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

        {/* Dynamic Theme Overlay */}
        <div className={`absolute inset-0 ${themeName === 'Dark' ? 'bg-black/60' : 'bg-white/60'} backdrop-blur-[1px] transition-colors duration-500`} />
        
        {/* Gradient Accents - Animated on hover */}
        <div 
          className="absolute inset-0 opacity-30 mix-blend-overlay transition-all duration-700 group-hover:opacity-50" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 20% 30%, var(--primary) 0%, transparent 60%), radial-gradient(circle at 80% 70%, var(--accent) 0%, transparent 60%)`,
            backgroundSize: '200% 200%',
            animation: 'none'
          }} 
        />
        
        {/* Animated shimmer effect on hover - plays once */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:animate-[shimmer_0.6s_ease-out_forwards]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)`,
            backgroundSize: '200% 100%',
            backgroundPosition: '-200% 0'
          }}
        />
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
            Premium Experience
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-black text-t-text leading-[1.05] tracking-tight drop-shadow-xl transition-all duration-500 group-hover:scale-[1.01]">
            Design your <span className="text-t-primary font-serif italic">vision</span> in <span className="text-t-secondary font-serif italic">color</span>.
          </h2>
          <p className="text-t-text font-medium text-xs sm:text-sm md:text-lg max-w-lg mx-auto leading-relaxed drop-shadow-md">
            Elevate your interface with harmonious palettes and perfectly balanced typography.
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
  const fgOnColor = getTextOnColor(themeName);
  
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
  const sClass = `${getShadow(options.shadowStrength)} shadow-black/[${options.shadowOpacity / 100}]`;
  const sClassHover = `${getShadow(Math.min(5, options.shadowStrength + 2))} shadow-black/[${options.shadowOpacity / 100}]`;

  // Gradients
  const isGradient = options.gradientLevel > 0;
  const isStrongGradient = options.gradientLevel === 2;
  
  let primaryBg = `bg-t-primary ${fgOnColor}`;
  let secondaryBg = `bg-t-secondary ${fgOnColor}`;
  let accentBg = `bg-t-accent ${fgOnColor}`;
  let goodBg = `bg-t-good ${fgOnColor}`;
  let badBg = `bg-t-bad ${fgOnColor}`;
  let textGradient = `text-t-primary`;
  
  if (isGradient) {
      if (themeName === 'Light') {
         primaryBg = isStrongGradient 
            ? `bg-gradient-to-br from-t-primary via-t-primary to-[color-mix(in_srgb,var(--primary)_85%,black)] ${fgOnColor}` 
            : `bg-gradient-to-b from-t-primary to-[color-mix(in_srgb,var(--primary)_90%,black)] ${fgOnColor}`;
      } else {
         primaryBg = isStrongGradient
            ? `bg-gradient-to-br from-t-primary via-t-primary to-[color-mix(in_srgb,var(--primary)_85%,white)] ${fgOnColor}`
            : `bg-gradient-to-b from-t-primary to-[color-mix(in_srgb,var(--primary)_90%,white)] ${fgOnColor}`;
      }

      textGradient = isStrongGradient 
        ? `text-transparent bg-clip-text bg-gradient-to-r from-t-primary to-[color-mix(in_srgb,var(--primary)_80%,${themeName === 'Light' ? 'black' : 'white'})]`
        : `text-t-primary`;
  }

  return (
    <div className="p-8 space-y-12 min-h-full flex flex-col">
      
      {/* Introduction Typography - Shows: bg, text, primary, secondary, accent, surface */}
      <section className="space-y-4">
        <div className={`inline-flex items-center px-3 py-1 ${rFull} text-xs font-medium bg-t-primary/15 text-t-primary ${bClass.replace('border-t-text/20', '')} border-t-primary/30 transition-all duration-300`}>
          {themeName} Theme Preview
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-t-text">
          Taichi Theme <span className={textGradient}>Generator</span>
        </h1>
        <p className="text-xl text-t-textMuted max-w-lg leading-relaxed">
          Create beautiful light and dark theme color schemes instantly. 
          This palette generator uses semantic design system tokens like{' '}
          <code className={`bg-t-primary/20 text-t-primary px-2 py-0.5 text-base font-bold ${rClassInner} ${bClass.replace('border-t-text/20', '')} border-t-primary/30 transition-all duration-300`}>primary</code>,{' '}
          <code className={`bg-t-secondary/20 text-t-secondary px-2 py-0.5 text-base font-bold ${rClassInner} ${bClass.replace('border-t-text/20', '')} border-t-secondary/30 transition-all duration-300`}>secondary</code> and{' '}
          <code className={`bg-t-accent/20 text-t-accent px-2 py-0.5 text-base font-bold ${rClassInner} ${bClass.replace('border-t-text/20', '')} border-t-accent/30 transition-all duration-300`}>accent</code>{' '}
          to build harmonious dual themes.
        </p>
        <p className="text-sm text-t-textMuted mt-16">
          Press <code className={`bg-t-accent/20 text-t-accent px-2 py-0.5 font-mono font-bold ${rClassInner} ${bClass.replace('border-t-text/20', '')} border-t-accent/30 transition-all duration-300`}>Space</code> to generate a new color theme pair.
        </p>
      </section>

      <hr className={options.borderWidth > 0 ? 'border-t-text/20' : 'border-transparent'} />

      <HeroBanner 
        rClass={rClass} 
        sClass={sClass} 
        sClassHover={sClassHover}
        themeName={themeName}
        bClass={bClass}
      />

      {/* Buttons & Actions - Shows: primary, secondary, accent, error, surface, text */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Actions</h3>
        <div className="flex flex-wrap gap-4 items-center">
          
          {/* Primary Button */}
          <button className={`${primaryBg} px-5 py-2.5 ${rPill} font-semibold ${sClass} ${bAction} transition-all duration-300 
            hover:${sClassHover} hover:-translate-y-0.5 hover:brightness-110 
            active:translate-y-0 active:scale-95 active:shadow-none focus:ring-4 focus:ring-t-primary/30`}>
            Primary Action
          </button>

          {/* Secondary Button */}
          <button className={`${secondaryBg} px-5 py-2.5 ${rPill} font-semibold ${bAction} ${sClass} transition-all duration-300 
            hover:brightness-95 hover:shadow-sm hover:${sClassHover}
            active:scale-95 active:brightness-90 focus:ring-4 focus:ring-t-secondary/30`}>
            Secondary
          </button>

          {/* Accent Button */}
          <button className={`${accentBg} px-5 py-2.5 ${rPill} font-semibold ${bAction} ${sClass} transition-all duration-300 
            hover:brightness-95 hover:shadow-sm hover:${sClassHover}
            active:scale-95 active:brightness-90 focus:ring-4 focus:ring-t-accent/30`}>
            Accent
          </button>

          {/* Outline Button */}
          <button className={`${bClass} text-t-text bg-t-card px-5 py-2.5 ${rPill} font-semibold ${sClass} transition-all duration-300 
            hover:border-t-primary hover:text-t-primary hover:bg-t-bg hover:${sClassHover}
            active:scale-95 active:bg-t-primary/5 focus:ring-4 focus:ring-t-primary/30`}>
            Outline
          </button>

          {/* Destructive Button */}
          <button className={`${badBg} px-5 py-2.5 ${rPill} font-semibold ${sClass} ${bAction} transition-all duration-200 
            hover:shadow-md hover:brightness-110 hover:${sClassHover}
            active:scale-95 active:brightness-90`}>
            Error
          </button>

          {/* Success Button */}
          <button className={`${goodBg} px-5 py-2.5 ${rPill} font-semibold ${sClass} ${bAction} transition-all duration-200 
            hover:shadow-md hover:brightness-110 hover:${sClassHover}
            active:scale-95 active:brightness-90`}>
            Success
          </button>
        </div>
        
        <div className="flex gap-4">
          <button className={`p-3 ${rFull} ${primaryBg} ${sClass} ${bAction} transition-all duration-200 
            hover:scale-110 hover:rotate-12 hover:${sClassHover}
            active:scale-90 active:rotate-0`}>
            <Settings size={20} />
          </button>
          <button className={`p-3 ${rFull} bg-t-text/10 text-t-text ${sClass} ${bAction} transition-all duration-200
            hover:bg-t-primary/20 hover:text-t-primary hover:${sClassHover}
            active:bg-t-primary/30 active:scale-90`}>
            <Bell size={20} />
          </button>
        </div>
      </section>

      {/* Form Elements */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Input Fields</h3>
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

          <div className="flex gap-6">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-t-text">Select Option</label>
              <select className={`w-full bg-t-card ${bClass} ${rPill} ${sClass} px-4 py-2.5 text-t-text transition-all duration-300
                hover:border-t-primary/50
                focus:outline-none focus:border-t-primary focus:ring-2 focus:ring-t-primary/20`}>
                <option>Version 1.0</option>
                <option>Version 2.0</option>
              </select>
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-t-text">Status</label>
              <div className="flex items-center h-[42px] gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className={`w-4 h-4 accent-t-primary ${rClassInner} cursor-pointer`} defaultChecked />
                  <span className="text-t-text group-hover:text-t-primary transition-colors">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="r1" className="w-4 h-4 accent-t-primary cursor-pointer" defaultChecked />
                  <span className="text-t-text group-hover:text-t-primary transition-colors">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="r1" className="w-4 h-4 accent-t-primary cursor-pointer" />
                  <span className="text-t-text group-hover:text-t-primary transition-colors">No</span>
                </label>
              </div>
            </div>
          </div>

          {/* Range Slider */}
          <VolumeSlider rClass={rClass} bClass={bClass} sClass={sClass} />
        </div>
      </section>

      {/* Cards & Content - Shows all 8 colors */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Surfaces & Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1 - Revenue Card */}
          <div className={`bg-t-card ${bClass} ${rClass} p-6 ${sClass} transition-all duration-300 relative overflow-hidden group hover:${sClassHover} hover:-translate-y-1 ${options.borderWidth > 0 ? 'hover:border-t-primary/30' : ''}`}>
             <div className={`absolute top-0 left-0 w-full h-1 ${primaryBg} group-hover:h-1.5 transition-all`}></div>
             <div className="flex justify-between items-start mb-4">
               <div className={`p-2 bg-t-secondary/15 ${rClassInner} text-t-secondary group-hover:bg-t-secondary group-hover:text-t-textOnColor transition-colors`}>
                 <BarChart2 size={24} />
               </div>
               <span className={`text-xs font-bold text-t-good bg-t-good/15 px-2 py-1 ${rClassInner} border border-t-good/30`}>+24.5%</span>
             </div>
             <h4 className="text-lg font-bold text-t-text mb-1">Weekly Revenue</h4>
             <p className="text-3xl font-mono font-bold text-t-text mb-4">$45,231.89</p>
             <div className={`h-2 w-full bg-t-text/10 ${rFull} overflow-hidden`}>
               <div className={`h-full ${primaryBg} w-[70%] group-hover:w-[75%] transition-all duration-1000`}></div>
             </div>
          </div>

          {/* Card 2 - Profile Card */}
          <div className={`bg-t-card ${bClass} ${rClass} p-6 ${sClass} flex flex-col items-center text-center transition-all duration-300 hover:${sClassHover} hover:-translate-y-1`}>
             <div className={`w-16 h-16 ${rFull} bg-t-accent/15 mb-4 flex items-center justify-center text-t-accent transition-transform duration-300 hover:scale-110 hover:bg-t-accent hover:${fgOnColor}`}>
                <User size={32} />
             </div>
             <h4 className="text-lg font-bold text-t-text">John Doe</h4>
             <p className="text-t-textMuted text-sm mb-4">Product Designer</p>
             <div className="flex gap-2">
               <span className={`px-2 py-1 ${rClassInner} text-xs font-medium text-t-secondary bg-t-secondary/15 border border-t-secondary/30 hover:bg-t-secondary hover:text-t-textOnColor transition-colors cursor-default`}>UI/UX</span>
               <span className={`px-2 py-1 ${rClassInner} text-xs font-medium text-t-accent bg-t-accent/15 border border-t-accent/30 hover:bg-t-accent hover:text-t-textOnColor transition-colors cursor-default`}>React</span>
             </div>
             <button className={`mt-4 w-full py-2 ${rClassInner} border border-t-primary/30 text-t-primary text-sm font-medium transition-all duration-300
               hover:bg-t-primary hover:text-t-textOnColor hover:border-transparent
               active:scale-95`}>
               View Profile
             </button>
          </div>
        </div>
      </section>

       {/* Alerts - Shows: secondary (info), error, success */}
      <section className="space-y-4">
         <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Feedback</h3>
         <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-3 p-4 ${rPill} ${sClass} bg-t-secondary/10 border border-t-secondary/30 text-t-text transition-all duration-300 hover:scale-[1.01]`}>
               <Info className="text-t-secondary shrink-0" size={20} />
               <div className="flex-1 text-sm"><span className="font-bold">Update Available:</span> A new version of the system is ready.</div>
            </div>
            <div className={`flex items-center gap-3 p-4 ${rPill} ${sClass} bg-t-bad/10 border border-t-bad/30 text-t-text transition-all duration-300 hover:scale-[1.01]`}>
               <AlertTriangle className="text-t-bad shrink-0" size={20} />
               <div className="flex-1 text-sm"><span className="font-bold">Connection Lost:</span> Check your internet settings.</div>
            </div>
            <div className={`flex items-center gap-3 p-4 ${rPill} ${sClass} bg-t-good/10 border border-t-good/30 text-t-text transition-all duration-300 hover:scale-[1.01]`}>
               <Check className="text-t-good shrink-0" size={20} />
               <div className="flex-1 text-sm"><span className="font-bold">Success:</span> Your changes have been saved.</div>
            </div>
         </div>
      </section>

       {/* Navigation Example */}
      <section className="space-y-4">
         <h3 className="text-sm font-bold uppercase tracking-wider text-t-textMuted">Navigation Structure</h3>
         <NavTabsDemo bClass={bClass} rClass={rClass} sClass={sClass} bBottom={bBottom} rClassInner={rClassInner} options={options} themeName={themeName} />
         <div className={`${bClass} ${rClass} ${sClass} bg-t-card p-6 transition-all duration-300`}>
           <div className="flex items-center text-xs text-t-textMuted mb-6">
             <span className="hover:text-t-primary cursor-pointer transition-colors">Home</span> <ChevronRight size={12} className="mx-1"/> 
             <span className="hover:text-t-primary cursor-pointer transition-colors">Settings</span> <ChevronRight size={12} className="mx-1"/> 
             <span className="text-t-text font-medium">Profile</span>
           </div>
           <div className={`h-32 bg-t-text/5 ${rClassInner} animate-pulse`}></div>
         </div>
      </section>

      <div className="flex-1"></div>

      {/* Footer */}
      <footer className={`mt-12 border-t ${options.borderWidth > 0 ? 'border-t-text/20' : 'border-transparent'} pt-12 pb-4`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
              <div className="font-bold text-t-text flex items-center gap-2">
                <div className={`w-6 h-6 ${rClassInner} ${primaryBg}`}></div>
                Brand
              </div>
              <p className="text-sm text-t-textMuted leading-relaxed">
                Building the future of design systems, one token at a time.
              </p>
          </div>
          <div className="space-y-4">
              <div className="font-bold text-t-text text-sm uppercase tracking-wider">Product</div>
              <ul className="space-y-2 text-sm text-t-textMuted">
                <li className="hover:text-t-primary cursor-pointer transition-colors">Features</li>
                <li className="hover:text-t-primary cursor-pointer transition-colors">Integrations</li>
                <li className="hover:text-t-primary cursor-pointer transition-colors">Pricing</li>
              </ul>
          </div>
          <div className="space-y-4">
              <div className="font-bold text-t-text text-sm uppercase tracking-wider">Resources</div>
              <ul className="space-y-2 text-sm text-t-textMuted">
                <li className="hover:text-t-primary cursor-pointer transition-colors">Documentation</li>
                <li className="hover:text-t-primary cursor-pointer transition-colors">API Reference</li>
                <li className="hover:text-t-primary cursor-pointer transition-colors">Community</li>
              </ul>
          </div>
          <div className="space-y-4">
              <div className="font-bold text-t-text text-sm uppercase tracking-wider">Legal</div>
              <ul className="space-y-2 text-sm text-t-textMuted">
                <li className="hover:text-t-primary cursor-pointer transition-colors">Privacy Policy</li>
                <li className="hover:text-t-primary cursor-pointer transition-colors">Terms of Service</li>
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
              <Facebook size={18} className="cursor-pointer hover:text-t-primary transition-colors" />
          </div>
        </div>
      </footer>

    </div>
  );
};

export default PreviewSection;
