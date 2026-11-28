import { useEffect, useRef, useState } from 'react';
import { CloseIcon, FlashIcon, ScanIcon, SwitchCameraIcon } from './Icons';
import { useCamera } from '../lib/imaging/useCamera';
import type { BarcodeDecodeResult } from '../lib/imaging/types';

const DUPLICATE_WINDOW_MS = 2500;

export default function BarcodeScanner({
  onDecoded,
  onManual,
  onClose,
}: {
  onDecoded: (result: BarcodeDecodeResult) => void;
  onManual: () => void;
  onClose: () => void;
}) {
  const camera = useCamera('environment');
  const [status, setStatus] = useState('وجّه الباركود داخل الإطار وثبّت الهاتف');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);
  const decodingRef = useRef(false);
  const lastRef = useRef<{ text: string; at: number } | null>(null);
  const onDecodedRef = useRef(onDecoded);
  const stopRef = useRef(camera.stop);
  onDecodedRef.current = onDecoded;
  stopRef.current = camera.stop;

  useEffect(() => {
    void camera.start().finally(() => setStarting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (camera.state !== 'active') return;
    let cancelled = false;
    let timer = 0;

    const tick = async () => {
      if (cancelled) return;
      const video = camera.videoRef.current;
      if (video && !decodingRef.current) {
        decodingRef.current = true;
        try {
          const { decodeBarcodeFromImage, videoFrameToImageData } = await import(
            '../lib/imaging/barcode-scanner'
          );
          const frame = videoFrameToImageData(video, 1280);
          if (frame) {
            const result = await decodeBarcodeFromImage(frame);
            if (result && !cancelled) {
              const now = Date.now();
              const last = lastRef.current;
              if (!last || last.text !== result.text || now - last.at > DUPLICATE_WINDOW_MS) {
                lastRef.current = { text: result.text, at: now };
                setStatus(`تمت قراءة ${result.format}: ${result.text}`);
                stopRef.current();
                onDecodedRef.current(result);
                return;
              }
            }
          }
        } catch (caught) {
          if (!cancelled) setError((caught as Error).message);
        } finally {
          decodingRef.current = false;
        }
      }
      if (!cancelled) timer = window.setTimeout(tick, 300);
    };

    timer = window.setTimeout(tick, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [camera.state, camera.videoRef]);

  return (
    <div className="camera-panel barcode-scanner" role="dialog" aria-modal="true" aria-label="ماسح الباركود">
      <div className="camera-head">
        <div>
          <strong>مسح الباركود</strong>
          <p>EAN-13 · EAN-8 · UPC-A · UPC-E · GTIN-14</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق الماسح">
          <CloseIcon size={20} />
        </button>
      </div>

      <div className="camera-stage barcode-stage">
        <video
          ref={camera.videoRef}
          className={`camera-video ${camera.state === 'active' ? 'is-active' : ''}`}
          playsInline
          muted
          aria-label="بث الكاميرا لمسح الباركود"
        />
        <div className="barcode-guide" aria-hidden="true">
          <span className="barcode-laser" />
        </div>

        {starting && camera.state !== 'error' && (
          <div className="camera-overlay">
            <span className="spinner" aria-hidden="true" />
            <p>جارٍ تشغيل الكاميرا…</p>
          </div>
        )}

        {camera.state === 'error' && (
          <div className="camera-overlay camera-overlay-error">
            <p>{camera.error}</p>
            <button type="button" className="button button-ghost button-small" onClick={() => camera.start()}>
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>

      <p className="camera-guide-label">{status}</p>
      {error && <p className="camera-error">{error}</p>}

      <div className="camera-controls">
        <button
          type="button"
          className="camera-tool"
          onClick={() => camera.switchCamera()}
          disabled={camera.state !== 'active'}
        >
          <SwitchCameraIcon size={20} />
          <span>تبديل</span>
        </button>
        <button type="button" className="camera-shutter barcode-manual" onClick={onManual}>
          <ScanIcon size={24} />
        </button>
        <button
          type="button"
          className={`camera-tool ${camera.torchOn ? 'is-on' : ''}`}
          onClick={() => camera.toggleTorch()}
          disabled={!camera.torchSupported}
        >
          <FlashIcon size={20} />
          <span>فلاش</span>
        </button>
      </div>

      <div className="camera-footer">
        <button type="button" className="button button-ghost button-small" onClick={onManual}>
          إدخال الرقم يدويًا
        </button>
        <span className="camera-privacy">المسح يجري على جهازك، دون رفع الصور.</span>
      </div>
    </div>
  );
}
