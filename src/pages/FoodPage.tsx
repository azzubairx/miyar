import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import BarcodeImporter from '../components/BarcodeImporter';
import ProductCapture from '../components/ProductCapture';
import type { ReviewPayload } from '../components/OcrReview';
import { NumberField, SelectField, TextAreaField, TextField } from '../components/form';
import { ArrowIcon, LeafIcon } from '../components/Icons';
import { Callout, SectionHeading } from '../components/ui';
import { useApp } from '../context/AppContext';
import { foodAdditives, meta } from '../database';
import { evaluateFood } from '../lib/food/evaluate';
import type { FoodProductInput } from '../types';
import type { BarcodeImportResult } from '../lib/barcode';

interface NutritionForm {
  energy_kj: string;
  energy_kcal: string;
  fat_saturated_g: string;
  sugars_total_g: string;
  fibre_g: string;
  protein_g: string;
  sodium_mg: string;
  salt_g: string;
  fruit_veg_nuts_percent: string;
}

const EMPTY_NUTRITION: NutritionForm = {
  energy_kj: '',
  energy_kcal: '',
  fat_saturated_g: '',
  sugars_total_g: '',
  fibre_g: '',
  protein_g: '',
  sodium_mg: '',
  salt_g: '',
  fruit_veg_nuts_percent: '',
};

const toNumberOrNull = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value);

