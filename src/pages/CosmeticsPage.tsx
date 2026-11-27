import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import BarcodeImporter from '../components/BarcodeImporter';
import { SelectField, TextAreaField, TextField } from '../components/form';
import { ArrowIcon, FlaskIcon } from '../components/Icons';
import { Callout, SectionHeading } from '../components/ui';
import { useApp } from '../context/AppContext';
import { cosmeticIngredients, meta } from '../database';
import { evaluateCosmetics } from '../lib/cosmetics/evaluate';
import { splitIngredientList } from '../lib/normalize';
import type { CosmeticsProductInput } from '../types';
import type { BarcodeImportResult } from '../lib/barcode';

const PRODUCT_TYPES = [
  { value: 'face-cream', label: 'كريم / سيروم وجه' },
  { value: 'body-lotion', label: 'لوشن / كريم جسم' },
  { value: 'sunscreen', label: 'واقي شمس' },
  { value: 'shampoo', label: 'شامبو' },
  { value: 'conditioner', label: 'بلسم / منتج شعر يُشطف' },
  { value: 'body-wash', label: 'غسول جسم / جل استحمام' },
  { value: 'hand-soap', label: 'صابون يدين' },
  { value: 'deodorant', label: 'مزيل عرق غير رشاش' },
  { value: 'deodorant-spray', label: 'مزيل عرق رشاش' },
  { value: 'toothpaste', label: 'معجون أسنان' },
  { value: 'hair-dye', label: 'صبغة شعر' },
  { value: 'nail-polish', label: 'منتج أظافر' },
  { value: 'perfume', label: 'عطر' },
  { value: 'baby', label: 'منتج أطفال' },
  { value: 'other', label: 'أخرى' },
];

const AREAS = [
  { value: 'face', label: 'الوجه' },
  { value: 'body', label: 'الجسم' },
  { value: 'hair', label: 'الشعر' },
  { value: 'lips', label: 'الشفاه' },
  { value: 'nails', label: 'الأظافر' },
  { value: 'underarms', label: 'الإبط' },
  { value: 'oral', label: 'الفم' },
  { value: 'other', label: 'أخرى' },
];

