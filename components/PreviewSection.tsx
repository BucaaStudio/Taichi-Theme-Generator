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

// Clickable Navigation Tabs Component
const NavTabsDemo: React.FC<{
  bClass: string;
  rClass: string;
  sClass: string;
  bBottom: string;
  rClassInner: string;
  options: DesignOptions;
}> = ({ bClass, rClass, sClass, bBottom, rClassInner, options }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const tabs = ['Dashboard', 'Team', 'Settings'];
  
  return (
    <div className={`${bClass} ${rClass} ${sClass} overflow-hidden bg-t-surface`}>
      <div className={`${bBottom} p-4 flex items-center justify-between gap-4 bg-t-surface2/30`}>
        <div className="flex gap-3 sm:gap-4 text-sm font-medium text-t-muted flex-wrap">
          {tabs.map(tab => (
            <span
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`cursor-pointer transition-colors pb-4 -mb-4.5 ${
                activeTab === tab 
                  ? 'text-t-primary border-b-2 border-t-primary' 
                  : tab === 'Settings' 
                    ? 'text-t-accent hover:text-t-accent/80' 
                    : 'hover:text-t-text'
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className={`h-8 w-8 shrink-0 ${rClass} bg-t-accent flex items-center justify-center text-t-accentFg text-xs shadow-sm hover:scale-110 transition-transform cursor-pointer`}>JD</div>
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
  const [volume, setVolume] = useState(75);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium text-t-text">Volume</label>
        <span className="text-xs font-mono text-t-primary">{volume}%</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={volume}
        onChange={(e) => setVolume(parseInt(e.target.value))}
        className={`w-full h-2 bg-t-surface2 ${rClass} ${bClass} ${sClass} appearance-none cursor-pointer accent-t-primary transition-colors`} 
      />
    </div>
  );
};

const PreviewSection: React.FC<PreviewProps> = ({ themeName, options }) => {
  // --- Style Mappers ---
  
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
  const rClassInner = getRadius(Math.max(0, options.radius - 1)); // slightly smaller for inner elements
  
  // Round Actions (Icon buttons / Avatars)
  // Only fully round if radius level is max (5), otherwise obey standard radius
  const rFull = options.radius === 5 ? 'rounded-full' : rClass;
  
  // Pill-shaped buttons (fully rounded left/right for rectangular buttons at max roundness)
  const rPill = options.radius === 5 ? 'rounded-full' : rClass;

  // Border
  // Map slider 0-3 to Tailwind classes
  const getBorderClass = (level: number) => {
    switch(level) {
      case 0: return 'border-0';
      case 1: return 'border';      // 1px
      case 2: return 'border-2';    // 2px
      case 3: return 'border-4';    // 4px
      default: return 'border';
    }
  };
  
  // For bottom border only
  const getBorderBottomClass = (level: number) => {
    switch(level) {
       case 0: return 'border-b-0';
       case 1: return 'border-b';
       case 2: return 'border-b-2';
       case 3: return 'border-b-4';
       default: return 'border-b';
    }
  };

  const bClass = options.borderWidth > 0 ? `${getBorderClass(options.borderWidth)} border-t-border` : 'border border-transparent';
  const bBottom = options.borderWidth > 0 ? `${getBorderBottomClass(options.borderWidth)} border-t-border` : 'border-b border-transparent';
  
  // Specific class just for buttons to optionally show border if slider is active
  // If border slider is 0, we use transparent border to keep size consistent or just no border
  const bAction = options.borderWidth > 0 ? `${getBorderClass(options.borderWidth)} border-t-border` : '';
  const bActionTransparent = options.borderWidth > 0 ? `${getBorderClass(options.borderWidth)} border-transparent` : '';

  // Badge Border logic: use slider width, but tint with primary color
  const badgeBorder = options.borderWidth > 0 ? `${getBorderClass(options.borderWidth)} border-t-primary/20` : 'border border-transparent';

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
  const sClass = getShadow(options.shadowStrength);
  const sClassHover = getShadow(Math.min(5, options.shadowStrength + 2)); // hover state

  // Gradients
  // Level 0: Solid
  // Level 1: Subtle (Linear) - brightness variation
  // Level 2: Strong (Diagonal) - brightness variation
  const isGradient = options.gradientLevel > 0;
  const isStrongGradient = options.gradientLevel === 2;
  
  let primaryBg = `bg-t-primary text-t-primaryFg`;
  let textGradient = `text-t-primary`;
  
  if (isGradient) {
      // Use brightness filters for gradients instead of different color tokens
      if (themeName === 'Light') {
         // Light Mode: Primary with darker variation
         primaryBg = isStrongGradient 
            ? `bg-gradient-to-br from-t-primary via-t-primary to-[color-mix(in_srgb,var(--primary)_85%,black)] text-t-primaryFg` 
            : `bg-gradient-to-b from-t-primary to-[color-mix(in_srgb,var(--primary)_90%,black)] text-t-primaryFg`;
      } else {
         // Dark Mode: Primary with lighter variation
         primaryBg = isStrongGradient
            ? `bg-gradient-to-br from-t-primary via-t-primary to-[color-mix(in_srgb,var(--primary)_85%,white)] text-t-primaryFg`
            : `bg-gradient-to-b from-t-primary to-[color-mix(in_srgb,var(--primary)_90%,white)] text-t-primaryFg`;
      }

      textGradient = isStrongGradient 
        ? `text-transparent bg-clip-text bg-gradient-to-r from-t-primary to-[color-mix(in_srgb,var(--primary)_80%,${themeName === 'Light' ? 'black' : 'white'})]`
        : `text-t-primary`;
  }

  return (
    <div className="p-8 space-y-12 min-h-full flex flex-col">
      
      {/* Introduction Typography */}
      <section className="space-y-4">
        <div className={`inline-flex items-center px-3 py-1 ${rFull} text-xs font-medium bg-t-primary/10 text-t-primary ${badgeBorder}`}>
          {themeName} Theme Preview
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-t-text">
          Color Palette <span className={textGradient}>Generator</span>
        </h1>
        <p className="text-xl text-t-muted max-w-lg leading-relaxed">
          Create beautiful light and dark theme color schemes instantly. 
          This palette generator uses semantic design system tokens like <code className={`bg-t-surface2 text-t-text px-3 py-1 text-base font-medium ${rClassInner}`}>primary</code> and <code className={`bg-t-surface2 text-t-text px-3 py-1 text-base font-medium ${rClassInner}`}>surface</code> to build harmonious dual themes.
        </p>
        <p className="text-sm text-t-muted opacity-75 mt-16">
          Press <code className={`bg-t-surface2 text-t-primary px-2 py-0.5 font-mono font-bold ${rClassInner}`}>Space</code> to generate a new color theme pair.
        </p>
      </section>

      <hr className={options.borderWidth > 0 ? 'border-t-border' : 'border-transparent'} />

      {/* Buttons & Actions */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-muted">Actions</h3>
        <div className="flex flex-wrap gap-4 items-center">
          
          {/* Primary Button */}
          <button className={`${primaryBg} px-5 py-2.5 ${rPill} font-medium ${sClass} ${bAction} transition-all duration-200 
            hover:${sClassHover} hover:-translate-y-0.5 hover:brightness-110 
            active:translate-y-0 active:scale-95 active:shadow-none focus:ring-4 focus:ring-t-ring/30`}>
            Primary Action
          </button>

          {/* Secondary Button */}
          <button className={`bg-t-secondary text-t-secondaryFg px-5 py-2.5 ${rPill} font-medium ${bAction} ${sClass} transition-all duration-200 
            hover:brightness-95 hover:shadow-sm hover:${sClassHover}
            active:scale-95 active:brightness-90 focus:ring-4 focus:ring-t-ring/30`}>
            Secondary
          </button>

          {/* Outline Button */}
          <button className={`${bClass} text-t-text bg-t-surface px-5 py-2.5 ${rPill} font-medium ${sClass} transition-all duration-200 
            hover:border-t-primary hover:text-t-primary hover:bg-t-surface2 hover:${sClassHover}
            active:scale-95 active:bg-t-primary/5 focus:ring-4 focus:ring-t-ring/30`}>
            Outline
          </button>

          {/* Ghost Button */}
          <button className={`text-t-primary px-5 py-2.5 ${rPill} font-medium ${bAction} ${sClass} transition-all duration-200 
            hover:bg-t-primary/10 hover:${sClassHover}
            active:bg-t-primary/20 active:scale-95`}>
            Ghost
          </button>

          {/* Destructive Button */}
          <button className={`bg-t-error text-t-errorFg px-5 py-2.5 ${rPill} font-medium ${sClass} ${bAction} transition-all duration-200 
            hover:shadow-md hover:brightness-110 hover:${sClassHover}
            active:scale-95 active:brightness-90`}>
            Destructive
          </button>

          {/* Disabled Button */}
          <button disabled className={`bg-t-surface2 text-t-muted px-5 py-2.5 ${rPill} font-medium ${bAction} ${sClass} cursor-not-allowed opacity-60`}>
            Disabled
          </button>
        </div>
        
        <div className="flex gap-4">
          <button className={`p-3 ${rFull} ${primaryBg} ${sClass} ${bAction} transition-all duration-200 
            hover:scale-110 hover:rotate-12 hover:${sClassHover}
            active:scale-90 active:rotate-0`}>
            <Settings size={20} />
          </button>
          <button className={`p-3 ${rFull} bg-t-surface2 text-t-text ${sClass} ${bAction} transition-all duration-200
            hover:bg-t-primary/20 hover:text-t-primary hover:${sClassHover}
            active:bg-t-primary/30 active:scale-90`}>
            <Bell size={20} />
          </button>
        </div>
      </section>

      {/* Form Elements */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-muted">Input Fields</h3>
        <div className="grid gap-6 max-w-xl">
          <div className="space-y-2">
            <label className="text-sm font-medium text-t-text">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-t-muted transition-colors group-focus-within:text-t-primary" size={18} />
              <input 
                type="text" 
                placeholder="you@example.com"
                className={`w-full bg-t-surface ${bClass} ${rPill} ${sClass} pl-10 pr-4 py-2.5 text-t-text placeholder:text-t-muted transition-all duration-200
                hover:border-t-primary/50
                focus:outline-none focus:border-t-primary focus:ring-2 focus:ring-t-primary/20`}
              />
            </div>
            <p className="text-xs text-t-muted">We'll never share your email.</p>
          </div>

          <div className="flex gap-6">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-t-text">Select Option</label>
              <select className={`w-full bg-t-surface ${bClass} ${rPill} ${sClass} px-4 py-2.5 text-t-text transition-all duration-200
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

      {/* Cards & Content */}
      <section className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-t-muted">Surfaces & Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1 */}
          <div className={`bg-t-surface ${bClass} ${rClass} p-6 ${sClass} transition-all duration-300 relative overflow-hidden group hover:${sClassHover} hover:-translate-y-1 ${options.borderWidth > 0 ? 'hover:border-t-primary/30' : ''}`}>
             <div className={`absolute top-0 left-0 w-full h-1 ${primaryBg} group-hover:h-1.5 transition-all`}></div>
             <div className="flex justify-between items-start mb-4">
               <div className={`p-2 bg-t-primary/10 ${rClassInner} text-t-primary group-hover:bg-t-primary group-hover:text-t-primaryFg transition-colors`}>
                 <BarChart2 size={24} />
               </div>
               <span className={`text-xs font-bold text-t-success bg-t-success/10 px-2 py-1 ${rClassInner} border ${options.borderWidth > 0 ? 'border-transparent' : 'border-transparent'} group-hover:border-t-success/20`}>+24.5%</span>
             </div>
             <h4 className="text-lg font-bold text-t-text mb-1">Weekly Revenue</h4>
             <p className="text-3xl font-mono font-bold text-t-text mb-4">$45,231.89</p>
             <div className={`h-2 w-full bg-t-surface2 ${rFull} overflow-hidden`}>
               <div className={`h-full ${primaryBg} w-[70%] group-hover:w-[75%] transition-all duration-1000`}></div>
             </div>
          </div>

          {/* Card 2 */}
          <div className={`bg-t-surface ${bClass} ${rClass} p-6 ${sClass} flex flex-col items-center text-center transition-all duration-300 hover:${sClassHover} hover:-translate-y-1`}>
             <div className={`w-16 h-16 ${rFull} bg-t-surface2 mb-4 flex items-center justify-center text-t-muted transition-transform duration-300 hover:scale-110 hover:bg-t-primary/10 hover:text-t-primary`}>
                <User size={32} />
             </div>
             <h4 className="text-lg font-bold text-t-text">John Doe</h4>
             <p className="text-t-muted text-sm mb-4">Product Designer</p>
             <div className="flex gap-2">
               <span className={`px-2 py-1 ${rClassInner} text-xs ${bClass} text-t-text bg-t-surface hover:bg-t-surface2 transition-colors cursor-default`}>UI/UX</span>
               <span className={`px-2 py-1 ${rClassInner} text-xs bg-t-accent/10 text-t-accent border ${options.borderWidth > 0 ? 'border-t-accent/20' : 'border-transparent'} hover:bg-t-accent hover:text-t-accentFg transition-colors cursor-default`}>React</span>
             </div>
             <button className={`mt-4 w-full py-2 ${rClassInner} ${bClass} text-t-primary text-sm font-medium transition-all duration-200
               hover:bg-t-primary hover:text-t-primaryFg hover:border-transparent
               active:scale-95`}>
               View Profile
             </button>
          </div>
        </div>
      </section>

       {/* Alerts */}
      <section className="space-y-4">
         <h3 className="text-sm font-bold uppercase tracking-wider text-t-muted">Feedback</h3>
         <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-3 p-4 ${rPill} ${sClass} bg-t-primary/10 ${bClass} border-t-primary/20 text-t-text transition-transform hover:scale-[1.01]`}>
               <Info className="text-t-primary shrink-0" size={20} />
               <div className="flex-1 text-sm"><span className="font-bold">Update Available:</span> A new version of the system is ready.</div>
            </div>
            <div className={`flex items-center gap-3 p-4 ${rPill} ${sClass} bg-t-error/10 ${bClass} border-t-error/20 text-t-text transition-transform hover:scale-[1.01]`}>
               <AlertTriangle className="text-t-error shrink-0" size={20} />
               <div className="flex-1 text-sm"><span className="font-bold">Connection Lost:</span> Check your internet settings.</div>
            </div>
            <div className={`flex items-center gap-3 p-4 ${rPill} ${sClass} bg-t-success/10 ${bClass} border-t-success/20 text-t-text transition-transform hover:scale-[1.01]`}>
               <Check className="text-t-success shrink-0" size={20} />
               <div className="flex-1 text-sm"><span className="font-bold">Success:</span> Your changes have been saved.</div>
            </div>
         </div>
      </section>

       {/* Navigation Example */}
      <section className="space-y-4">
         <h3 className="text-sm font-bold uppercase tracking-wider text-t-muted">Navigation Structure</h3>
         <NavTabsDemo bClass={bClass} rClass={rClass} sClass={sClass} bBottom={bBottom} rClassInner={rClassInner} options={options} />
         <div className={`${bClass} ${rClass} ${sClass} bg-t-surface p-6`}>
           <div className="flex items-center text-xs text-t-muted mb-6">
             <span className="hover:text-t-primary cursor-pointer transition-colors">Home</span> <ChevronRight size={12} className="mx-1"/> 
             <span className="hover:text-t-primary cursor-pointer transition-colors">Settings</span> <ChevronRight size={12} className="mx-1"/> 
             <span className="text-t-text font-medium">Profile</span>
           </div>
           <div className={`h-32 bg-t-surface2 ${rClassInner} animate-pulse`}></div>
         </div>
      </section>

      <div className="flex-1"></div>

      {/* Footer */}
      <footer className={`mt-12 border-t ${options.borderWidth > 0 ? 'border-t-border' : 'border-transparent'} pt-12 pb-4`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
              <div className="font-bold text-t-text flex items-center gap-2">
                <div className={`w-6 h-6 ${rClassInner} ${primaryBg}`}></div>
                Brand
              </div>
              <p className="text-sm text-t-muted leading-relaxed">
                Building the future of design systems, one token at a time.
              </p>
          </div>
          <div className="space-y-4">
              <div className="font-bold text-t-text text-sm uppercase tracking-wider">Product</div>
              <ul className="space-y-2 text-sm text-t-muted">
                <li className="hover:text-t-primary cursor-pointer transition-colors">Features</li>
                <li className="hover:text-t-primary cursor-pointer transition-colors">Integrations</li>
                <li className="hover:text-t-primary cursor-pointer transition-colors">Pricing</li>
              </ul>
          </div>
          <div className="space-y-4">
              <div className="font-bold text-t-text text-sm uppercase tracking-wider">Resources</div>
              <ul className="space-y-2 text-sm text-t-muted">
                <li className="hover:text-t-primary cursor-pointer transition-colors">Documentation</li>
                <li className="hover:text-t-primary cursor-pointer transition-colors">API Reference</li>
                <li className="hover:text-t-primary cursor-pointer transition-colors">Community</li>
              </ul>
          </div>
          <div className="space-y-4">
              <div className="font-bold text-t-text text-sm uppercase tracking-wider">Legal</div>
              <ul className="space-y-2 text-sm text-t-muted">
                <li className="hover:text-t-primary cursor-pointer transition-colors">Privacy Policy</li>
                <li className="hover:text-t-primary cursor-pointer transition-colors">Terms of Service</li>
              </ul>
          </div>
        </div>
        
        <div className={`${bBottom} mb-4`}></div>
        <div className={`flex flex-col md:flex-row justify-between items-center text-xs text-t-muted pt-4 gap-4`}>
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
