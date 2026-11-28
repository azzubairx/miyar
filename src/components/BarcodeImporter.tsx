import { useEffect, useMemo, useRef, useState } from 'react';
import BarcodeScanner from './BarcodeScanner';
import { CameraIcon, ImageIcon, ScanIcon } from './Icons';
import { importCosmeticsBarcode, importFoodBarcode, type BarcodeImportResult } from '../lib/barcode';
import { barcodeDigits, validateBarcode } from '../lib/imaging/barcode-format';
import { getImagingSetting, setImagingSetting } from '../lib/imaging/storage';
import type { BarcodeDecodeResult } from '../lib/imaging/types';

export default function BarcodeImporter({
  kind,
  onImported,
}: {
  kind: 'food' | 'cosmetics';
  onImported: (result: BarcodeImportResult) => void;
}) {
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [decodeMessage, setDecodeMessage] = useState('');
  const [decodingImage, setDecodingImage] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [allowExternal, setAllowExternal] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    void getImagingSetting('barcode-external-lookup', true).then((value) => {
      if (!active) return;
      setAllowExternal(value);
      setSettingsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const validation = useMemo(() => {
    if (barcodeDigits(barcode).length < 8) return null;
    return validateBarcode(barcode);
  }, [barcode]);

  const updateBarcode = (value: string) => {
    setBarcode(value);
    setStatus('idle');
    setMessage('');
    setDecodeMessage('');
  };

  const toggleExternal = async (next: boolean) => {
    setAllowExternal(next);
    await setImagingSetting('barcode-external-lookup', next);
  };

  const handleImport = async () => {
    setStatus('loading');
    setMessage('جارٍ التحقق من الذاكرة المحلية ثم القاعدة العامة…');
    const result =
      kind === 'food'
        ? await importFoodBarcode(barcode, { allowExternal })
        : await importCosmeticsBarcode(barcode, { allowExternal });
    setMessage(result.message_ar);
    if (result.ok) {
      setStatus('done');
      onImported(result);
    } else {
      setStatus('error');
    }
  };

  const handleDecoded = (result: BarcodeDecodeResult) => {
    setScannerOpen(false);
    updateBarcode(result.text);
    setDecodeMessage(`قُرئ باركود ${result.format}: ${result.text}. راجع الرقم ثم اضغط «استيراد».`);
    window.setTimeout(() => manualInputRef.current?.focus(), 50);
  };

  const handleImageDecode = async (file: File | undefined) => {
    if (!file) return;
    setDecodingImage(true);
    setDecodeMessage('');
    try {
      const { decodeBarcodeFromImage } = await import('../lib/imaging/barcode-scanner');
      const result = await decodeBarcodeFromImage(file);
      if (result) {
        updateBarcode(result.text);
        setDecodeMessage(`قُرئ باركود ${result.format} من الصورة: ${result.text}.`);
      } else {
        setDecodeMessage(
          'لم نعثر على باركود واضح في الصورة. جرّب صورة أقرب وأوضح، أو أدخل الرقم يدويًا.',
        );
      }
    } catch (error) {
      setDecodeMessage((error as Error).message || 'تعذّرت قراءة الصورة.');
    } finally {
      setDecodingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const sourceLabel = kind === 'food' ? 'Open Food Facts' : 'Open Beauty Facts';

  return (
    <div className="barcode-box">
      <div className="barcode-copy">
        <strong>استيراد اختياري بالباركود</strong>
        <p>
          نبحث أولًا في ذاكرة الجهاز، ثم في {sourceLabel} إن فعّلت البحث الخارجي. تُستورد الحقول
          الخام فقط، دون Nutri-Score أو NOVA أو أي تصنيف خارجي، وكل قيمة قابلة للتعديل.
        </p>
      </div>

      <div className="barcode-actions">
        <button
          type="button"
          className="button button-ghost button-small"
          onClick={() => setScannerOpen(true)}
        >
          <ScanIcon size={18} />
          مسح بالكاميرا
        </button>
        <button
          type="button"
          className="button button-ghost button-small"
          onClick={() => imageInputRef.current?.click()}
          disabled={decodingImage}
        >
          <ImageIcon size={18} />
          {decodingImage ? 'جارٍ فك الصورة…' : 'قراءة من صورة'}
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => void handleImageDecode(event.target.files?.[0])}
        />
        <button
          type="button"
          className="button button-ghost button-small"
          onClick={() => manualInputRef.current?.focus()}
        >
          <CameraIcon size={18} />
          إدخال يدوي
        </button>
      </div>

      {decodeMessage && <p className="barcode-message">{decodeMessage}</p>}

      <div className="barcode-controls">
        <label className="sr-only" htmlFor={`${kind}-barcode`}>
          رقم الباركود
        </label>
        <input
          ref={manualInputRef}
          id={`${kind}-barcode`}
          type="text"
          inputMode="numeric"
          value={barcode}
          onChange={(event) => updateBarcode(event.target.value)}
          placeholder="مثال: 3017620422003"
          autoComplete="off"
          dir="ltr"
        />
        <button
          type="button"
          className="button button-ghost button-small"
          onClick={handleImport}
          disabled={status === 'loading' || barcode.trim().length === 0}
        >
          {status === 'loading' ? 'جارٍ الاستيراد…' : 'استيراد'}
        </button>
      </div>

      {validation && (
        <p className={`barcode-validation ${validation.valid ? 'is-valid' : 'is-invalid'}`}>
          {validation.format && <strong>{validation.format}</strong>}
          {' — '}
          {validation.message_ar}
        </p>
      )}

      <label className="barcode-toggle">
        <input
          type="checkbox"
          checked={allowExternal}
          disabled={!settingsLoaded}
          onChange={(event) => void toggleExternal(event.target.checked)}
        />
        <span>
          السماح بالبحث الخارجي في {sourceLabel} عند غياب المنتج محليًا. عند التعطيل يعمل الاستيراد
          من ذاكرة الجهاز فقط.
        </span>
      </label>

      {message && (
        <p
          className={`barcode-message ${status === 'error' ? 'is-error' : status === 'done' ? 'is-done' : ''}`}
        >
          {message}
        </p>
      )}

      {scannerOpen && (
        <BarcodeScanner
          onDecoded={handleDecoded}
          onManual={() => {
            setScannerOpen(false);
            window.setTimeout(() => manualInputRef.current?.focus(), 50);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