export default function CosmeticsPage() {
  const navigate = useNavigate();
  const { setResult } = useApp();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [productType, setProductType] = useState('face-cream');
  const [category, setCategory] = useState('');
  const [application, setApplication] = useState<'leave-on' | 'rinse-off'>('leave-on');
  const [area, setArea] = useState('face');
  const [ingredientsText, setIngredientsText] = useState('');
  const [warnings, setWarnings] = useState('');
  const [concentrations, setConcentrations] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const parsed = useMemo(() => splitIngredientList(ingredientsText), [ingredientsText]);

  const handleImported = (imported: BarcodeImportResult) => {
    if (imported.name) setName(imported.name);
    if (imported.brand) setBrand(imported.brand);
    if (imported.ingredientsText) setIngredientsText(imported.ingredientsText);
  };

  const fillExample = () => {
    setName('شامبو مثال');
    setBrand('مثال توضيحي');
    setProductType('shampoo');
    setCategory('العناية بالشعر');
    setApplication('rinse-off');
    setArea('hair');
    setIngredientsText(
      'Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Methylisothiazolinone, Parfum, Limonene, Linalool, Sodium Chloride',
    );
    setConcentrations({ Methylisothiazolinone: '0.002' });
    setWarnings('');
    setError('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('أدخل اسم المنتج على الأقل.');
      return;
    }
    if (parsed.length === 0) {
      setError('أدخل قائمة المكونات (INCI) قبل التقييم.');
      return;
    }

    const numericConcentrations: Record<string, number | null> = {};
    for (const token of parsed) {
      const raw = concentrations[token.raw];
      if (raw === undefined || raw.trim() === '') {
        numericConcentrations[token.raw] = token.concentration;
      } else {
        const parsedValue = Number(raw.replace(',', '.'));
        numericConcentrations[token.raw] =
          Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
      }
    }

    const product: CosmeticsProductInput = {
      name: name.trim(),
      brand: brand.trim(),
      productType,
      category: category.trim(),
      application,
      area,
      ingredientsText: ingredientsText.trim(),
      concentrations: numericConcentrations,
      warnings: warnings.trim(),
    };
    const result = evaluateCosmetics(product, cosmeticIngredients, meta.version);
    setResult(result);
    navigate('/report');
  };

  return (
    <div className="page">
      <header className="page-intro">
        <div className="page-intro-icon">
          <FlaskIcon size={28} />
        </div>
        <div>
          <span className="mono-label">COSMETICS / EU 1223/2009</span>
          <h1>تحليل تجميلي</h1>
          <p>
            الصق قائمة INCI، وحدد نوع المنتج وطريقة الاستخدام. يقارن المحرك كل مكوّن بالملاحق
            التنظيمية ويعرض المحاور منفصلة، دون درجة مركبة.
          </p>
        </div>
      </header>

      <div className="form-layout">
        <form className="analysis-form" onSubmit={handleSubmit} noValidate>
          <section className="form-section">
            <div className="form-section-head">
              <span className="form-section-number">01</span>
              <div>
                <h2>بيانات المنتج</h2>
                <p>نوع المنتج وطريقة الاستخدام يحددان أي حد تنظيمي ينطبق.</p>
              </div>
            </div>
            <div className="field-grid two">
              <TextField
                id="cos-name"
                label="اسم المنتج"
                value={name}
                onChange={setName}
                placeholder="مثال: كريم وجه مرطب"
                required
              />
              <TextField
                id="cos-brand"
                label="العلامة التجارية"
                value={brand}
                onChange={setBrand}
                placeholder="مثال: علامة محلية"
              />
              <SelectField
                id="cos-type"
                label="نوع المنتج"
                value={productType}
                onChange={setProductType}
                options={PRODUCT_TYPES}
              />
              <TextField
                id="cos-category"
                label="الفئة"
                value={category}
                onChange={setCategory}
                placeholder="مثال: العناية بالبشرة"
              />
              <SelectField
                id="cos-area"
                label="منطقة الاستخدام"
                value={area}
                onChange={setArea}
                options={AREAS}
              />
              <div className="field">
                <span className="field-label-row">
                  <span className="field-label">طريقة الاستخدام</span>
                </span>
                <div className="segmented" role="group" aria-label="طريقة الاستخدام">
                  <button
                    type="button"
                    className={application === 'leave-on' ? 'is-selected' : ''}
                    aria-pressed={application === 'leave-on'}
                    onClick={() => setApplication('leave-on')}
                  >
                    يُترك على الجلد
                  </button>
                  <button
                    type="button"
                    className={application === 'rinse-off' ? 'is-selected' : ''}
                    aria-pressed={application === 'rinse-off'}
                    onClick={() => setApplication('rinse-off')}
                  >
                    يُشطف
                  </button>
                </div>
                <p className="field-hint">يؤثر على حدود المواد الحافظة ومسببات الحساسية العطرية.</p>
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <span className="form-section-number">02</span>
              <div>
                <h2>قائمة المكونات (INCI)</h2>
                <p>الصق القائمة كما هي. لا تُستنتج التراكيز من الترتيب؛ أدخل التركيز فقط إذا كان موثقًا.</p>
              </div>
            </div>
            <TextAreaField
              id="cos-ingredients"
              label="المكونات"
              value={ingredientsText}
              onChange={setIngredientsText}
              placeholder="Aqua, Glycerin, Methylparaben, Parfum, Limonene…"
              hint="افصل بين المكونات بفواصل أو أسطر جديدة. الأقواس محفوظة."
              rows={7}
            />

            {parsed.length > 0 && (
              <div className="concentration-panel">
                <div className="concentration-head">
                  <div>
                    <h3>تراكيز اختيارية</h3>
                    <p>
                      أدخل النسبة فقط إذا كانت معروفة من الملصق أو وثيقة التركيبة. اتركها فارغة
                      وسيعلن المحرك أن التحقق غير ممكن.
                    </p>
                  </div>
                  <span className="count-pill">{parsed.length} مكوّنًا</span>
                </div>
                <div className="concentration-list">
                  {parsed.map((token, index) => {
                    const value =
                      concentrations[token.raw] ??
                      (token.concentration !== null ? String(token.concentration) : '');
                    return (
                      <div className="concentration-row" key={`${token.raw}-${index}`}>
                        <span className="concentration-index">{String(index + 1).padStart(2, '0')}</span>
                        <span className="concentration-name" dir="auto">
                          {token.raw}
                        </span>
                        <div className="concentration-input">
                          <label className="sr-only" htmlFor={`conc-${index}`}>
                            تركيز {token.raw} بالنسبة المئوية
                          </label>
                          <input
                            id={`conc-${index}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            placeholder="غير معروف"
                            value={value}
                            onChange={(event) =>
                              setConcentrations((current) => ({
                                ...current,
                                [token.raw]: event.target.value,
                              }))
                            }
                          />
                          <span>%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <span className="form-section-number">03</span>
              <div>
                <h2>تحذيرات الملصق</h2>
                <p>اختياري. انسخ أي تحذير رسمي، وسيظهر في التقرير للسياق.</p>
              </div>
            </div>
            <TextAreaField
              id="cos-warnings"
              label="التحذيرات"
              value={warnings}
              onChange={setWarnings}
              placeholder="مثال: للاستخدام الخارجي فقط. تجنب ملامسة العينين."
              rows={3}
            />
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <span className="form-section-number">04</span>
              <div>
                <h2>استيراد اختياري</h2>
                <p>تعبئة أولية من Open Beauty Facts، ثم مراجعة يدوية إلزامية.</p>
              </div>
            </div>
            <BarcodeImporter kind="cosmetics" onImported={handleImported} />
          </section>

          {error && (
            <Callout tone="attention" title="تحقق من المدخلات">
              {error}
            </Callout>
          )}

          <div className="form-actions">
            <button type="submit" className="button button-primary">
              حلّل المكونات
              <ArrowIcon size={18} />
            </button>
            <button type="button" className="button button-ghost" onClick={fillExample}>
              تعبئة مثال توضيحي
            </button>
          </div>
        </form>

        <aside className="form-aside">
          <div className="aside-card">
            <span className="mono-label">WHAT WE CHECK</span>
            <h3>أربعة محاور، لا درجة</h3>
            <ul className="check-list">
              <li>محظور في الملحق II</li>
              <li>مقيد في الملاحق III أو V أو VI</li>
              <li>وسم إلزامي لمسببات الحساسية العطرية</li>
              <li>مكوّن خارج تغطية قاعدة المعرفة</li>
            </ul>
            <p className="aside-note">
              لا نجمع هذه المحاور في رقم واحد. منتج فيه مكوّن محظور ليس «أفضل» من منتج فيه ثلاثة
              مكونات مقيدة؛ لكل محور معنى تنظيمي مختلف.
            </p>
          </div>

          <div className="aside-card aside-card-quiet">
            <h3>التركيز ليس ترتيبًا</h3>
            <p>
              قائمة INCI مرتبة تنازليًا حسب التركيز حتى حد معين، لكنها لا تمنحك نسبة. لا يجوز
              استخدام الترتيب لاستنتاج 5% أو 0.1%، لذلك لا يفعله المحرك.
            </p>
            <p>
              عند غياب التركيز، تظهر النتيجة «تحقق غير ممكن» بدل «ضمن الحد». هذه ليست ثغرة؛ إنها
              الحد الفاصل بين التحقق والتخمين.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
