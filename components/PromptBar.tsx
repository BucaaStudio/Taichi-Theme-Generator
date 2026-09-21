import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import { THEME_PROMPT_EXAMPLES } from '../utils/promptTheme';
import { imageFileToPromptDataUrl } from '../utils/imageResize';

interface PromptBarProps {
  value: string;
  image: string | null;
  // An AI theme is on screen, so short follow-ups edit it.
  canRefine: boolean;
  busy: boolean;
  error: string | null;
  rationale: string | null;
  inputStyle: React.CSSProperties;
  primary: string;
  primaryFg: string;
  muted: string;
  border: string;
  onChange: (value: string) => void;
  onImageChange: (image: string | null) => void;
  onError: (message: string) => void;
  onSubmit: (prompt?: string) => void;
}

const PromptBar: React.FC<PromptBarProps> = ({
  value,
  image,
  canRefine,
  busy,
  error,
  rationale,
  inputStyle,
  primary,
  primaryFg,
  muted,
  border,
  onChange,
  onImageChange,
  onError,
  onSubmit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const attach = async (file: Blob | null | undefined) => {
    if (!file) return;
    try {
      onImageChange(await imageFileToPromptDataUrl(file));
    } catch (attachError) {
      onError(attachError instanceof Error ? attachError.message : 'Could not read that image.');
    }
  };
  const attachRef = useRef(attach);
  attachRef.current = attach;

  // An image on the clipboard can only be meant for the prompt, so paste works
  // from anywhere on the page.
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const file = Array.from<File>(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      void attachRef.current(file);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <form
      className="px-3 lg:px-4 pt-3 pb-4 md:pt-5 md:pb-6 border-t"
      style={{ borderColor: border }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        setDragging(false);
        void attach(Array.from<File>(event.dataTransfer.files).find((file) => file.type.startsWith('image/')));
      }}
    >
      <div className="max-w-3xl mx-auto space-y-2.5">
        <h2 className="hidden md:block text-center text-xl font-bold tracking-tight">
          Describe a theme. <span style={{ color: primary }}>AI builds it.</span>
        </h2>
        <div
          className="flex items-center gap-2 rounded-xl border-2 pl-4 pr-1.5 py-1.5 shadow-md transition-shadow focus-within:shadow-lg"
          style={{ ...inputStyle, borderColor: primary, borderStyle: dragging ? 'dashed' : 'solid' }}
        >
          <Sparkles size={18} className="shrink-0" style={{ color: primary }} />
          {image && (
            <div className="relative shrink-0">
              <img src={image} alt="Attached reference" className="h-9 w-9 rounded-md object-cover border" style={{ borderColor: border }} />
              <button
                type="button"
                onClick={() => onImageChange(null)}
                disabled={busy}
                aria-label="Remove image"
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full shadow"
                style={{ backgroundColor: primary, color: primaryFg }}
              >
                <X size={10} />
              </button>
            </div>
          )}
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={
              dragging
                ? 'Drop the image to use its colors'
                : image
                  ? 'Optional: steer it — "calmer", "make the blue primary"'
                  : canRefine
                    ? 'Refine it — "warmer", "make secondary teal" — or describe a new theme'
                    : 'Describe a theme, or paste an image'
            }
            disabled={busy}
            maxLength={400}
            autoFocus
            className="flex-1 min-w-0 bg-transparent text-base py-1.5 focus:outline-none disabled:opacity-60"
            aria-label="Describe a color theme"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void attach(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            title="Attach an image (or paste / drop one)"
            aria-label="Attach an image"
            className="shrink-0 rounded-lg p-2 transition-opacity hover:opacity-70 disabled:opacity-50"
            style={{ color: muted }}
          >
            <ImagePlus size={18} />
          </button>
          <button
            type="submit"
            disabled={busy || (!value.trim() && !image)}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: primary, color: primaryFg }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
          </button>
        </div>
        {error ? (
          <p className="text-xs text-center" style={{ color: '#dc2626' }}>{error}</p>
        ) : image && !rationale ? (
          <p className="text-xs text-center" style={{ color: muted }}>
            The image is downsized in your browser, then sent to the AI model to read its colors.
          </p>
        ) : rationale ? (
          <p className="text-xs text-center" style={{ color: muted }}>{rationale}</p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs" style={{ color: muted }}>
            <span>Try</span>
            {THEME_PROMPT_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                disabled={busy}
                onClick={() => onSubmit(example)}
                className="rounded-full border px-2.5 py-0.5 transition-opacity hover:opacity-70 disabled:opacity-50"
                style={{ borderColor: border }}
              >
                {example}
              </button>
            ))}
            <span>or paste an image</span>
          </div>
        )}
      </div>
    </form>
  );
};

export default PromptBar;
