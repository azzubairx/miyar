import { useEffect, useRef, useState } from 'react';
import {
  CameraIcon,
  CloseIcon,
  FlashIcon,
  RotateIcon,
  StopIcon,
  SwitchCameraIcon,
} from './Icons';
import { captureVideoFrame } from '../lib/imaging/image';
import { useCamera } from '../lib/imaging/useCamera';

export default function CameraCapture({
  title,
  hint,
  guide = 'املأ الإطار بالملصق، وثبّت الهاتف في الإضاءة الجيدة',
  captureLabel = 'التقاط',
  busy = false,
  onCapture,
  onClose,
}: {
  title: string;
  hint?: string;
  guide?: string;
  captureLabel?: string;
  busy?: boolean;
  onCapture: (blob: Blob) => void | Promise<void>;
  onClose: () => void;
}) {
  const camera = useCamera('environment');
  const [capturing, setCapturing] = useState(false);
  const [localError, setLocalError] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void camera.start();
  }, [camera]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCapture = async () => {
    const video = camera.videoRef.current;
    if (!video || !camera.ready || capturing || busy) return;
    setCapturing(true);
    setLocalError('');
    try {
      const blob = await captureVideoFrame(video, 1600);
      await onCapture(blob);
    } catch (error) {
      setLocalError((error as Error).message || 'تعذّر التقاط الصورة.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="camera-panel" role="dialog" aria-modal="true" aria-label={title}>
      <div className="camera-head">
        <div>
          <strong>{title}</strong>
          {hint && <p>{hint}</p>}
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق الكاميرا">
          <CloseIcon size={20} />
        </button>
      </div>

      <div className="camera-stage">
        <video
          ref={camera.videoRef}
          className={`camera-video ${camera.state === 'active' ? 'is-active' : ''}`}
          playsInline
          muted
          aria-label="بث الكاميرا المباشر"
        />
        <div className="camera-guide" aria-hidden="true">
          <span className="camera-guide-corner tl" />
          <span className="camera-guide-corner tr" />
          <span className="camera-guide-corner bl" />
          <span className="camera-guide-corner br" />
        </div>

        {camera.state === 'starting' && (
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

      <p className="camera-guide-label">{guide}</p>
      {localError && <p className="camera-error">{localError}</p>}

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
        <button
          type="button"
          className="camera-shutter"
          onClick={handleCapture}
          disabled={!camera.ready || capturing || busy}
          aria-label={captureLabel}
        >
          <CameraIcon size={26} />
        </button>
        <button
          type="button"
          className={`camera-tool ${camera.torchOn ? 'is-on' : ''}`}
          onClick={() => camera.toggleTorch()}
          disabled={!camera.torchSupported}
          title={camera.torchSupported ? 'تشغيل/إطفاء الفلاش' : 'الفلاش غير متاح على هذه الكاميرا'}
        >
          <FlashIcon size={20} />
          <span>فلاش</span>
        </button>
      </div>

      <div className="camera-footer">
        <button type="button" className="button button-ghost button-small" onClick={onClose}>
          <StopIcon size={16} />
          إيقاف الكاميرا
        </button>
        <span className="camera-privacy">الصورة تبقى على جهازك ولا تُرفع إلى أي خادم.</span>
      </div>
    </div>
  );
}
