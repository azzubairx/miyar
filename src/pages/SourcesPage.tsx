import { useMemo, useState } from 'react';
import { BookIcon, SearchIcon } from '../components/Icons';
import { Badge, ExternalLink, SectionHeading } from '../components/ui';
import { references } from '../database';
import { normalizeText } from '../lib/normalize';
import type { Reference } from '../types';

const TYPE_LABELS: Record<string, string> = {
  official_regulation: 'تنظيم رسمي',
  official_scientific_opinion: 'رأي علمي رسمي',
  scientific_assessment: 'تقييم علمي',
  secondary_reference: 'مرجع ثانوي',
  unverified: 'غير متحقق',
};

const TYPE_TONE: Record<string, 'green' | 'amber' | 'ink' | 'neutral'> = {
  official_regulation: 'green',
  official_scientific_opinion: 'green',
  scientific_assessment: 'amber',
  secondary_reference: 'ink',
  unverified: 'neutral',
};

export default function SourcesPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');

  const types = useMemo(() => [...new Set(references.map((reference) => reference.type))], []);

  const filtered = useMemo(() => {
    const normalized = normalizeText(query);
    return references.filter((reference) => {
      if (type !== 'all' && reference.type !== type) return false;
      if (!normalized) return true;
      return normalizeText(
        [
          reference.authority,
          reference.title_ar,
          reference.title_en,
          reference.document_number,
          reference.note_ar ?? '',
        ].join(' '),
      ).includes(normalized);
    });
  }, [query, type]);

  const grouped = useMemo(() => {
    const map = new Map<string, Reference[]>();
    for (const reference of filtered) {
      const list = map.get(reference.authority) ?? [];
      list.push(reference);
      map.set(reference.authority, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ar'));
  }, [filtered]);

  return (
    <div className="page">
      <header className="page-intro">
        <div className="page-intro-icon">
          <BookIcon size={28} />
        </div>
        <div>
          <span className="mono-label">SOURCES / {references.length}</span>
          <h1>المصادر</h1>
          <p>
            سجل المراجع التي بُنيت عليها قاعدة المعرفة. كل مرجع يحمل رقم وثيقة ورابطًا وتاريخ
            اطلاع. لا ندرج رابطًا لا يمكن فتحه، ولا ننسب رقمًا لا نتحقق منه.
          </p>
        </div>
      </header>

      <div className="source-toolbar">
        <div className="kb-search">
          <SearchIcon size={18} />
          <label className="sr-only" htmlFor="source-query">
            البحث في المصادر
          </label>
          <input
            id="source-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالجهة أو العنوان أو رقم الوثيقة…"
          />
        </div>
        <div className="kb-filter">
          <label htmlFor="source-type">نوع المصدر</label>
          <select id="source-type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">كل الأنواع</option>
            {types.map((item) => (
              <option key={item} value={item}>
                {TYPE_LABELS[item] ?? item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="source-count">{filtered.length} مرجعًا</div>

      <div className="source-groups">
        {grouped.map(([authority, list]) => (
          <section className="source-group" key={authority}>
            <h2>{authority}</h2>
            <div className="source-list">
              {list.map((reference) => (
                <article className="source-card" key={reference.id}>
                  <div className="source-card-head">
                    <Badge tone={TYPE_TONE[reference.type] ?? 'neutral'}>
                      {TYPE_LABELS[reference.type] ?? reference.type}
                    </Badge>
                    <span className="source-id">{reference.id}</span>
                  </div>
                  <h3>{reference.title_ar}</h3>
                  <p className="source-en" dir="ltr">
                    {reference.title_en}
                  </p>
                  <dl className="source-meta">
                    <div>
                      <dt>رقم الوثيقة</dt>
                      <dd>{reference.document_number}</dd>
                    </div>
                    <div>
                      <dt>النشر</dt>
                      <dd>{reference.published ?? 'غير محدد'}</dd>
                    </div>
                    <div>
                      <dt>تاريخ الاطلاع</dt>
                      <dd>{reference.accessed}</dd>
                    </div>
                  </dl>
                  {reference.note_ar && <p className="source-note">{reference.note_ar}</p>}
                  <ExternalLink href={reference.url}>فتح الوثيقة الرسمية</ExternalLink>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <SectionHeading
        eyebrow="HIERARCHY"
        title="كيف نرتب المصادر؟"
        lead="ليست كل المصادر متساوية. الترتيب يحدد ما يمكن بناء حكم عليه."
      />
      <div className="source-hierarchy">
        <div>
          <span>01</span>
          <h3>التنظيم النافذ</h3>
          <p>لوائح الاتحاد الأوروبي وملاحقها وقرارات الحظر والتقييد. يُعرض كحالة تنظيمية.</p>
        </div>
        <div>
          <span>02</span>
          <h3>الرأي العلمي الرسمي</h3>
          <p>EFSA وSCCS بوثائق مرقمة وتواريخ اعتماد. يُعرض كتقييم علمي وحدود مرجعية.</p>
        </div>
        <div>
          <span>03</span>
          <h3>التقييم العلمي المستقل</h3>
          <p>CIR وغيره من المراجعات. يُستخدم للسياق، ولا يُحوَّل تلقائيًا إلى حكم سلامة.</p>
        </div>
        <div>
          <span>04</span>
          <h3>قواعد البيانات الثانوية</h3>
          <p>CosIng للوظائف والأسماء. الإدراج فيها لا يثبت سلامة كل استخدام.</p>
        </div>
      </div>
    </div>
  );
}
