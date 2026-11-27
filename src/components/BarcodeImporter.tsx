import { useState } from 'react';
import { importCosmeticsBarcode, importFoodBarcode, type BarcodeImportResult } from '../lib/barcode';

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

  const handleImport = async () => {
    setStatus('loading');
    setMessage('جارٍ البحث في القاعدة العامة…');
    const result = kind === 'food' ? await importFoodBarcode(barcode) : await importCosmeticsBarcode(barcode);
    setMessage(result.message_ar);
    if (result.ok) {
      setStatus('done');
      onImported(result);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="barcode-box">
      <div className="barcode-copy">
        <strong>استيراد اختياري بالباركود</strong>
        <p>
          نقرأ الحقول الخام فقط من {kind === 'food' ? 'Open Food Facts' : 'Open Beauty Facts'}. لا
          نستورد Nutri-Score أو NOVA أو أي تصنيف خارجي، وكل قيمة قابلة للتعديل.
        </p>
      </div>
      <div className="barcode-controls">
        <label className="sr-only" htmlFor={`${kind}-barcode`}>
          رقم الباركود
        </label>
        <input
          id={`${kind}-barcode`}
          type="text"
          inputMode="numeric"
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          placeholder="مثال: 3017620422003"
          autoComplete="off"
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
      {message && (
        <p className={`barcode-message ${status === 'error' ? 'is-error' : status === 'done' ? 'is-done' : ''}`}>
          {message}
        </p>
      )}
    </div>
  );
}