export default function FoodPage() {
  const navigate = useNavigate();
  const { setResult } = useApp();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [productType, setProductType] = useState<'food' | 'drink'>('food');
  const [category, setCategory] = useState('');
  const [packageSize, setPackageSize] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [nutritionBasis, setNutritionBasis] = useState<'100g' | '100ml'>('100g');
  const [density, setDensity] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [nutrition, setNutrition] = useState<NutritionForm>(EMPTY_NUTRITION);
  const [fibreType, setFibreType] = useState<'' | 'NSP' | 'AOAC'>('');
  const [error, setError] = useState('');

  const setNutrient = (key: keyof NutritionForm) => (value: string) =>
    setNutrition((current) => ({ ...current, [key]: value }));

  const handleImported = (imported: BarcodeImportResult) => {
    if (imported.name) setName(imported.name);
    if (imported.brand) setBrand(imported.brand);
    if (imported.ingredientsText) setIngredientsText(imported.ingredientsText);
    if (imported.nutrition) {
      setNutrition((current) => ({
        ...current,
        energy_kj: formatNumber(imported.nutrition?.energy_kj) || current.energy_kj,
        energy_kcal: formatNumber(imported.nutrition?.energy_kcal) || current.energy_kcal,
        fat_saturated_g: formatNumber(imported.nutrition?.fat_saturated_g) || current.fat_saturated_g,
        sugars_total_g: formatNumber(imported.nutrition?.sugars_total_g) || current.sugars_total_g,
        fibre_g: formatNumber(imported.nutrition?.fibre_g) || current.fibre_g,
        protein_g: formatNumber(imported.nutrition?.protein_g) || current.protein_g,
        sodium_mg: formatNumber(imported.nutrition?.sodium_mg) || current.sodium_mg,
        salt_g: formatNumber(imported.nutrition?.salt_g) || current.salt_g,
        fruit_veg_nuts_percent:
          formatNumber(imported.nutrition?.fruit_veg_nuts_percent) || current.fruit_veg_nuts_percent,
      }));
      if (imported.nutrition.sodium_mg != null) setNutrition((current) => ({ ...current, salt_g: '' }));
    }
  };

  const handleCaptureConfirmed = (payload: ReviewPayload) => {
    if (payload.productName) setName(payload.productName);
    if (payload.ingredientsText) setIngredientsText(payload.ingredientsText);
    if (payload.servingSize) setServingSize(payload.servingSize);
    setNutritionBasis(payload.nutritionBasis);
    setNutrition((current) => {
      const next = { ...current };
      const keys: Array<keyof NutritionForm> = [
        'energy_kj',
        'energy_kcal',
        'fat_saturated_g',
        'sugars_total_g',
        'fibre_g',
        'protein_g',
        'sodium_mg',
        'salt_g',
        'fruit_veg_nuts_percent',
      ];
      for (const key of keys) {
        const value = payload.nutrition[key];
        if (value !== null && value !== undefined) next[key] = String(value);
      }
      return next;
    });
    setError('');
  };

  const fillExample = () => {
    setName('فروماچ فواكه');
    setBrand('مثال توضيحي');
    setProductType('food');
    setCategory('ألبان');
    setPackageSize('50 غ');
    setServingSize('50 غ');
    setNutritionBasis('100g');
    setIngredientsText('حليب، فواكه، سكر، بكتيريا حية');
    setNutrition({
      energy_kj: '459',
      energy_kcal: '',
      fat_saturated_g: '1.8',
      sugars_total_g: '13.4',
      fibre_g: '0.6',
      protein_g: '6.5',
      sodium_mg: '0.1',
      salt_g: '',
      fruit_veg_nuts_percent: '8',
    });
    setFibreType('AOAC');
    setError('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('أدخل اسم المنتج على الأقل، حتى يمكن حفظ التقرير وربطه بالمنتج الصحيح.');
      return;
    }
    const product: FoodProductInput = {
      name: name.trim(),
      brand: brand.trim(),
      productType,
      category: category.trim(),
      packageSize: packageSize.trim(),
      servingSize: servingSize.trim(),
      ingredientsText: ingredientsText.trim(),
      nutritionBasis,
      density_g_per_ml: toNumberOrNull(density),
      nutrition: {
        energy_kj: toNumberOrNull(nutrition.energy_kj),
        energy_kcal: toNumberOrNull(nutrition.energy_kcal),
        fat_saturated_g: toNumberOrNull(nutrition.fat_saturated_g),
        sugars_total_g: toNumberOrNull(nutrition.sugars_total_g),
        fibre_g: toNumberOrNull(nutrition.fibre_g),
        fibre_type: fibreType || null,
        protein_g: toNumberOrNull(nutrition.protein_g),
        sodium_mg: toNumberOrNull(nutrition.sodium_mg),
        salt_g: toNumberOrNull(nutrition.salt_g),
        fruit_veg_nuts_percent: toNumberOrNull(nutrition.fruit_veg_nuts_percent),
      },
    };
    const result = evaluateFood(product, foodAdditives, meta.version);
    setResult(result);
    navigate('/report');
  };

  return (
    <div className="page">
      <header className="page-intro">
        <div className="page-intro-icon">
          <LeafIcon size={28} />
        </div>
        <div>
          <span className="mono-label">FOOD / FSA NPM</span>
          <h1>تحليل غذائي</h1>
          <p>
            أدخل القيم لكل 100 غرام أو 100 ملليلتر كما تظهر على الملصق. نحسب نموذج FSA NPM فقط
            عند اكتمال الحقول المطلوبة، ثم نطابق الإضافات مع قاعدة المعرفة.
          </p>
        </div>
      </header>

      <section className="capture-block" aria-labelledby="food-capture-title">
        <div className="capture-block-head">
          <span className="mono-label">PATH 1 / CAMERA + OCR</span>
          <h2 id="food-capture-title">صوّر الملصق بدل الكتابة</h2>
          <p>
            مسار مستقل عن الإدخال اليدوي والباركود. نقرأ الصورة داخل المتصفح، ثم تعرض عليك شاشة
            مراجعة إلزامية قبل أن تنتقل أي قيمة إلى النموذج.
          </p>
        </div>
        <ProductCapture kind="food" onConfirm={handleCaptureConfirmed} />
      </section>

      <div className="form-layout">
        <form className="analysis-form" onSubmit={handleSubmit} noValidate>
          <section className="form-section">
            <div className="form-section-head">
              <span className="form-section-number">01</span>
              <div>
                <h2>بيانات المنتج</h2>
                <p>ما الذي تحلله؟ هذه البيانات تظهر في التقرير فقط ولا تؤثر على النقاط.</p>
              </div>
            </div>
            <div className="field-grid two">
              <TextField
                id="food-name"
                label="اسم المنتج"
                value={name}
                onChange={setName}
                placeholder="مثال: بسكويت الشوفان"
                required
              />
              <TextField
                id="food-brand"
                label="العلامة التجارية"
                value={brand}
                onChange={setBrand}
                placeholder="مثال: علامة محلية"
              />
              <SelectField
                id="food-type"
                label="نوع المنتج"
                value={productType}
                onChange={(value) => setProductType(value as 'food' | 'drink')}
                options={[
                  { value: 'food', label: 'غذاء صلب' },
                  { value: 'drink', label: 'مشروب' },
                ]}
                hint="عتبة «أقل صحة» للمشروبات 1 نقطة، وللأغذية 4 نقاط."
              />
              <TextField
                id="food-category"
                label="الفئة"
                value={category}
                onChange={setCategory}
                placeholder="مثال: ألبان، مخبوزات، مشروبات"
              />
              <TextField
                id="food-package"
                label="حجم العبوة"
                value={packageSize}
                onChange={setPackageSize}
                placeholder="مثال: 250 غ"
              />
              <TextField
                id="food-serving"
                label="حجم الحصة"
                value={servingSize}
                onChange={setServingSize}
                placeholder="مثال: 30 غ"
              />
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <span className="form-section-number">02</span>
              <div>
                <h2>القيم الغذائية</h2>
                <p>كل القيم لكل 100 غرام أو 100 ملليلتر، لا لكل حصة. يمكنك إدخال الطاقة بالكيلوجول أو الكيلوكالوري.</p>
              </div>
            </div>

            <div className="basis-row">
              <span className="basis-label">أساس القيم:</span>
              <div className="segmented" role="group" aria-label="أساس القيم الغذائية">
                <button
                  type="button"
                  className={nutritionBasis === '100g' ? 'is-selected' : ''}
                  aria-pressed={nutritionBasis === '100g'}
                  onClick={() => setNutritionBasis('100g')}
                >
                  لكل 100 غ
                </button>
                <button
                  type="button"
                  className={nutritionBasis === '100ml' ? 'is-selected' : ''}
                  aria-pressed={nutritionBasis === '100ml'}
                  onClick={() => setNutritionBasis('100ml')}
                >
                  لكل 100 مل
                </button>
              </div>
            </div>

            <div className="field-grid three">
              <NumberField
                id="energy-kj"
                label="الطاقة"
                unit="كج"
                value={nutrition.energy_kj}
                onChange={setNutrient('energy_kj')}
                placeholder="0"
                hint="كيلوجول لكل 100"
              />
              <NumberField
                id="energy-kcal"
                label="الطاقة (بديل)"
                unit="ككال"
                value={nutrition.energy_kcal}
                onChange={setNutrient('energy_kcal')}
                placeholder="0"
                hint="تُحوَّل تلقائيًا × 4.184"
              />
              <NumberField
                id="sat-fat"
                label="الدهون المشبعة"
                unit="غ"
                value={nutrition.fat_saturated_g}
                onChange={setNutrient('fat_saturated_g')}
                placeholder="0"
              />
              <NumberField
                id="sugars"
                label="السكريات الكلية"
                unit="غ"
                value={nutrition.sugars_total_g}
                onChange={setNutrient('sugars_total_g')}
                placeholder="0"
              />
              <NumberField
                id="sodium"
                label="الصوديوم"
                unit="مغ"
                value={nutrition.sodium_mg}
                onChange={setNutrient('sodium_mg')}
                placeholder="0"
                hint="أو استخدم الملح في الحقل المجاور"
              />
              <NumberField
                id="salt"
                label="الملح (بديل)"
                unit="غ"
                value={nutrition.salt_g}
                onChange={setNutrient('salt_g')}
                placeholder="0"
                hint="صوديوم = ملح ÷ 2.5 × 1000"
              />
              <NumberField
                id="fibre"
                label="الألياف"
                unit="غ"
                value={nutrition.fibre_g}
                onChange={setNutrient('fibre_g')}
                placeholder="0"
              />
              <SelectField
                id="fibre-type"
                label="طريقة قياس الألياف"
                value={fibreType}
                onChange={(value) => setFibreType(value as '' | 'NSP' | 'AOAC')}
                options={[
                  { value: '', label: 'غير محدد (NSP افتراضيًا)' },
                  { value: 'NSP', label: 'NSP — ألياف غير نشوية' },
                  { value: 'AOAC', label: 'AOAC' },
                ]}
                hint="الطريقة تغيّر عتبات نقاط الألياف."
              />
              <NumberField
                id="protein"
                label="البروتين"
                unit="غ"
                value={nutrition.protein_g}
                onChange={setNutrient('protein_g')}
                placeholder="0"
              />
              <NumberField
                id="fvn"
                label="الفواكه والخضروات والمكسرات"
                unit="%"
                value={nutrition.fruit_veg_nuts_percent}
                onChange={setNutrient('fruit_veg_nuts_percent')}
                placeholder="0"
                hint="النسبة الوزنية في المنتج كما هي"
              />
              <NumberField
                id="density"
                label="الكثافة (اختياري)"
                unit="غ/مل"
                value={density}
                onChange={setDensity}
                placeholder="مثال: 1.04"
                hint="للمشروبات المقاسة بالملليلتر فقط"
              />
            </div>

            <Callout tone="info" title="لماذا لا نملأ القيم الناقصة؟">
              نموذج FSA NPM لا يسمح بتقدير الحقول الناقصة. أي قيمة مفترضة ستنتج نتيجة غير قابلة
              للتحقق، لذلك يوقف المحرك الحساب ويعلن النقص بدل التخمين.
            </Callout>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <span className="form-section-number">03</span>
              <div>
                <h2>قائمة المكونات</h2>
                <p>انسخ القائمة كما هي، بما فيها أرقام E والأسماء بين الأقواس. لا تُستنتج الكميات من الترتيب.</p>
              </div>
            </div>
            <TextAreaField
              id="food-ingredients"
              label="المكونات"
              value={ingredientsText}
              onChange={setIngredientsText}
              placeholder="مثال: ماء، سكر، دقيق قمح، زيت نخيل، ملون (E102)، حافظة (E211)…"
              hint="يفصل المحرك بين المكونات بفواصل الأسطر والفواصل العادية."
              rows={6}
            />
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <span className="form-section-number">04</span>
              <div>
                <h2>استيراد اختياري</h2>
                <p>يمكنك تعبئة الحقول من قاعدة عامة، ثم مراجعتها وتعديلها قبل التقييم.</p>
              </div>
            </div>
            <BarcodeImporter kind="food" onImported={handleImported} />
          </section>

          {error && (
            <Callout tone="attention" title="تحقق من المدخلات">
              {error}
            </Callout>
          )}

          <div className="form-actions">
            <button type="submit" className="button button-primary">
              احسب التقرير
              <ArrowIcon size={18} />
            </button>
            <button type="button" className="button button-ghost" onClick={fillExample}>
              تعبئة مثال توضيحي
            </button>
          </div>
        </form>

        <aside className="form-aside">
          <div className="aside-card">
            <span className="mono-label">REQUIRED INPUTS</span>
            <h3>ما يحتاجه المحرك</h3>
            <ul className="check-list">
              <li>الطاقة (كج أو ككال)</li>
              <li>الدهون المشبعة</li>
              <li>السكريات الكلية</li>
              <li>الصوديوم أو الملح</li>
              <li>نسبة الفواكه والخضروات والمكسرات</li>
              <li>الألياف ونوع طريقتها</li>
              <li>البروتين</li>
            </ul>
            <p className="aside-note">
              إذا غاب أي حقل، لن تُصدر المنصة نتيجة NPM. ستظهر لك قائمة الناقص بدل رقم مضلل.
            </p>
          </div>

          <div className="aside-card aside-card-quiet">
            <h3>ماذا تعني النتيجة؟</h3>
            <p>
              نتيجة FSA NPM تصنّف المنتج في سياق الإعلان الموجّه للأطفال في المملكة المتحدة. هي
              ليست درجة صحية، ولا تأخذ حجم الحصة أو باقي النظام الغذائي في الحسبان.
            </p>
            <p>
              الإضافات تُعرض منفصلة. وجود مادة في القائمة لا يعني تجاوز المدخول اليومي المقبول،
              لأن ذلك يتطلب معرفة الكمية المستهلكة ووزن الجسم.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
