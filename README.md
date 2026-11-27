# مِعيار (Miyar)

منصة عربية مستقلة لتقييم المنتجات الغذائية ومستحضرات التجميل اعتمادًا على مراجع تنظيمية وعلمية موثقة. تعمل الواجهة والمحركان بالكامل في المتصفح، وقاعدة المعرفة ملفات JSON منفصلة يمكن مراجعتها وتعديلها دون لمس منطق الحساب.

> **الفكرة الأساسية:** لا درجة واحدة، لا ترتيب للمنتجات، ولا حكم بلا دليل. حين لا تتوفر معلومات كافية تظهر العبارة الصريحة: «لا تتوفر معلومات كافية لإصدار حكم موثوق».

---

## ما الذي تقدمه المنصة؟

### 1. محرك الغذاء
- يحسب **نموذج FSA NPM 2004/2005** (Nutrient Profiling Model) وفق التوجيه التقني الرسمي، إصدار يناير 2011.
- يعرض النتيجة الرسمية `F = A − C` فقط عند اكتمال الحقول المطلوبة.
- يطبّق قاعدة استبعاد البروتين عندما تكون نقاط A ≥ 11 ونقاط الفواكه والخضروات والمكسرات < 5.
- يميّز بين عتبة الغذاء الصلب (F ≥ 4) وعتبة المشروب (F ≥ 1)، ويوضح أن التصنيف إعلاني وليس حكمًا صحيًا.
- يطابق أرقام E والأسماء والمرادفات مع 21 إضافة غذائية موثقة، ويعرض ADI حيث تتوفر، دون حساب تعرض فردي.

### 2. محرك التجميل
- يقرأ قائمة INCI ويقارن كل مكوّن بالملاحق II وIII وV وVI من اللائحة (EC) No 1223/2009.
- يعرض **محاور منفصلة**: محظور، مقيد، وسم إلزامي، غير معروف. لا يوجد مجموع أو درجة مركبة.
- يتحقق من الحد الأقصى فقط عند توفر التركيز وفئة المنتج. غياب التركيز يعطي «التحقق غير ممكن»، لا «ضمن الحد».
- لا يستنتج التركيز من ترتيب INCI، ويعامل الماء والمواد الأساسية كمواد أساسية لا كمواد مقيّمة.

### 3. قاعدة المعرفة
- 21 إضافة غذائية، 50 مكوّنًا تجميليًا، 56 مرجعًا (النسخة 1.0.0).
- كل بطاقة تحتوي على الاسم العربي والإنجليزي، أرقام E أو INCI وCAS وEC، الوظيفة، الحالة التنظيمية، الحدود، التقييم العلمي، المراجع، تاريخ المراجعة، ومستوى الثقة.
- كل حد أو حالة مرتبط بمعرّف مرجع يمكن فتحه.

---

## المبادئ غير القابلة للتفاوض

1. **الخطر ≠ القابلية للخطر.** تصنيف المادة لا يعني أن التعرض لها في هذا المنتج سيسبب ضررًا.
2. **المسموح ≠ الآمن للجميع.** الامتثال التنظيمي لا يلغي الحساسية أو التهيج الفردي.
3. **التركيز ≠ الترتيب.** لا تُستنتج النسب من موقع المكوّن في قائمة INCI.
4. **الجهل يُعلن.** المكوّن غير المدرج لا يُعتبر آمنًا، وغياب القيمة لا يُترجم إلى سلامة.
5. **لا درجات تجارية.** لا Yuka، ولا EWG، ولا Think Dirty، ولا OnSkin، ولا Nutri-Score أو NOVA أو Eco-Score.
6. **لا اختلاق.** لا حدود ولا ADI ولا أرقام وثائق ولا روابط غير متحققة.

---

## التشغيل السريع

المتطلبات: Node.js 20+ وnpm.

```bash
npm install
npm run dev        # خادم تطوير على المنفذ الافتراضي 5173
npm run build      # فحص TypeScript + بناء الإنتاج في dist/
npm run preview    # معاينة بناء الإنتاج
npm run validate   # التحقق من سلامة قاعدة المعرفة
npm test           # تشغيل كل الاختبارات (Vitest)
```

