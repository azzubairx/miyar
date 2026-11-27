import { Link } from 'react-router-dom';
import { BookIcon } from '../components/Icons';
import { Badge, SectionHeading } from '../components/ui';
import { cosmeticIngredients, foodAdditives, meta, references } from '../database';

export default function ChangelogPage() {
  return (
    <div className="page prose-page">
      <header className="page-intro">
        <div className="page-intro-icon">
          <BookIcon size={28} />
        </div>
        <div>
          <span className="mono-label">CHANGELOG / {meta.version}</span>
          <h1>سجل التغييرات</h1>
          <p>
            ماذا تغير في قاعدة المعرفة والمحركات، ومتى. كل إصدار يحمل نطاقه وحدوده، حتى تعرف ما
            الذي تستطيع الاعتماد عليه.
          </p>
        </div>
      </header>

      <div className="changelog-head">
        <div>
          <Badge tone="green">الإصدار الحالي {meta.version}</Badge>
          <span>آخر تحديث: {meta.updated}</span>
        </div>
        <div className="changelog-stats">
          <span>{foodAdditives.length} إضافة</span>
          <span>{cosmeticIngredients.length} مكوّنًا</span>
          <span>{references.length} مرجعًا</span>
        </div>
      </div>

      <section className="timeline">
        {meta.changelog_ar.map((item, index) => (
          <article className="timeline-item" key={item}>
            <div className="timeline-marker">{String(index + 1).padStart(2, '0')}</div>
            <div className="timeline-body">
              <h2>{index === 0 ? `الإصدار ${meta.version}` : 'تحديث'}</h2>
              <p>{item.replace(/^[\d.]+\s*—\s*/, '')}</p>
            </div>
          </article>
        ))}
      </section>

      <SectionHeading
        eyebrow="POLICY"
        title="كيف نُصدر التغييرات؟"
        lead="التغيير ليس مجرد تعديل ملف؛ إنه التزام بتحديث المراجع والتواريخ والاختبارات."
      />
      <div className="policy-grid">
        <div>
          <h3>تغيير جوهري</h3>
          <p>
            إضافة مادة، تعديل حد، تغيير حالة تنظيمية، أو تعديل منطق محرك. يستلزم مراجعة المصدر،
            تحديث بطاقة المادة، تشغيل التحقق والاختبارات، ورفع رقم الإصدار.
          </p>
        </div>
        <div>
          <h3>تغيير تحريري</h3>
          <p>
            تصحيح صياغة عربية أو توضيح ملاحظة دون تغيير القيمة أو الحكم. يُوثَّق في سجل التغييرات
            إذا كان يمس المعنى.
          </p>
        </div>
        <div>
          <h3>مراجعة دورية</h3>
          <p>
            تُراجع المراجع التنظيمية عند صدور تعديل على الملاحق أو آراء SCCS/EFSA. تاريخ آخر مراجعة
            مذكور في كل بطاقة، وليس تاريخًا واحدًا للمنصة.
          </p>
        </div>
      </div>

      <div className="prose-cta">
        <div>
          <h2>تريد التحقق من تغيير بعينه؟</h2>
          <p>كل بطاقة مادة تعرض مراجعها وتاريخ مراجعتها. ابدأ من هناك.</p>
        </div>
        <div className="prose-cta-actions">
          <Link to="/knowledge" className="button button-primary">
            قاعدة المعرفة
          </Link>
          <Link to="/sources" className="button button-ghost">
            المصادر
          </Link>
        </div>
      </div>
    </div>
  );
}
