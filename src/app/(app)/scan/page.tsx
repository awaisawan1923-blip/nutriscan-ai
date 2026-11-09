'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ImagePlus, RefreshCw, ScanLine, Trash2, UploadCloud, X } from 'lucide-react';
import { Modal, Spinner, useToast } from '@/components/ui';
import { shrinkImage } from '@/lib/data';

const STAGES = ['Uploading your photo', 'Recognising foods and portions', 'Matching foods to the nutrition database', 'Saving your scan'];
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ScanPage() {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const inflight = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [webcam, setWebcam] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3500);
    return () => clearInterval(t);
  }, [busy]);

  function accept(f: File | undefined | null) {
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError('Please choose a JPEG, PNG or WebP photo.');
    if (f.size > 25 * 1024 * 1024) return setError('That photo is too large. Choose one under 25 MB.');
    setError(null); setFile(f); setPreview(URL.createObjectURL(f));
  }
  const clear = () => { setFile(null); setPreview(null); setError(null); };

  async function analyze() {
    if (!file || inflight.current) return; // blocks duplicate submissions
    inflight.current = true; setBusy(true); setStage(0); setError(null);
    try {
      const small = await shrinkImage(file);
      const body = new FormData();
      body.append('image', small); if (hint.trim()) body.append('hint', hint.trim().slice(0, 200));
      const r = await fetch('/api/analyze', { method: 'POST', body });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? 'Analysis failed. Please try again.');
      router.push(`/scan/${j.id}`);
    } catch (e) {
      setError((e as Error).message); toast((e as Error).message, 'error');
      setBusy(false); inflight.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Scan a meal</h1>
        <p className="mt-1 text-muted">Take or upload a photo. Shots from above in good light work best.</p>
      </div>

      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files[0]); }}
          className={`card grid place-items-center gap-5 border-2 border-dashed px-6 py-14 text-center transition ${drag ? 'border-primary bg-soft' : ''}`}>
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-soft text-primary"><UploadCloud className="h-8 w-8" /></span>
          <div><p className="text-lg font-bold">Drop a food photo here</p><p className="text-sm text-muted">JPEG, PNG or WebP</p></div>
          <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
            <button className="btn-primary flex-1" onClick={() => camRef.current?.click()}><Camera className="h-4 w-4" />Take photo</button>
            <button className="btn-ghost flex-1" onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" />Browse</button>
          </div>
          <button className="hidden text-sm text-muted underline md:block" onClick={() => setWebcam(true)}>Use this computer’s webcam</button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
          <input ref={fileRef} type="file" accept={TYPES.join(',')} hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your food photo preview" className="max-h-[460px] w-full object-cover" />
            {busy && (
              <div className="absolute inset-0 grid place-items-center bg-ink/60 backdrop-blur-[2px]">
                <div className="relative h-full w-full overflow-hidden">
                  <div className="absolute inset-x-0 h-24 animate-[scan_2.2s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-accent/50 to-transparent" />
                </div>
                <p className="absolute flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white"><Spinner />{STAGES[stage]}…</p>
              </div>
            )}
          </div>
          <div className="space-y-3 p-4">
            <label className="block text-sm font-medium">Anything we should know? <span className="font-normal text-muted">(optional)</span>
              <input className="input mt-1" maxLength={200} value={hint} onChange={(e) => setHint(e.target.value)} disabled={busy} placeholder="e.g. homemade, cooked in little oil, half portion" />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary flex-1" onClick={analyze} disabled={busy}>{busy ? <Spinner /> : <ScanLine className="h-4 w-4" />}{busy ? 'Analysing…' : 'Analyze food'}</button>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}><RefreshCw className="h-4 w-4" />Replace</button>
              <button className="btn-ghost" onClick={clear} disabled={busy}><Trash2 className="h-4 w-4" />Remove</button>
            </div>
            <input ref={fileRef} type="file" accept={TYPES.join(',')} hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </div>
      )}

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"><X className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      <p className="text-xs text-muted">Portion sizes and hidden ingredients can’t be measured from a photo. You’ll be able to review and correct everything before saving.</p>
      {webcam && <WebcamModal onClose={() => setWebcam(false)} onCapture={(f) => { setWebcam(false); accept(f); }} />}
      <style>{`@keyframes scan{0%{top:-6rem}100%{top:100%}}`}</style>
    </div>
  );
}

function WebcamModal({ onClose, onCapture }: { onClose: () => void; onCapture: (f: File) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stream: MediaStream | undefined;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => { stream = s; if (video.current) video.current.srcObject = s; })
      .catch(() => setErr('Camera access was blocked. Allow camera permission in your browser, or use Browse.'));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  function snap() {
    const v = video.current; if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    c.toBlob((b) => b && onCapture(new File([b], 'capture.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.9);
  }
  return (
    <Modal title="Take a photo" onClose={onClose}>
      {err ? <p className="text-sm text-red-600">{err}</p> : <video ref={video} autoPlay playsInline muted className="w-full rounded-xl bg-black" />}
      <button className="btn-primary mt-3 w-full" onClick={snap} disabled={!!err}><Camera className="h-4 w-4" />Capture</button>
    </Modal>
  );
}