لا يحتاج التقييم إلى خادم خلفي. بعد تحميل الصفحة تعمل المحركات محليًا. الاستيراد بالباركود اختياري ويستخدم Open Food Facts / Open Beauty Facts لجلب الحقول الخام فقط.

---

## البنية

```
miyar/
├── public/
│   ├── assets/favicon.svg
│   └── fonts/                     # خطوط ثمانية (Thmanyah Sans / Serif Display / Serif Text)
├── src/
│   ├── components/                # التخطيط، النماذج، الواجهة، مستورد الباركود
│   ├── context/AppContext.tsx     # حالة آخر تقرير والسجل المحلي
│   ├── database/
│   │   ├── food/additives.json    # 21 إضافة غذائية
│   │   ├── cosmetics/ingredients.json # 50 مكوّنًا تجميليًا
│   │   ├── references/references.json # 56 مرجعًا
│   │   ├── meta.json              # النسخة والعدد والنطاق
│   │   └── index.ts               # تحميل القاعدة وفهارس المراجع
│   ├── lib/
│   │   ├── food/npm.ts            # حساب FSA NPM
│   │   ├── food/match.ts          # مطابقة الإضافات
│   │   ├── food/evaluate.ts       # تجميع تقرير الغذاء
│   │   ├── cosmetics/evaluate.ts  # محرك التجميل متعدد المحاور
│   │   ├── normalize.ts           # تطبيع عربي/إنجليزي وتقسيم المكونات
│   │   ├── units.ts               # تحويلات الطاقة والملح/الصوديوم
│   │   ├── barcode.ts             # استيراد اختياري للبيانات الخام
│   │   └── history.ts             # تخزين محلي
│   ├── pages/                     # الصفحات التسع + 404
│   ├── styles/global.css          # نظام التصميم RTL والطباعة والتجاوب
│   ├── types/index.ts             # عقود المجال والتقييم
│   ├── App.tsx
│   └── main.tsx
├── scripts/validate-data.ts       # تحقق آلي من القاعدة
├── tests/                         # 63 اختبارًا
└── docs/                          # الوثائق التسع
```

---

## الصفحات

| المسار | الصفحة |
|---|---|
| `/` | الرئيسية |
| `/food` | تحليل غذائي |
| `/cosmetics` | تحليل تجميلي |
| `/report` | التقرير (آخر تقرير أو سجل محلي) |
| `/knowledge` | قاعدة المعرفة |
| `/methodology` | المنهجية |
| `/sources` | المصادر |
| `/about` | عن المنصة |
| `/changelog` | سجل التغييرات |

يُستخدم `HashRouter` حتى تعمل الروابط مباشرة على GitHub Pages دون إعداد إعادة توجيه من الخادم.

---

## الخصوصية

- لا يوجد حساب مستخدم ولا خادم للمنصة.
- سجل التحليل وآخر تقرير يُحفظان في `localStorage` / `sessionStorage` على جهازك فقط، ويمكن مسحهما من صفحة التقرير.
- الاستيراد بالباركود اختياري، وعند استخدامه يُرسل الباركود وحده إلى Open Food Facts أو Open Beauty Facts.
- لا تُرسل قائمة المكونات أو القيم الغذائية إلى أي خدمة خارجية.

---

## النشر على GitHub Pages

البناء يستخدم `base: './'`، لذلك يعمل في جذر النطاق أو في مسار فرعي مثل `https://<user>.github.io/<repo>/`.

### الطريقة 1: GitHub Actions (موصى بها)

أضف الملف `.github/workflows/deploy.yml` (موجود في المستودع):

