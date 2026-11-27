# مخطط قاعدة المعرفة — مِعيار

## 1. الملفات

| الملف | المحتوى | العدد الحالي |
|---|---|---|
| `src/database/references/references.json` | المراجع التنظيمية والعلمية | 56 |
| `src/database/food/additives.json` | الإضافات الغذائية | 21 |
| `src/database/cosmetics/ingredients.json` | المكونات التجميلية | 50 |
| `src/database/meta.json` | النسخة والعدادات والنطاق وسجل التغييرات | — |
| `src/database/index.ts` | التحميل والفهارس | — |

كل ملف JSON يحتوي مفتاحًا جذريًا واحدًا: `references` أو `foodAdditives` أو `cosmeticIngredients`.

---

## 2. `Reference`

```json
{
  "id": "REF-EU-1223-ANNEX-V",
  "authority": "European Parliament and Council",
  "title_ar": "الملحق V — قائمة المواد الحافظة المسموح بها",
  "title_en": "Annex V — List of preservatives allowed in cosmetic products",
  "document_number": "Regulation (EC) No 1223/2009, Annex V",
  "published": "2009-11-30",
  "updated": null,
  "url": "https://eur-lex.europa.eu/...",
  "type": "official_regulation",
  "accessed": "2026-11-27",
  "note_ar": "نص مجمّع."
}
```

| الحقل | النوع | إلزامي | القاعدة |
|---|---|---|---|
| `id` | string | نعم | فريد، يبدأ بـ `REF-`. |
| `authority` | string | نعم | الجهة المصدرة. |
| `title_ar` | string | نعم | عنوان عربي دقيق. |
| `title_en` | string | نعم | العنوان الرسمي. |
| `document_number` | string | نعم | رقم/معرّف حقيقي. |
| `published` | string \| null | نعم (قد يكون null) | تاريخ النشر إن توفر. |
| `updated` | string \| null | لا | تاريخ آخر تحديث. |
| `url` | string | نعم | `http(s)://` فقط. |
| `type` | enum | نعم | انظر أدناه. |
| `accessed` | string | نعم | `YYYY-MM-DD`. |
| `note_ar` | string | لا | ملاحظة تحريرية. |

### `Reference.type`
`official_regulation` · `official_scientific_opinion` · `scientific_assessment` · `secondary_reference` · `unverified`

---

## 3. الحقول المشتركة بين الإضافات والمكونات

```json
{
  "id": "COS-ING-0024",
  "kind": "cosmetic_ingredient",
  "name_en": "Methylisothiazolinone",
  "name_ar": "ميثيل إيزوثيازولينون",
  "synonyms_en": ["MI", "MIT"],
  "synonyms_ar": ["ميثيل أيزوثيازولينون"],
  "cas_number": "2682-20-4",
  "ec_number": "220-239-6",
  "functions_ar": ["مادة حافظة"],
  "category_ar": "مواد حافظة",
  "regulatory_status": [],
  "limits": [],
  "scientific_assessment": [],
  "confidence": "official_regulation",
  "last_reviewed": "2026-11-27",
  "verification_status": "verified",
  "notes_ar": "ملاحظات المنصة."
}
```

| الحقل | النوع | إلزامي | ملاحظات |
|---|---|---|---|
| `id` | string | نعم | فريد. |
| `kind` | `food_additive` \| `cosmetic_ingredient` | نعم | يحدد النوع. |
| `name_en` | string | نعم | الاسم الإنجليزي. |
| `name_ar` | string | نعم | الاسم العربي. |
| `synonyms_en` | string[] | نعم | تُستخدم للمطابقة. |
| `synonyms_ar` | string[] | نعم | تُستخدم للمطابقة. |
| `cas_number` | string \| null | نعم | لا يُخترع. |
| `ec_number` | string \| null | للتجميل | لا يُخترع. |
| `functions_ar` | string[] | نعم | وظائف موثقة. |
| `category_ar` | string | نعم | فئة عربية للتصفية. |
| `regulatory_status` | RegulatoryStatus[] | نعم (عنصر واحد على الأقل) | الحالة القانونية. |
| `limits` | Limit[] | نعم (قد تكون فارغة) | الحدود المرجعية. |
| `scientific_assessment` | ScientificAssessment[] | نعم (قد تكون فارغة) | الآراء العلمية. |
| `confidence` | enum | نعم | مستوى الثقة. |
| `last_reviewed` | string | نعم | تاريخ مراجعة البطاقة. |
| `verification_status` | `verified` \| `partial` \| `pending` | نعم | حالة التحقق. |
| `notes_ar` | string | نعم | ملاحظات المنصة. |

### حقول خاصة بالإضافة الغذائية
| الحقل | النوع | إلزامي |
|---|---|---|
| `e_number` | string | نعم، بصيغة `E 102` أو نطاق `E 220–E 228`. |

### حقول خاصة بالمكوّن التجميلي
| الحقل | النوع | إلزامي |
|---|---|---|
| `inci_name` | string | نعم. |

---

## 4. `RegulatoryStatus`

```json
{
  "framework": "EU",
  "instrument": "Regulation (EC) No 1223/2009",
  "annex": "V",
  "entry": "57",
  "status": "permitted_preservative",
  "conditions_ar": "مسموح فقط في المنتجات التي تُشطف بتركيز أقصى 0.0015%.",
  "reference_ids": ["REF-EU-1223-ANNEX-V"]
}
```

| الحقل | النوع | إلزامي |
|---|---|---|
| `framework` | string | نعم |
| `instrument` | string | نعم |
| `annex` | string | لا |
| `entry` | string | لا |
| `status` | enum | نعم |
| `conditions_ar` | string | نعم |
| `reference_ids` | string[] | نعم (واحد على الأقل) |

