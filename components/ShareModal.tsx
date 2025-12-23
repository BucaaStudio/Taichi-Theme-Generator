import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Twitter, Facebook, Linkedin, Link as LinkIcon } from 'lucide-react';
import { ThemeTokens } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  theme: ThemeTokens; // Use the current theme for styling
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url, theme }) => {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) setMounted(true);
    else setTimeout(() => setMounted(false), 300); // Wait for exit animation
  }, [isOpen]);

  if (!mounted && !isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = "Check out this color theme I generated with Taichi Theme Generator!";
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  // Social Links
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        style={{ backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, borderWidth: 1 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: theme.primary }}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="white" stroke="none" />
                    <path d="M12 2 A10 10 0 0 1 12 22 A5 5 0 0 1 12 12 A5 5 0 0 0 12 2" fill="black" stroke="none"/>
                    <circle cx="15" cy="7" r="1.8" fill="white" stroke="none" />
                    <circle cx="9" cy="17" r="1.8" fill="black" stroke="none" />
                 </svg>
             </div>
             <div>
                <h2 className="text-lg font-bold leading-tight">Share Taichi Theme</h2>
                <p className="text-xs opacity-60 font-medium">Export & Share Config</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            style={{ color: theme.textMuted }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center space-y-8">
          
          {/* QR Code Card */}
          <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center space-y-2">
            <QRCodeSVG 
              value={url} 
              size={180} 
              level="M" 
              includeMargin={true}
              imageSettings={{
                src: "/favicon.svg", 
                x: undefined,
                y: undefined,
                height: 24,
                width: 24,
                excavate: true,
              }} 
            />
          </div>

          <div className="w-full space-y-2">
             <div className="flex items-center gap-2 p-1.5 rounded-xl border transition-colors focus-within:ring-2" 
                  style={{ backgroundColor: theme.surface2, borderColor: theme.border }}>
               <div className="p-2 text-opacity-50" style={{ color: theme.text }}>
                 <LinkIcon size={16} />
               </div>
               <input 
                 readOnly 
                 value={url} 
                 className="flex-1 bg-transparent text-sm font-mono outline-none truncate"
                 style={{ color: theme.textMuted }}
               />
               <button 
                 onClick={handleCopy}
                 className="p-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all hover:brightness-110 active:scale-95"
                 style={{ backgroundColor: copied ? theme.success : theme.primary, color: '#fff' }}
               >
                 {copied ? <Check size={16} /> : <Copy size={16} />}
               </button>
             </div>
          </div>

          <div className="w-full space-y-4">
            <div className="flex items-center justify-center gap-4">
              {/* X (Twitter) */}
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer" 
                 className="flex items-center justify-center w-12 h-12 rounded-full bg-black text-white hover:scale-110 transition-transform shadow-lg shadow-black/20"
                 title="Share on X">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </a>

              {/* Facebook */}
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" 
                 className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1877F2] text-white hover:scale-110 transition-transform shadow-lg shadow-[#1877F2]/20"
                 title="Share on Facebook">
                <Facebook size={20} fill="currentColor" />
              </a>

              {/* LinkedIn */}
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" 
                 className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0A66C2] text-white hover:scale-110 transition-transform shadow-lg shadow-[#0A66C2]/20"
                 title="Share on LinkedIn">
                <Linkedin size={20} fill="currentColor" />
              </a>

               {/* Reddit (Manual Link Construction) */}
               <a href={`https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`} target="_blank" rel="noopener noreferrer" 
                 className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FF4500] text-white hover:scale-110 transition-transform shadow-lg shadow-[#FF4500]/20"
                 title="Share on Reddit">
                 <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M14.238 15.348c.085.084.085.221 0 .306-.465.462-1.194.687-2.231.687l-.008-.002-.008.002c-1.036 0-1.766-.225-2.231-.688-.085-.084-.085-.221 0-.305.084-.084.222-.084.307 0 .379.377 1.008.561 1.924.561l.008.002.008-.002c.915 0 1.544-.184 1.924-.561.085-.084.223-.084.307 0zm-3.44-2.418c0-.507-.396-.914-.896-.914-.503 0-.908.407-.908.914s.405.914.908.914c.5 0 .896-.407.896-.914zm4.12 0c0-.507-.395-.914-.896-.914-.503 0-.908.407-.908.914s.405.914.908.914c.5 0 .896-.407.896-.914zm1.159-4.216c-1.502 0-2.87.509-3.958 1.353l.794-3.79 3.016.71c.026.549.467.989 1.01.989.559 0 1.012-.459 1.012-1.025 0-.565-.453-1.024-1.012-1.024-.541 0-.986.417-1.01.944l-3.354-.789c-.198-.046-.405.074-.447.27l-.934 4.453c-2.316.533-4.103 2.37-4.103 4.6l-.002.043c0 1.348.749 2.503 1.836 3.16.035 2.196 2.457 3.966 5.438 3.966s5.405-1.77 5.438-3.966c1.087-.657 1.835-1.812 1.835-3.16l-.001-.043c-.001-2.231-1.787-4.067-4.11-4.6z"/></svg>
              </a>

               {/* TikTok (Only App Link support mainly, no web share standard, but we'll try basic direct link if possible or just home)
                   Actually TikTok doesn't have a standard share URL like FB/Twitter. 
                   Usually people can't "share to TikTok" via web link easily to create a post.
                   However, user requested TikTok icon. I'll add the button but maybe link to create page or just #taichi
                   Better approach: Just link to TikTok main page or exclude if it does nothing. 
                   User requirement: "add tiktok". I will add the icon, but since web share to tiktok isn't standard, 
                   I will just make it a placeholder or link to tiktok.com. 
                   Wait, actually I shouldn't add a broken button. 
                   I'll assume the user might want a link to the PRODUCT's tiktok, but context is "Share this". 
                   I'll omit functional link and just link to tiktok.com/upload maybe?
                   Actually, let's stick to valid shares. 
                   If I must add TikTok, I'll add the icon and link it to taichi tiktok search?
                   Let's use a generic share intent if mobile? No.
                   I will add the icon but maybe just `target="_blank"` to tiktok.com for now as a "Share manually on TikTok" prompt?
                   Or better, exclude it if it doesn't work. But user explicitly asked "add tiktok".
                   Multi-platform share buttons (like ShareThis) usually don't have TikTok share. 
                   I'll add it as a "Copy Link & Open TikTok" action? That's complex.
                   I will simply add the icon linking to tiktok.com with the clipboard copy trigger.
               */}
               <button onClick={() => { handleCopy(); window.open('https://www.tiktok.com', '_blank'); }}
                 className="flex items-center justify-center w-12 h-12 rounded-full bg-black text-white hover:scale-110 transition-transform shadow-lg shadow-black/20"
                 title="Copy Link & Open TikTok">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
               </button>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ShareModal;