```yaml
name: Build and deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run validate
      - run: npm test
      - run: npm run build
      - name: Configure Pages
        if: github.event.repository.visibility == 'public'
        uses: actions/configure-pages@v5
      - name: Upload Pages artifact
        if: github.event.repository.visibility == 'public'
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    if: github.event.repository.visibility == 'public'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

ثم من المستودع: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

> **ملاحظة للخطة المجانية:** GitHub Pages لا يدعم المستودعات الخاصة على الخطة المجانية. سير العمل يبني ويختبر في كل مرة، لكنه يتخطى خطوات Pages إذا كان المستودع خاصًا. لنشر الموقع، اجعل المستودع عامًا أو استخدم خطة تدعم Pages للمستودعات الخاصة. يمكنك دائمًا رفع `dist/` إلى أي استضافة ثابتة.

### الطريقة 2: النشر اليدوي

```bash
npm run build
npx gh-pages -d dist     # أو ارفع محتويات dist إلى فرع gh-pages
```

لا تحتاج إلى تعديل `vite.config.ts` عند النشر في مسار فرعي، لأن `base` نسبي.

---

## ما الذي يمكن تعديله؟

| تريد تعديل | الملف |
|---|---|
| إضافة/تصحيح إضافة غذائية | `src/database/food/additives.json` |
| إضافة/تصحيح مكوّن تجميلي | `src/database/cosmetics/ingredients.json` |
| إضافة مرجع | `src/database/references/references.json` |
| تحديث النسخة والعدد والنطاق | `src/database/meta.json` |
| منطق حساب FSA NPM | `src/lib/food/npm.ts` |
| منطق مطابقة الإضافات | `src/lib/food/match.ts` |
| منطق محرك التجميل | `src/lib/cosmetics/evaluate.ts` |
| التطبيع والتقسيم | `src/lib/normalize.ts` |
| التصميم والألوان والخطوط | `src/styles/global.css` |
| النصوص التعريفية | `src/pages/*` |

بعد أي تعديل على القاعدة:

```bash
npm run validate && npm test && npm run build
```

---

## الاختبارات والتحقق

- `npm run validate`: يتحقق من تطابق العدادات، تفرد المعرّفات، وجود كل مرجع، صحة الحالات التنظيمية، وصحة الروابط.
- `npm test`: 63 اختبارًا تغطي أمثلة FSA الرسمية الستة، عتبات النقاط، تحويلات الوحدات، استبعاد البروتين، مطابقة الإضافات، الحظر والتقييد وحدود التجميل، وسم مسببات الحساسية، التطبيع العربي، وسلامة قاعدة المعرفة.
- `npx tsc -b`: فحص TypeScript صارم.
- `npm run build`: بناء إنتاج ناجح.

راجع [docs/TESTING.md](docs/TESTING.md) للتفاصيل.

---

## الوثائق

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — البنية والقرارات التقنية.
- [SCIENTIFIC-METHODOLOGY.md](docs/SCIENTIFIC-METHODOLOGY.md) — المنهجية العلمية بالتفصيل.
- [DATA-SOURCES.md](docs/DATA-SOURCES.md) — مصادر البيانات وسياسة التحقق.
- [DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) — مخطط قاعدة المعرفة.
- [CONTRIBUTING.md](docs/CONTRIBUTING.md) — كيف تساهم دون إضعاف الدقة.
- [CHANGELOG.md](docs/CHANGELOG.md) — سجل الإصدارات.
- [TESTING.md](docs/TESTING.md) — الاختبارات والتحقق اليدوي.
- [LIMITATIONS.md](docs/LIMITATIONS.md) — ما لا تستطيعه المنصة.

---

## حدود أساسية

- قاعدة المعرفة محدودة (21 + 50 مادة) وليست قائمة كاملة بملاحق الاتحاد الأوروبي.
- لا تحسب المنصة التعرض الفردي ولا الجرعة اليومية.
- لا تقيّم الملوثات أو بقايا المبيدات أو مواد التغليف أو الميكروبات أو درجة المعالجة.
- التصنيف الغذائي إعلاني بريطاني وليس تشخيصًا صحيًا.
- الامتثال التنظيمي ليس شهادة سلامة.
- المنصة لا تستبدل الملصق الرسمي أو التحذيرات أو المختص أو الجهة الرقابية.

---

## الترخيص

لم يُحدد ترخيص نهائي بعد. قبل إعادة الاستخدام أو النشر العام، أضف ترخيصًا صريحًا (مثل MIT للكود) وراجع شروط إعادة استخدام النصوص والبيانات التنظيمية. الخطوط مضمّنة من حزمة Thmanyah؛ تحقق من ترخيصها قبل التوزيع.