### `status`
| القيمة | المعنى |
|---|---|
| `authorised` | مسموح. |
| `prohibited` | محظور (الملحق II أو ما يعادله). |
| `restricted` | مقيد بحد أو شرط. |
| `permitted_preservative` | مادة حافظة مسموحة (الملحق V). |
| `permitted_uv_filter` | مرشح UV مسموح (الملحق VI). |
| `labelling_required` | وسم إلزامي عند تجاوز حد. |
| `conditional` | استخدام مشروط. |
| `not_listed` | غير مدرج في النطاق المغطى. |

---

## 5. `Limit`

```json
{
  "kind": "max_concentration",
  "value": 0.0015,
  "unit": "%",
  "basis_ar": "محسوبًا على المادة الفعالة.",
  "product_types": ["rinse-off"],
  "areas": [],
  "leave_on": false,
  "conditions_ar": "للمنتجات التي تُشطف فقط.",
  "reference_ids": ["REF-EU-1223-ANNEX-V"]
}
```

| الحقل | النوع | إلزامي | ملاحظات |
|---|---|---|---|
| `kind` | `adi` \| `max_concentration` \| `labelling_threshold` | نعم | نوع الحد. |
| `value` | number \| null | نعم | غير سالب أو null. |
| `unit` | string | نعم | `%`، `mg/kg`، `mg/kg bw/day`… |
| `basis_ar` | string | لا | أساس الحساب. |
| `product_types` | string[] | لا | فئات المنتج المطابقة. |
| `areas` | string[] | لا | مناطق الاستخدام. |
| `leave_on` | boolean \| null | لا | `true` = يُترك، `false` = يُشطف. |
| `conditions_ar` | string | لا | شروط إضافية. |
| `reference_ids` | string[] | نعم | مراجع الحد. |

### قواعد قابلية التطبيق
- إذا كان `leave_on` محددًا، يجب أن تطابق طريقة الاستخدام.
- إذا كانت `product_types` غير فارغة، يجب أن تطابق فئة/منطقة/طريقة استخدام المنتج بعد التطبيع.
- تُرتَّب الحدود المنطبقة حسب عدد المطابقات (الأكثر تخصصًا أولًا).
- الحد بلا `product_types` ولا `leave_on` يُعتبر عامًا.

---

## 6. `ScientificAssessment`

```json
{
  "opinion_number": "SCCS/1650/23",
  "title_ar": "رأي بشأن ميثيل بارابين",
  "adopted": "2023-06-15",
  "summary_ar": "ملخص أمين للرأي.",
  "conditions_ar": "شروط إن وجدت.",
  "reference_ids": ["REF-SCCS-1650-23"]
}
```

| الحقل | النوع | إلزامي |
|---|---|---|
| `opinion_number` | string | نعم |
| `title_ar` | string | نعم |
| `adopted` | string | نعم |
| `summary_ar` | string | نعم |
| `conditions_ar` | string | لا |
| `reference_ids` | string[] | نعم |

---

## 7. `meta.json`

```json
{
  "version": "1.0.0",
  "updated": "2026-11-27",
  "food_additives_count": 21,
  "cosmetic_ingredients_count": 50,
  "references_count": 56,
  "scope_ar": "وصف النطاق.",
  "changelog_ar": ["1.0.0 — ..."]
}
```

| الحقل | النوع | القاعدة |
|---|---|---|
| `version` | string | SemVer. |
| `updated` | string | `YYYY-MM-DD`. |
| `food_additives_count` | number | يطابق طول المصفوفة. |
| `cosmetic_ingredients_count` | number | يطابق الطول. |
| `references_count` | number | يطابق الطول. |
| `scope_ar` | string | نطاق معلن. |
| `changelog_ar` | string[] | سجل مختصر. |

---

## 8. الثوابت التي يفحصها `npm run validate`

1. عدادات `meta.json` تساوي الأطوال الفعلية.
2. كل `id` فريد داخل ملفه.
3. كل `reference_id` موجود في `references.json`.
4. كل حالة تنظيمية ضمن القيم المسموحة.
5. كل `confidence` و`verification_status` ضمن القيم المسموحة.
6. كل `limit.value` رقم غير سالب أو `null`.
7. الحقول النصية الإلزامية غير فارغة.
8. روابط المراجع `http(s)`.
9. أرقام E بصيغة صحيحة.
10. وجود `inci_name` لكل مكوّن تجميلي.

## 9. إضافة إدخال جديد

1. أضف المرجع/المراجع أولًا.
2. أضف الإدخال بالمعرّف التالي في التسلسل (`FOOD-ADD-0022` أو `COS-ING-0051`).
3. املأ كل الحقول الإلزامية، ولا تترك `TODO`.
4. حدّث العدادات في `meta.json`.
5. شغّل `npm run validate && npm test && npx tsc -b && npm run build`.

## 10. ملاحظات على التصميم

- `regulatory_status` مصفوفة لأن المادة قد تكون محظورة في الملحق II ومقيدة في الملحق III معًا (مثل الهيدروكينون).
- `limits` منفصلة عن الحالة لأن الحالة تصف الإذن/المنع، والحد يصف القيمة والقابلية.
- `scientific_assessment` منفصل عن `regulatory_status` لأن الرأي العلمي قد يكون أوسع أو أقدم من الحالة النافذة.
- `confidence` يصف قوة المصدر، و`verification_status` يصف اكتمال مراجعة البطاقة. لا يُخلطان.
