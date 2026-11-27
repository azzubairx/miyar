import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookIcon, ExternalIcon, SearchIcon } from '../components/Icons';
import { Badge, EmptyState, ExternalLink, SectionHeading } from '../components/ui';
import { cosmeticIngredients, foodAdditives, getReferences, meta } from '../database';
import { normalizeText } from '../lib/normalize';
import type { CosmeticIngredient, FoodAdditive, KnowledgeEntry, Limit } from '../types';

type Tab = 'all' | 'food' | 'cosmetics';

const CONFIDENCE_LABELS: Record<string, string> = {
  official_regulation: 'تنظيم رسمي',
  official_scientific_opinion: 'رأي علمي رسمي',
  scientific_assessment: 'تقييم علمي',
  secondary_reference: 'مرجع ثانوي',
  unverified: 'غير متحقق',
};

const STATUS_LABELS: Record<string, string> = {
  authorised: 'مسموح',
  prohibited: 'محظور',
  restricted: 'مقيد',
  permitted_preservative: 'مادة حافظة مسموحة',
  permitted_uv_filter: 'مرشح UV مسموح',
  labelling_required: 'وسم إلزامي',
  conditional: 'مشروط',
  not_listed: 'غير مدرج',
};

const LIMIT_LABELS: Record<string, string> = {
  adi: 'مدخول يومي مقبول',
  max_concentration: 'حد أقصى للتركيز',
  labelling_threshold: 'حد وسم',
};

function statusTone(status: string): 'clay' | 'amber' | 'green' | 'ink' | 'neutral' {
  if (status === 'prohibited') return 'clay';
  if (status === 'restricted' || status === 'conditional') return 'amber';
  if (status === 'labelling_required') return 'ink';
  if (status === 'authorised' || status.startsWith('permitted')) return 'green';
  return 'neutral';
}

function LimitView({ limit }: { limit: Limit }) {
  return (
    <div className="kb-limit">
      <div className="kb-limit-head">
        <strong>{LIMIT_LABELS[limit.kind] ?? limit.kind}</strong>
        <span>
          {limit.value === null ? 'غير محدد رقميًا' : `${limit.value} ${limit.unit}`}
        </span>
      </div>
      {limit.basis_ar && <p>{limit.basis_ar}</p>}
      {limit.conditions_ar && <p>{limit.conditions_ar}</p>}
      {limit.product_types && limit.product_types.length > 0 && (
        <p className="kb-muted">الفئات: {limit.product_types.join('، ')}</p>
      )}
      <div className="kb-refs">
        {getReferences(limit.reference_ids).map((reference) => (
          <ExternalLink key={reference.id} href={reference.url}>
            {reference.document_number}
          </ExternalLink>
        ))}
      </div>
    </div>
  );
}

