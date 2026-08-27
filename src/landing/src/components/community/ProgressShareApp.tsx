import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { api } from '../../lib/api';
import type { UserProfile } from '../../lib/api';

type Format = 'square' | 'vertical' | 'landscape';

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center justify-between p-3 rounded-xl border ${checked ? 'border-emerald-500 bg-emerald-500/10' : 'border-surface-edge bg-surface'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-emerald-300'} transition-all`}>
    <span className={`text-sm font-bold ${checked ? 'text-emerald-900' : 'text-gray-300'}`}>{label}</span>
    <div className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <div className={`absolute top-1 bg-surface w-4 h-4 rounded-full transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} />
  </label>
);

const FormatBtn: React.FC<{ label: string; active: boolean; onClick: () => void; icon: string }> = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${active ? 'bg-black text-white shadow-md' : 'text-text-muted hover:text-white hover:bg-gray-800'}`}
  >
    <span>{icon}</span>
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export const ProgressShareApp: React.FC = () => {
  const [format, setFormat] = useState<Format>('square');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    api.auth.getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoadingUser(false));
  }, []);

  const [showWeight, setShowWeight] = useState(true);
  const [showMacros, setShowMacros] = useState(true);
  const [showStreak, setShowStreak] = useState(true);
  const [showPhoto, setShowPhoto] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const captureCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!canvasRef.current) return null;
    try {
      return await html2canvas(canvasRef.current, { scale: 2, useCORS: true, allowTaint: true });
    } catch (err) {
      console.error('Canvas capture failed:', err);
      return null;
    }
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) { alert('Failed to capture image.'); return; }
      const link = document.createElement('a');
      link.download = `fithub-progress-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setGenerating(false);
      setIsExportOpen(false);
    }
  };

  const handleCopy = async () => {
    setGenerating(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) { alert('Failed to capture image.'); return; }
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            alert('âœ… Progress card copied to clipboard!');
          } catch {
            alert('Copy not supported in this browser. Please use Save instead.');
          }
        }
      });
    } finally {
      setGenerating(false);
      setIsExportOpen(false);
    }
  };

  // Derived stats from real user data
  const weightNow = user?.biometrics?.weight ? Math.round(user.biometrics.weight * 2.20462) : 188;
  const weightBefore = weightNow + 12;
  const userName = user?.name || 'Your Progress';

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row bg-surface-alt text-white" style={{ minHeight: 'calc(100vh - 80px)' }}>

      {/* â”€â”€ Left Panel: Controls â”€â”€ */}
      <div className="w-full lg:w-72 bg-surface border-r border-surface-edge p-6 overflow-y-auto shrink-0 shadow-sm">
        <h2 className="text-xl font-black mb-1">Progress Studio</h2>
        <p className="text-xs text-text-subtle mb-6">Generate a shareable graphic of your achievements.</p>

        <div className="space-y-6">
          {/* Metrics */}
          <div>
            <h3 className="text-[10px] font-black text-text-subtle uppercase tracking-widest mb-3">Metrics to Display</h3>
            <div className="space-y-2">
              <Toggle label="Weight Milestone" checked={showWeight} onChange={setShowWeight} />
              <Toggle label="Macro Summary Ring" checked={showMacros} onChange={setShowMacros} />
              <Toggle label="Streak Counter" checked={showStreak} onChange={setShowStreak} />
            </div>
          </div>

          <div className="h-px bg-surface-edge" />

          {/* Visuals */}
          <div>
            <h3 className="text-[10px] font-black text-text-subtle uppercase tracking-widest mb-3">Visuals</h3>
            <div className="space-y-2">
              <Toggle label="Check-in Photo Background" checked={showPhoto} onChange={setShowPhoto} />
              {showPhoto && (
                <div className="ml-1 mt-2">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 border-2 border-dashed border-gray-700 rounded-xl text-xs font-bold text-text-muted hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                  >
                    {uploadedImage ? 'đŸ“¸ Change Photo' : 'đŸ“¸ Upload Your Photo'}
                  </button>
                </div>
              )}
              <Toggle label="FITHub Branding (Required)" checked={true} onChange={() => {}} disabled />
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="mt-8">
          <button
            onClick={() => setIsExportOpen(true)}
            className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <span>âœ¨</span> Generate &amp; Share
          </button>
        </div>
      </div>

      {/* â”€â”€ Center: Canvas Preview â”€â”€ */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-surface-edge/60 overflow-auto">
        {/* Format switcher */}
        <div className="flex bg-surface border border-surface-edge rounded-full p-1 mb-6 shadow-sm gap-1">
          <FormatBtn label="Square Feed" active={format === 'square'} onClick={() => setFormat('square')} icon="đŸ“±" />
          <FormatBtn label="Vertical Story" active={format === 'vertical'} onClick={() => setFormat('vertical')} icon="đŸï¸" />
          <FormatBtn label="Landscape" active={format === 'landscape'} onClick={() => setFormat('landscape')} icon="đŸ–¼ï¸" />
        </div>

        {/* The shareable card */}
        <div
          ref={canvasRef}
          className={`relative bg-black text-white rounded-3xl overflow-hidden shadow-2xl flex-shrink-0
            ${format === 'square' ? 'w-[380px] h-[380px]' : format === 'vertical' ? 'w-[310px] h-[550px]' : 'w-[560px] h-[295px]'}`}
        >
          {/* Background */}
          {showPhoto && uploadedImage ? (
            <>
              <div className="absolute inset-0 bg-black/50 z-10" />
              <img src={uploadedImage} className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-emerald-950">
              <div className="absolute top-0 right-0 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
            </div>
          )}

          {/* Card Content */}
          <div className="relative z-20 h-full w-full p-7 flex flex-col">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-800 overflow-hidden border-2 border-white/30 flex-shrink-0">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'me'}`} />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight">{userName}</p>
                  <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Progress Update</p>
                </div>
              </div>
              {showStreak && (
                <div className="flex items-center gap-1 bg-surface/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  <span className="text-orange-400 text-sm">đŸ”¥</span>
                  <span className="font-black text-xs">34 Day Streak</span>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className={`flex ${format === 'landscape' ? 'flex-row gap-4 items-end' : 'flex-col gap-4'} mt-auto mb-4`}>
              {showWeight && (
                <div className="bg-surface/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex-1">
                  <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest mb-2">Weight Journey</p>
                  <div className="flex items-end gap-3">
                    <div className="opacity-50">
                      <span className="text-base font-bold line-through">{weightBefore}</span>
                      <span className="text-[10px] ml-1">lbs</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black">{weightNow}</span>
                      <span className="text-xs text-emerald-400 font-bold">-12 lbs â†“</span>
                    </div>
                  </div>
                </div>
              )}
              {showMacros && (
                <div className="bg-surface/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex-1 flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full shrink-0 flex items-center justify-center relative"
                    style={{ background: 'conic-gradient(#10B981 0% 40%, #F59E0B 40% 75%, #3B82F6 75% 100%)' }}
                  >
                    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                      <span className="text-[9px] font-black text-white">100%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest mb-1">Daily Macros</p>
                    <div className="flex gap-2 text-[10px] font-bold">
                      <span className="text-emerald-400">P 180g</span>
                      <span className="text-yellow-400">C 220g</span>
                      <span className="text-blue-400">F 65g</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer branding */}
            <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-white/10">
              <span className="text-emerald-400 font-black tracking-tighter">FIT</span>
              <span className="text-white font-black tracking-tighter">Hub</span>
              <span className="text-[9px] text-text-subtle font-medium ml-1.5">fithub.app</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-text-subtle font-medium">
          Click <strong>Generate &amp; Share</strong> to export this card.
        </p>
      </div>

      {/* â”€â”€ Export Panel â”€â”€ */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setIsExportOpen(false)}>
          <div
            className="w-full max-w-sm bg-surface h-full shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideInRight 0.25s ease-out' }}
          >
            <div className="p-5 border-b border-surface-edge flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Export Your Card</h2>
                <p className="text-xs text-text-subtle mt-0.5">UC-19: Share Progress Milestone</p>
              </div>
              <button onClick={() => setIsExportOpen(false)} className="text-text-subtle hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center">&times;</button>
            </div>

            <div className="p-6 space-y-3 flex-1">
              {/* Download */}
              <button
                onClick={handleDownload}
                disabled={generating}
                className="w-full flex items-center gap-4 bg-black text-white px-5 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">â¬‡ï¸</span>
                <div className="text-left">
                  <div className="text-sm font-black">Save to Device</div>
                  <div className="text-xs font-normal opacity-70">Download as .png image</div>
                </div>
              </button>

              {/* Copy */}
              <button
                onClick={handleCopy}
                disabled={generating}
                className="w-full flex items-center gap-4 bg-surface-edge text-white px-5 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">đŸ“‹</span>
                <div className="text-left">
                  <div className="text-sm font-black">Copy to Clipboard</div>
                  <div className="text-xs font-normal text-text-muted">Paste into Instagram, Twitter, etc.</div>
                </div>
              </button>

              <div className="border-t border-surface-edge pt-4">
                <p className="text-xs text-center text-text-subtle">
                  Share your progress to Instagram, X (Twitter), Facebook, or any platform â€” just paste the copied image!
                </p>
              </div>
            </div>

            {generating && (
              <div className="p-5 bg-surface-alt border-t border-surface-edge flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-text-muted">Generating your card...</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};






