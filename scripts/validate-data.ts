import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const readJson = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

const meta = readJson('src/database/meta.json');
const references = readJson('src/database/references/references.json').references as Array<Record<string, unknown>>;
const food = readJson('src/database/food/additives.json').foodAdditives as Array<Record<string, unknown>>;
const cosmetics = readJson('src/database/cosmetics/ingredients.json').cosmeticIngredients as Array<Record<string, unknown>>;

const errors: string[] = [];
const warnings: string[] = [];
const referenceIds = new Set(references.map((reference) => String(reference.id)));

const fail = (message: string) => errors.push(message);

if (meta.food_additives_count !== food.length) {
  fail(`meta.food_additives_count=${meta.food_additives_count} لكن العدد الفعلي ${food.length}`);
}
if (meta.cosmetic_ingredients_count !== cosmetics.length) {
  fail(`meta.cosmetic_ingredients_count=${meta.cosmetic_ingredients_count} لكن العدد الفعلي ${cosmetics.length}`);
}
if (meta.references_count !== references.length) {
  fail(`meta.references_count=${meta.references_count} لكن العدد الفعلي ${references.length}`);
}

const uniqueIds = (items: Array<Record<string, unknown>>, label: string) => {
  const seen = new Set<string>();
  for (const item of items) {
    const id = String(item.id ?? '');
    if (!id) fail(`${label}: إدخال بلا معرف`);
    if (seen.has(id)) fail(`${label}: معرف مكرر ${id}`);
    seen.add(id);
  }
};

uniqueIds(references, 'المراجع');
uniqueIds(food, 'الإضافات الغذائية');
uniqueIds(cosmetics, 'المكونات التجميلية');

const checkRefs = (ids: unknown, context: string) => {
  if (!Array.isArray(ids)) {
    fail(`${context}: reference_ids ليست مصفوفة`);
    return;
  }
  for (const id of ids) {
    if (!referenceIds.has(String(id))) fail(`${context}: مرجع غير موجود ${id}`);
  }
};

const requiredStrings = (item: Record<string, unknown>, fields: string[], context: string) => {
  for (const field of fields) {
    const value = item[field];
    if (typeof value !== 'string' || value.trim().length === 0) fail(`${context}: الحقل ${field} مفقود أو فارغ`);
  }
};

for (const reference of references) {
  const context = `مرجع ${reference.id}`;
  requiredStrings(reference, ['id', 'authority', 'title_ar', 'title_en', 'url', 'accessed'], context);
  if (typeof reference.url === 'string' && !/^https?:\/\//.test(reference.url)) {
    fail(`${context}: رابط غير صالح ${reference.url}`);
  }
}

const allowedConfidence = new Set([
  'official_regulation',
  'official_scientific_opinion',
  'scientific_assessment',
  'secondary_reference',
  'unverified',
]);
const allowedVerification = new Set(['verified', 'pending', 'partial']);
const allowedStatus = new Set([
  'authorised',
  'prohibited',
  'restricted',
  'permitted_preservative',
  'permitted_uv_filter',
  'labelling_required',
  'conditional',
  'not_listed',
]);

const checkCommon = (item: Record<string, unknown>, label: string) => {
  const context = `${label} ${item.id}`;
  requiredStrings(item, ['id', 'name_en', 'name_ar', 'category_ar', 'notes_ar', 'last_reviewed'], context);
  if (!allowedConfidence.has(String(item.confidence))) fail(`${context}: confidence غير معروف`);
  if (!allowedVerification.has(String(item.verification_status))) fail(`${context}: verification_status غير معروف`);
  const statuses = item.regulatory_status as Array<Record<string, unknown>>;
  if (!Array.isArray(statuses) || statuses.length === 0) fail(`${context}: لا توجد حالة تنظيمية`);
  for (const status of statuses ?? []) {
    if (!allowedStatus.has(String(status.status))) fail(`${context}: status غير معروف ${status.status}`);
    requiredStrings(status, ['framework', 'instrument', 'conditions_ar'], context);
    checkRefs(status.reference_ids, `${context} / حالة تنظيمية`);
  }
  const limits = item.limits as Array<Record<string, unknown>>;
  for (const limit of limits ?? []) {
    const value = limit.value;
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      fail(`${context}: قيمة حد غير صالحة ${value}`);
    }
    requiredStrings(limit, ['kind', 'unit'], context);
    checkRefs(limit.reference_ids, `${context} / حد`);
  }
  const assessments = item.scientific_assessment as Array<Record<string, unknown>>;
  for (const assessment of assessments ?? []) {
    requiredStrings(assessment, ['opinion_number', 'title_ar', 'adopted', 'summary_ar'], context);
    checkRefs(assessment.reference_ids, `${context} / تقييم علمي`);
  }
};

for (const additive of food) {
  const context = `إضافة ${additive.id}`;
  checkCommon(additive, 'إضافة');
  if (!/^E\s?\d{3}[a-z]?/i.test(String(additive.e_number))) {
    fail(`${context}: رقم E غير صالح ${additive.e_number}`);
  }
  if (!Array.isArray(additive.synonyms_en) || additive.synonyms_en.length === 0) {
    warnings.push(`${context}: لا توجد مرادفات إنجليزية`);
  }
}

for (const ingredient of cosmetics) {
  const context = `مكوّن ${ingredient.id}`;
  checkCommon(ingredient, 'مكوّن');
  if (typeof ingredient.inci_name !== 'string' || ingredient.inci_name.trim() === '') {
    fail(`${context}: inci_name مفقود`);
  }
}

if (meta.version !== '1.0.0') warnings.push(`نسخة قاعدة المعرفة ${meta.version}`);

if (warnings.length > 0) {
  console.log(`تحذيرات (${warnings.length}):`);
  for (const warning of warnings) console.log(`  - ${warning}`);
}

if (errors.length > 0) {
  console.error(`فشل التحقق: ${errors.length} خطأ`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('✓ التحقق من قاعدة المعرفة ناجح');
console.log(`  المراجع: ${references.length}`);
console.log(`  الإضافات الغذائية: ${food.length}`);
console.log(`  المكونات التجميلية: ${cosmetics.length}`);
console.log(`  النسخة: ${meta.version}`);