function EntryCard({ entry }: { entry: KnowledgeEntry }) {
  const isFood = entry.kind === 'food_additive';
  const food = isFood ? (entry as FoodAdditive) : null;
  const cosmetic = !isFood ? (entry as CosmeticIngredient) : null;
  const primaryStatus = entry.regulatory_status[0];

  return (
    <details className="kb-card">
      <summary>
        <div className="kb-card-main">
          <div className="kb-card-title">
            {food && <span className="kb-code">{food.e_number}</span>}
            {cosmetic && <span className="kb-code">{cosmetic.inci_name}</span>}
            <h3>{entry.name_ar}</h3>
            <span className="kb-en" dir="ltr">
              {entry.name_en}
            </span>
          </div>
          <div className="kb-card-meta">
            <Badge tone={statusTone(primaryStatus?.status ?? '')}>
              {STATUS_LABELS[primaryStatus?.status ?? ''] ?? primaryStatus?.status ?? 'غير محدد'}
            </Badge>
            <span className="kb-category">{entry.category_ar}</span>
            <span className="kb-confidence">{CONFIDENCE_LABELS[entry.confidence] ?? entry.confidence}</span>
          </div>
        </div>
        <span className="kb-toggle" aria-hidden="true">
          +
        </span>
      </summary>

      <div className="kb-body">
        <div className="kb-facts">
          <div>
            <span>الوظيفة</span>
            <strong>{entry.functions_ar.join('، ')}</strong>
          </div>
          {food && (
            <div>
              <span>رقم E</span>
              <strong>{food.e_number}</strong>
            </div>
          )}
          {cosmetic && (
            <>
              <div>
                <span>CAS</span>
                <strong dir="ltr">{cosmetic.cas_number ?? 'غير متوفر'}</strong>
              </div>
              <div>
                <span>EC</span>
                <strong dir="ltr">{cosmetic.ec_number ?? 'غير متوفر'}</strong>
              </div>
            </>
          )}
          <div>
            <span>آخر مراجعة</span>
            <strong>{entry.last_reviewed}</strong>
          </div>
        </div>

        <div className="kb-block">
          <h4>الحالة التنظيمية</h4>
          {entry.regulatory_status.map((status, index) => (
            <div className="kb-status" key={`${status.framework}-${status.annex ?? ''}-${status.entry ?? index}`}>
              <div className="kb-status-head">
                <Badge tone={statusTone(status.status)}>{STATUS_LABELS[status.status] ?? status.status}</Badge>
                <span>
                  {status.framework} · {status.instrument}
                  {status.annex ? ` · الملحق ${status.annex}` : ''}
                  {status.entry ? ` · البند ${status.entry}` : ''}
                </span>
              </div>
              <p>{status.conditions_ar}</p>
              <div className="kb-refs">
                {getReferences(status.reference_ids).map((reference) => (
                  <ExternalLink key={reference.id} href={reference.url}>
                    {reference.document_number}
                  </ExternalLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {entry.limits.length > 0 && (
          <div className="kb-block">
            <h4>الحدود والقيم المرجعية</h4>
            {entry.limits.map((limit, index) => (
              <LimitView limit={limit} key={`${limit.kind}-${index}`} />
            ))}
          </div>
        )}

        {entry.scientific_assessment.length > 0 && (
          <div className="kb-block">
            <h4>التقييم العلمي</h4>
            {entry.scientific_assessment.map((assessment) => (
              <div className="kb-assessment" key={assessment.opinion_number}>
                <div className="kb-assessment-head">
                  <strong>{assessment.opinion_number}</strong>
                  <span>اعتُمد في {assessment.adopted}</span>
                </div>
                <h5>{assessment.title_ar}</h5>
                <p>{assessment.summary_ar}</p>
                {assessment.conditions_ar && <p className="kb-muted">{assessment.conditions_ar}</p>}
                <div className="kb-refs">
                  {getReferences(assessment.reference_ids).map((reference) => (
                    <ExternalLink key={reference.id} href={reference.url}>
                      {reference.document_number}
                    </ExternalLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="kb-block">
          <h4>ملاحظات المنصة</h4>
          <p>{entry.notes_ar}</p>
          <p className="kb-muted">
            حالة التحقق: {entry.verification_status === 'verified' ? 'متحقق' : entry.verification_status === 'partial' ? 'جزئي' : 'قيد الانتظار'}
          </p>
        </div>
      </div>
    </details>
  );
}

export default function KnowledgeBasePage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<Tab>('all');
  const [category, setCategory] = useState('all');

  const allEntries = useMemo<KnowledgeEntry[]>(
    () => [...foodAdditives, ...cosmeticIngredients],
    [],
  );

  const categories = useMemo(() => {
    const relevant =
      tab === 'food' ? foodAdditives : tab === 'cosmetics' ? cosmeticIngredients : allEntries;
    return [...new Set(relevant.map((entry) => entry.category_ar))].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [tab, allEntries]);

  const results = useMemo(() => {
    const normalized = normalizeText(query);
    return allEntries.filter((entry) => {
      if (tab === 'food' && entry.kind !== 'food_additive') return false;
      if (tab === 'cosmetics' && entry.kind !== 'cosmetic_ingredient') return false;
      if (category !== 'all' && entry.category_ar !== category) return false;
      if (!normalized) return true;
      const haystack = normalizeText(
        [
          entry.name_ar,
          entry.name_en,
          entry.category_ar,
          entry.notes_ar,
          entry.functions_ar.join(' '),
          ...entry.synonyms_ar,
          ...entry.synonyms_en,
          ...(entry.kind === 'food_additive' ? [entry.e_number] : [entry.inci_name]),
        ].join(' '),
      );
      return haystack.includes(normalized);
    });
  }, [allEntries, tab, category, query]);

  return (
    <div className="page">
      <header className="page-intro">
        <div className="page-intro-icon">
          <BookIcon size={28} />
        </div>
        <div>
          <span className="mono-label">KNOWLEDGE BASE / {meta.version}</span>
          <h1>قاعدة المعرفة</h1>
          <p>
            بطاقات موثقة للمواد التي يعرفها المحرك. كل بطاقة تذكر الحالة التنظيمية والحدود والمراجع
            وملاحظات المنصة. ما ليس هنا لا نحكم عليه.
          </p>
        </div>
      </header>

      <div className="kb-toolbar">
        <div className="kb-search">
          <SearchIcon size={18} />
          <label className="sr-only" htmlFor="kb-query">
            البحث في قاعدة المعرفة
          </label>
          <input
            id="kb-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم، رقم E، INCI، أو الفئة…"
          />
        </div>
        <div className="segmented kb-tabs" role="group" aria-label="تصفية حسب النوع">
          <button type="button" className={tab === 'all' ? 'is-selected' : ''} onClick={() => setTab('all')}>
            الكل
          </button>
          <button type="button" className={tab === 'food' ? 'is-selected' : ''} onClick={() => setTab('food')}>
            الغذاء
          </button>
          <button
            type="button"
            className={tab === 'cosmetics' ? 'is-selected' : ''}
            onClick={() => setTab('cosmetics')}
          >
            التجميل
          </button>
        </div>
        <div className="kb-filter">
          <label htmlFor="kb-category">الفئة</label>
          <select id="kb-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">كل الفئات</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="kb-results-head">
        <span>{results.length} نتيجة</span>
        <span className="kb-muted">
          {meta.food_additives_count} إضافًا غذائيًا · {meta.cosmetic_ingredients_count} مكوّنًا تجميليًا
        </span>
      </div>

      {results.length === 0 ? (
        <EmptyState title="لا توجد نتائج مطابقة">
          <p>
            جرّب اسمًا آخر أو رقم E أو اسم INCI. إذا لم تجد المادة، فهي خارج تغطية قاعدة المعرفة،
            ولا تصدر المنصة حكمًا عليها.
          </p>
        </EmptyState>
      ) : (
        <div className="kb-list">
          {results.map((entry) => (
            <EntryCard entry={entry} key={entry.id} />
          ))}
        </div>
      )}

      <SectionHeading
        eyebrow="SCOPE"
        title="ما الذي تغطيه القاعدة؟"
        lead={meta.scope_ar}
      />
      <div className="kb-scope">
        <div>
          <h3>الغذاء</h3>
          <p>
            21 إضافًا غذائيًا يشمل الألوان الاصطناعية والمواد الحافظة ومضادات الأكسدة والمحليات
            والمثبتات ومعززات النكهة. الحدود المرجعية من EFSA حيث تتوفر، مع تمييز غياب القيمة
            الرقمية عن السلامة.
          </p>
        </div>
        <div>
          <h3>التجميل</h3>
          <p>
            50 مكوّنًا ذا أولوية يشمل مواد محظورة ومقيدة ومواد حافظة ومرشحات UV ومسببات حساسية
            عطرية. الحالة التنظيمية من ملاحق اللائحة 1223/2009، وآراء SCCS حيث تتوفر.
          </p>
        </div>
        <div>
          <h3>ما ليس هنا</h3>
          <p>
            ليست قائمة كاملة بكل مادة في الملاحق، ولا قاعدة تقييم للتركيبات الكاملة. غياب مادة لا
            يعني سلامتها، ووجودها لا يعني أن المنتج آمن.
          </p>
        </div>
      </div>
    </div>
  );
}
