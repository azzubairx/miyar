import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { meta } from '../database';
import { ArrowIcon, FlaskIcon, LeafIcon, ScaleIcon, ShieldIcon } from '../components/Icons';
import { Badge, Callout, SectionHeading } from '../components/ui';

const PRINCIPLES = [
  {
    icon: ScaleIcon,
    title: 'الخطر ليس قابلية للخطر',
    text: 'وجود مادة خطرة لا يعني أن التعرض لها يسبب ضررًا. نفصل بين تصنيف المادة، وحدود التعرض، وظروف الاستخدام.',
  },
  {
    icon: ShieldIcon,
    title: 'المسموح ليس بالضرورة آمنًا للجميع',
    text: 'الامتثال التنظيمي يحدد ما يُسمح به قانونًا، لا ما يصلح لكل شخص. الحساسية والتهيج والتفاعلات الفردية تبقى قائمة.',
  },
  {
    icon: FlaskIcon,
    title: 'لا نستنتج التركيز من الترتيب',
    text: 'ترتيب المكونات في قائمة INCI لا يمنحنا نسبة رقمية. عند غياب التركيز نقول ذلك صراحة بدل اختلاق حكم.',
  },
];

export default function HomePage() {
  const { history } = useApp();

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            منصة تقييم مستقلة · قاعدة المعرفة {meta.version}
          </div>
          <h1>
            قرارٌ أوضح،
            <br />
            لا حكمٌ مطلق.
          </h1>
          <p className="hero-lead">
            مِعيار منصة عربية تقرأ ملصق الطعام ومستحضرات التجميل عبر مراجع تنظيمية وعلمية موثقة.
            لا نبيعك درجة واحدة، ولا نُخفي ما لا نعرفه.
          </p>
          <div className="hero-actions">
            <Link to="/food" className="button button-primary">
              ابدأ تحليلًا غذائيًا
              <ArrowIcon size={18} />
            </Link>
            <Link to="/cosmetics" className="button button-ghost">
              حلّل مستحضر تجميل
              <ArrowIcon size={18} />
            </Link>
          </div>
          <p className="hero-footnote">
            يعمل التقييم محليًا بعد تحميل الصفحة · لا حساب مطلوب · لا تُرسل بياناتك إلى خادم.
          </p>
        </div>

        <aside className="hero-card" aria-label="ملخص المنهجية">
          <div className="hero-card-top">
            <span className="mono-label">MIYAR / METHOD</span>
            <Badge tone="green">إصدار 1.0</Badge>
          </div>
          <div className="method-list">
            <div className="method-row">
              <span className="method-index">01</span>
              <div>
                <strong>مصدر لكل حد</strong>
                <p>كل قيمة أو قيد مرتبط بمرجع يمكن فتحه ومراجعته.</p>
              </div>
            </div>
            <div className="method-row">
              <span className="method-index">02</span>
              <div>
                <strong>محركان منفصلان</strong>
                <p>الغذاء لا يُقاس بمنطق التجميل، والتجميل لا يُختزل في درجة.</p>
              </div>
            </div>
            <div className="method-row">
              <span className="method-index">03</span>
              <div>
                <strong>الجهل يُعلن</strong>
                <p>حين لا تتوفر معلومات كافية، نقول ذلك بدل افتراض السلامة.</p>
              </div>
            </div>
          </div>
          <div className="hero-card-bottom">
            <span>قاعدة المعرفة</span>
            <strong>
              {meta.food_additives_count + meta.cosmetic_ingredients_count} مادة موثقة
            </strong>
            <span>{meta.references_count} مرجعًا</span>
          </div>
        </aside>
      </section>

      <section className="module-section">
        <SectionHeading
          number="01"
          eyebrow="المسارَان"
          title="اختر ما تريد قراءته بعناية"
          lead="لكل مسار مدخلاته ومحركه ومعاييره. لا نخلط بين الغذاء والتجميل، ولا بين الخطر والامتثال."
        />
        <div className="module-grid">
          <article className="module-card module-food">
            <div className="module-card-head">
              <span className="module-icon">
                <LeafIcon size={26} />
              </span>
              <span className="module-number">01 / FOOD</span>
            </div>
            <h3>تقييم غذائي</h3>
            <p>
              يحسب نموذج FSA NPM الرسمي (2004/2005) عند اكتمال بيانات الملصق، ويطابق الإضافات
              الغذائية مع قاعدة معرفة مستقلة.
            </p>
            <ul className="tick-list">
              <li>نموذج تصنيف إعلاني بريطاني، لا درجة صحية</li>
              <li>21 إضافًا غذائيًا مع مراجع EFSA</li>
              <li>لا حساب للتعرض الفعلي دون كمية الاستهلاك</li>
            </ul>
            <Link to="/food" className="text-link">
              إلى تحليل الغذاء <ArrowIcon size={16} />
            </Link>
          </article>

          <article className="module-card module-cosmetics">
            <div className="module-card-head">
              <span className="module-icon">
                <FlaskIcon size={26} />
              </span>
              <span className="module-number">02 / COSMETICS</span>
            </div>
            <h3>تقييم تجميلي</h3>
            <p>
              يقرأ قائمة INCI ويقارن كل مكوّن بالملاحق II وIII وV وVI من اللائحة الأوروبية
              1223/2009، مع آراء SCCS حيث تتوفر.
            </p>
            <ul className="tick-list">
              <li>محاور منفصلة: حظر، تقييد، وسم، جهل</li>
              <li>50 مكوّنًا ذا أولوية، لا قائمة كاملة</li>
              <li>لا درجة مركبة ولا ترتيب «أفضل منتج»</li>
            </ul>
            <Link to="/cosmetics" className="text-link">
              إلى تحليل التجميل <ArrowIcon size={16} />
            </Link>
          </article>
        </div>
      </section>

      <section className="principles-section">
        <SectionHeading
          number="02"
          eyebrow="القواعد"
          title="ثلاث قواعد تحكم كل نتيجة"
          lead="ليست شعارات تسويقية؛ هي قيود على ما يسمح المحرك لنفسه بقوله."
        />
        <div className="principle-grid">
          {PRINCIPLES.map((principle, index) => {
            const Icon = principle.icon;
            return (
              <article className="principle-card" key={principle.title}>
                <div className="principle-top">
                  <Icon size={24} />
                  <span>0{index + 1}</span>
                </div>
                <h3>{principle.title}</h3>
                <p>{principle.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="numbers-section">
        <div className="numbers-copy">
          <SectionHeading
            number="03"
            eyebrow="الشفافية بالأرقام"
            title="نطاق محدود، لكنه معلن"
            lead="نفضّل قاعدة صغيرة موثقة على قاعدة ضخمة لا يمكن التحقق منها. كل رقم هنا قابل للفحص."
          />
          <Link to="/knowledge" className="button button-ghost">
            تصفّح قاعدة المعرفة
            <ArrowIcon size={18} />
          </Link>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <strong>{meta.food_additives_count}</strong>
            <span>إضافًا غذائيًا موثقًا</span>
          </div>
          <div className="stat-card">
            <strong>{meta.cosmetic_ingredients_count}</strong>
            <span>مكوّنًا تجميليًا ذا أولوية</span>
          </div>
          <div className="stat-card">
            <strong>{meta.references_count}</strong>
            <span>مرجعًا تنظيميًا وعلميًا</span>
          </div>
          <div className="stat-card">
            <strong>2</strong>
            <span>محركان منفصلان تمامًا</span>
          </div>
        </div>
      </section>

      {history.length > 0 && (
        <section className="history-section">
          <SectionHeading
            number="04"
            eyebrow="على هذا الجهاز"
            title="آخر ما حللته"
            lead="يُحفظ السجل محليًا في متصفحك فقط، ويمكنك مسحه في أي وقت من صفحة التقرير."
          />
          <div className="history-list">
            {history.slice(0, 4).map((item) => (
              <div className="history-row" key={item.id}>
                <Badge tone={item.kind === 'food' ? 'green' : 'amber'}>
                  {item.kind === 'food' ? 'غذاء' : 'تجميل'}
                </Badge>
                <div className="history-name">
                  <strong>{item.product_name}</strong>
                  <span>{item.brand || 'بلا علامة تجارية'}</span>
                </div>
                <span className="history-summary">{item.summary_ar}</span>
                <time dateTime={item.created_at}>
                  {new Date(item.created_at).toLocaleDateString('ar', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </div>
            ))}
          </div>
          <Link to="/report" className="text-link">
            فتح آخر تقرير <ArrowIcon size={16} />
          </Link>
        </section>
      )}

      <section className="closing-band">
        <div>
          <span className="mono-label">READ THE LABEL, NOT THE HYPE</span>
          <h2>هل لديك منتج أمامك الآن؟</h2>
          <p>خذ دقيقة، اقرأ الملصق، ودع المحرك يرتب لك ما هو موثق وما هو مجهول.</p>
        </div>
        <div className="closing-actions">
          <Link to="/food" className="button button-light">
            تحليل غذائي
          </Link>
          <Link to="/cosmetics" className="button button-outline-light">
            تحليل تجميلي
          </Link>
        </div>
      </section>

      <Callout tone="info" title="ما لا تفعله مِعيار">
        لا تمنح المنتجات درجة 100/100، ولا تقارن المنتجات ببعضها، ولا تعتبر المكوّن غير المدرج
        آمنًا، ولا تستنتج التركيز من ترتيب المكونات. هذه ليست تفاصيل صغيرة؛ إنها الفرق بين تقييم
        وعلم زائف.
      </Callout>
    </div>
  );
}
