import { Link } from 'react-router-dom';
import { BookIcon, FlaskIcon, LeafIcon, ShieldIcon } from '../components/Icons';
import { Callout, SectionHeading } from '../components/ui';
import { meta } from '../database';

export default function AboutPage() {
  return (
    <div className="page prose-page">
      <header className="page-intro">
        <div className="page-intro-icon">
          <ShieldIcon size={28} />
        </div>
        <div>
          <span className="mono-label">ABOUT / MIYAR</span>
          <h1>عن مِعيار</h1>
          <p>
            منصة عربية مستقلة تقرأ ملصق الطعام ومستحضرات التجميل عبر مراجع يمكن فتحها. لا تبيع
            ترتيبًا، ولا تختلق رقمًا، ولا تعتبر الجهل سلامة.
          </p>
        </div>
      </header>

      <section>
        <SectionHeading number="01" eyebrow="WHY" title="لماذا وُجدت المنصة؟" />
        <p>
          معظم أدوات تقييم المنتجات تعطي درجة واحدة تبدو موضوعية، ثم تخفي خلفها قرارات تحريرية
          وبيانات غير معلنة. في العربية، يزيد الأمر: ترجمات آلية، حدود بلا مصادر، وأحكام قاطعة على
          مواد لا يعرف المحرك تركيزها. مِعيار محاولة لبناء العكس: قاعدة صغيرة، مراجع مفتوحة، وحدود
          واضحة لما يمكن قوله.
        </p>
        <p>
          المنصة لا تدّعي أنها تغطي كل شيء. تغطي ما تستطيع توثيقه، وتعلن ما لا تعرفه. هذا الاختيار
          يجعلها أقل شمولًا من بعض الأدوات، لكنه يجعل كل جملة فيها قابلة للمساءلة.
        </p>
      </section>

      <section>
        <SectionHeading number="02" eyebrow="WHAT WE DO" title="ما تفعله المنصة" />
        <div className="about-grid">
          <div className="about-card">
            <LeafIcon size={24} />
            <h3>تحليل غذائي محدود</h3>
            <p>
              تحسب نموذج FSA NPM الرسمي عند اكتمال البيانات، وتطابق 21 إضافة غذائية مع مراجع EFSA
              واللائحة 1333/2008. لا تصدر درجة صحية.
            </p>
          </div>
          <div className="about-card">
            <FlaskIcon size={24} />
            <h3>تحليل تجميلي متعدد المحاور</h3>
            <p>
              تقارن 50 مكوّنًا بملاحق اللائحة 1223/2009، وتتحقق من الحدود عندما يتوفر التركيز
              ونوع المنتج. لا تجمع المحاور في درجة.
            </p>
          </div>
          <div className="about-card">
            <BookIcon size={24} />
            <h3>قاعدة معرفة عربية</h3>
            <p>
              بطاقات مكتوبة بالعربية، مع أسماء INCI وأرقام E وCAS وEC، ومراجع قابلة للفتح، وتاريخ
              مراجعة وحالة تحقق.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading number="03" eyebrow="WHAT WE DON'T DO" title="ما لا تفعله المنصة" />
        <ul className="prose-list">
          <li>لا تمنح المنتجات درجة 100/100 ولا تصنع ترتيب «أفضل منتج».</li>
          <li>لا تستخدم درجات Yuka أو EWG أو Think Dirty أو OnSkin أو أي تصنيف تجاري.</li>
          <li>لا تستنتج تركيز مكوّن من ترتيب قائمة INCI.</li>
          <li>لا تعتبر المكوّن غير المدرج آمنًا، ولا المكوّن المدرج ضارًا.</li>
          <li>لا تحسب التعرض الفردي أو الجرعة اليومية دون بيانات كمية كافية.</li>
          <li>لا تصدر شهادة امتثال قانوني أو حكمًا على سلامة منتج بعينه.</li>
          <li>لا تبيع ترتيب المنتجات ولا تعرض إعلانات مدفوعة داخل التقييم.</li>
        </ul>
      </section>

      <section>
        <SectionHeading number="04" eyebrow="INDEPENDENCE" title="الاستقلال والشفافية" />
        <p>
          قاعدة المعرفة مكتوبة كملفات JSON منفصلة عن محركات التقييم. يمكن مراجعة كل إدخال وتعديله
          دون لمس منطق الحساب. كل حد أو حالة تنظيمية مرتبط بمعرف مرجع، وكل مرجع له رابط ورقم وثيقة
          وتاريخ اطلاع. لا توجد قيمة «سحرية» بلا مصدر.
        </p>
        <p>
          المنصة لا تعتمد على درجات خارجية، ولا تعيد نشر تصنيفات تجارية. عندما تستورد بيانات من
          Open Food Facts أو Open Beauty Facts، تستورد الحقول الخام فقط (الاسم، العلامة، المكونات،
          القيم الغذائية) وتترك كل تصنيف خارجي خارج المحرك. المستخدم يرى ما استُورد ويستطيع تعديله
          قبل التقييم.
        </p>
        <Callout tone="info" title="النسخة والمراجعة">
          الإصدار الحالي من قاعدة المعرفة {meta.version}، آخر تحديث {meta.updated}. تُوثَّق
          التغييرات في سجل التغييرات، وتُحدَّث تواريخ المراجعة عند تعديل أي إدخال.
        </Callout>
      </section>

      <section>
        <SectionHeading number="05" eyebrow="PRIVACY" title="الخصوصية" />
        <p>
          يعمل التقييم في المتصفح بعد تحميل الصفحة. لا نرسل بيانات المنتج أو المكونات إلى خادم
          خاص بالمنصة. يُحفظ سجل التحليلات محليًا في متصفحك فقط، ويمكنك مسحه من صفحة التقرير.
          الاستيراد بالباركود اختياري، وعند استخدامه يُرسل الباركود إلى Open Food Facts أو Open
          Beauty Facts فقط.
        </p>
      </section>

      <section>
        <SectionHeading number="06" eyebrow="SCOPE" title="نطاق التغطية والتصحيحات" />
        <p>{meta.scope_ar}</p>
        <p>
          التغطية الحالية ليست كاملة، وليست بديلًا عن اللائحة الكاملة. إذا اكتشفت خطأً في قيمة أو
          مرجع أو صياغة، فالتصحيح يبدأ من المصدر: راجع الوثيقة الأصلية، ثم قارنها ببطاقة المادة.
          تُسجَّل التصحيحات الجوهرية في سجل التغييرات مع تحديث رقم الإصدار.
        </p>
        <div className="about-links">
          <Link to="/methodology" className="button button-ghost">
            اقرأ المنهجية
          </Link>
          <Link to="/sources" className="button button-ghost">
            راجع المصادر
          </Link>
          <Link to="/changelog" className="button button-ghost">
            سجل التغييرات
          </Link>
        </div>
      </section>
    </div>
  );
}
