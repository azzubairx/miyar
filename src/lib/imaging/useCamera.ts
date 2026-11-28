import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraState } from './types';

export type CameraFacing = 'environment' | 'user';

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: CameraState;
  error: string;
  facing: CameraFacing;
  ready: boolean;
  torchSupported: boolean;
  torchOn: boolean;
  start: (facing?: CameraFacing) => Promise<void>;
  stop: () => void;
  switchCamera: () => Promise<void>;
  toggleTorch: () => Promise<void>;
}

export function describeCameraError(error: unknown): string {
  const name = (error as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'لم يُسمح باستخدام الكاميرا. يمكنك السماح بها من إعدادات المتصفح، أو استخدام «اختيار من المعرض» بدلًا منها.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'لم نجد كاميرا متاحة على هذا الجهاز. استخدم «اختيار من المعرض» بدلًا منها.';
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'الكاميرا مشغولة بتطبيق آخر. أغلق التطبيق الآخر ثم أعد المحاولة، أو استخدم صورة من المعرض.';
  }
  return 'تعذّر تشغيل الكاميرا. يمكنك استخدام «اختيار من المعرض» أو الإدخال اليدوي.';
}

function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

/**
 * Manages a single camera stream. The camera is only requested when `start` is
 * called from a user gesture; every stop path releases the tracks so the phone's
 * camera indicator turns off.
 */
export function useCamera(defaultFacing: CameraFacing = 'environment'): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>('idle');
  const [error, setError] = useState('');
  const [facing, setFacing] = useState<CameraFacing>(defaultFacing);
  const [ready, setReady] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const attach = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    try {
      await video.play();
    } catch {
      /* Autoplay can be rejected; the frame is still available. */
    }
    const track = stream.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.() as
      | (MediaTrackCapabilities & { torch?: boolean })
      | undefined;
    setTorchSupported(Boolean(capabilities?.torch));
    setReady(true);
    setState('active');
  }, []);

  const start = useCallback(
    async (nextFacing?: CameraFacing) => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setState('error');
        setError(
          'هذا المتصفح لا يدعم الوصول إلى الكاميرا. استخدم «اختيار من المعرض» أو متصفحًا حديثًا على الهاتف.',
        );
        return;
      }
      const target = nextFacing ?? facing;
      setState('starting');
      setError('');
      setReady(false);
      stopStream(streamRef.current);
      streamRef.current = null;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: target },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        streamRef.current = stream;
        setFacing(target);
        await attach(stream);
      } catch (caught) {
        setState('error');
        setError(describeCameraError(caught));
      }
    },
    [attach, facing],
  );

  const stop = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
    setReady(false);
    setTorchOn(false);
    setTorchSupported(false);
    setState('idle');
  }, []);

  const switchCamera = useCallback(async () => {
    const next: CameraFacing = facing === 'environment' ? 'user' : 'environment';
    await start(next);
  }, [facing, start]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  useEffect(() => () => stop(), [stop]);

  return {
    videoRef,
    state,
    error,
    facing,
    ready,
    torchSupported,
    torchOn,
    start,
    stop,
    switchCamera,
    toggleTorch,
  };
}
