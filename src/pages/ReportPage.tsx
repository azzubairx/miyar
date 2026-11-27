import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getReferences } from '../database';
import { ArrowIcon, PrintIcon, ShieldIcon } from '../components/Icons';
import { Badge, Callout, EmptyState, ExternalLink, Meter, SectionHeading } from '../components/ui';
import type {
  AlertSeverity,
  CosmeticsEvaluationResult,
  FoodEvaluationResult,
  Reference,
} from '../types';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function severityTone(severity: AlertSeverity): 'clay' | 'amber' | 'ink' | 'green' | 'neutral' {
  if (severity === 'regulatory') return 'clay';
  if (severity === 'attention') return 'amber';
  if (severity === 'insufficient') return 'ink';
  return 'green';
}

function severityLabel(severity: AlertSeverity): string {
  if (severity === 'regulatory') return 'تنظيمي';
  if (severity === 'attention') return 'انتباه';
  if (severity === 'insufficient') return 'بيانات ناقصة';
  return 'معلومة';
}

function ReferencesBlock({ ids }: { ids: string[] }) {
  const references = getReferences([...new Set(ids)]);
  if (references.length === 0) return null;
  return (
    <section className="report-section">
      <SectionHeading number="07" eyebrow="REFERENCES" title="المراجع المستخدمة" />
      <ol className="reference-list">
        {references.map((reference: Reference) => (
          <li key={reference.id}>
            <div className="reference-main">
              <span className="reference-authority">{reference.authority}</span>
              <strong>{reference.title_ar}</strong>
              <span className="reference-doc">{reference.document_number}</span>
            </div>
            <ExternalLink href={reference.url}>فتح المصدر</ExternalLink>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AlertsBlock({ alerts }: { alerts: FoodEvaluationResult['alerts'] }) {
  if (alerts.length === 0) return null;
  return (
    <section className="report-section">
      <SectionHeading number="05" eyebrow="ALERTS" title="التنبيهات" lead="مرتبة من الأعلى خطورة تنظيمية إلى المعلومة." />
      <div className="alert-list">
        {alerts.map((alert) => (
          <article className={`alert-item alert-${alert.severity}`} key={alert.id}>
            <div className="alert-head">
              <Badge tone={severityTone(alert.severity)}>{severityLabel(alert.severity)}</Badge>
              <h3>{alert.title_ar}</h3>
            </div>
            <p>{alert.message_ar}</p>
            {alert.reference_ids.length > 0 && (
              <div className="alert-refs">
                {getReferences(alert.reference_ids).map((reference) => (
                  <ExternalLink key={reference.id} href={reference.url}>
                    {reference.document_number}
                  </ExternalLink>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function FoodReport({ result }: { result: FoodEvaluationResult }) {
  const score = result.npm.score;
  const classification = result.npm.classification;

  return (
    <>
      <section className="report-hero">
        <div className="report-hero-main">
          <div className="report-kicker">
            <Badge tone="green">تقرير غذائي</Badge>
            <span>FSA NPM 2004/2005</span>
          </div>
          <h1>{result.product.name}</h1>
          <p className="report-brand">
            {result.product.brand || 'بلا علامة تجارية'}
            {result.product.category ? ` · ${result.product.category}` : ''}
          </p>
          <div className="report-meta">
            <span>أُصدر في {formatDate(result.generated_at)}</span>
            <span>قاعدة المعرفة {result.kb_version}</span>
            {result.product.packageSize && <span>العبوة {result.product.packageSize}</span>}
            {result.product.servingSize && <span>الحصة {result.product.servingSize}</span>}
          </div>
        </div>

        <div className={`score-card ${classification}`}>
          <span className="score-label">نتيجة النموذج</span>
          <div className="score-value">
            {score === null ? '—' : score > 0 ? `+${score}` : score}
          </div>
          <span className="score-scale">A − C</span>
          <div className="score-classification">
            {classification === 'less_healthy' && 'مصنّف «أقل صحة» إعلانيًا'}
            {classification === 'not_classified_less_healthy' && 'غير مصنّف «أقل صحة»'}
            {classification === 'not_applicable' && 'النتيجة غير قابلة للحساب'}
          </div>
        </div>
      </section>

      <div className="report-grid">
        <div className="report-main">
          <section className="report-section">
            <SectionHeading number="01" eyebrow="SUMMARY" title="خلاصة القراءة" />
            <div className="summary-strip">
              <div>
                <span>نقاط A</span>
                <strong>{result.npm.aPoints ?? '—'}</strong>
              </div>
              <div>
                <span>نقاط C</span>
                <strong>{result.npm.cPoints ?? '—'}</strong>
              </div>
              <div>
                <span>الطاقة</span>
                <strong>{result.nutrients[0]?.value ?? '—'} كج</strong>
              </div>
              <div>
                <span>الإضافات المطابقة</span>
                <strong>{result.additives.length}</strong>
              </div>
            </div>
            {result.npm.protein_excluded && (
              <Callout tone="info" title="استُبعدت نقاط البروتين">
                وفق قاعدة FSA: إذا كانت نقاط A ≥ 11 وكانت نقاط الفواكه والخضروات والمكسرات أقل من
                5، لا تُحتسب نقاط البروتين في المجموع C.
              </Callout>
            )}
          </section>

          <section className="report-section">
            <SectionHeading number="02" eyebrow="NUTRIENTS" title="تفصيل النقاط" lead="كل قيمة لكل 100 غرام أو 100 ملليلتر، كما أُدخلت." />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">العنصر</th>
                    <th scope="col">القيمة</th>
                    <th scope="col">النقاط</th>
                    <th scope="col">ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {result.nutrients.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.label_ar}</th>
                      <td>
                        {row.value === null ? '—' : row.value} {row.unit}
                      </td>
                      <td>
                        {row.points === null ? (
                          <span className="muted">غير متاح</span>
                        ) : (
                          <span className={row.points > 0 ? 'points points-positive' : 'points'}>{row.points}</span>
                        )}
                      </td>
                      <td className="cell-note">{row.note_ar ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="table-footnote">
              نقاط A تشمل الطاقة والدهون المشبعة والسكريات والصوديوم. نقاط C تشمل الفواكه
              والخضروات والمكسرات والألياف والبروتين (مع قاعدة الاستبعاد).
            </p>
          </section>

          <section className="report-section">
            <SectionHeading number="03" eyebrow="ADDITIVES" title="الإضافات الغذائية" />
            {result.additives.length === 0 ? (
              <p className="muted">
                لم يتعرف المحرك على إضافات مدرجة في قاعدة المعرفة. غياب المطابقة لا يعني خلو
                المنتج من الإضافات أو سلامته.
              </p>
            ) : (
              <div className="additive-list">
                {result.additives.map((matched) => {
                  const entry = matched.entry;
                  if (!entry || entry.kind !== 'food_additive') return null;
                  const adi = entry.limits.find((limit) => limit.kind === 'adi');
                  const prohibited = entry.regulatory_status.some((status) => status.status === 'prohibited');
                  return (
                    <article className="additive-card" key={entry.id}>
                      <div className="additive-head">
                        <div>
                          <span className="additive-e">{entry.e_number}</span>
                          <h3>{entry.name_ar}</h3>
                          <span className="additive-en">{entry.name_en}</span>
                        </div>
                        <Badge tone={prohibited ? 'clay' : 'green'}>
                          {prohibited ? 'محظور' : 'مسموح بفئات'}
                        </Badge>
                      </div>
                      <p className="additive-raw">ظهر في القائمة باسم: {matched.raw}</p>
                      <div className="additive-facts">
                        <div>
                          <span>الوظيفة</span>
                          <strong>{entry.functions_ar.join('، ')}</strong>
                        </div>
                        <div>
                          <span>المدخول اليومي المقبول</span>
                          <strong>
                            {adi && adi.value !== null ? `${adi.value} ${adi.unit}` : 'لا توجد قيمة رقمية'}
                          </strong>
                        </div>
                      </div>
                      <p className="additive-note">{entry.notes_ar}</p>
                      <Link className="text-link" to={`/knowledge?q=${encodeURIComponent(entry.e_number)}`}>
                        فتح بطاقة المعرفة <ArrowIcon size={16} />
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <AlertsBlock alerts={result.alerts} />

          <section className="report-section">
            <SectionHeading number="06" eyebrow="LIMITATIONS" title="حدود هذا التقرير" />
            <ul className="limitation-list">
              {result.limitations_ar.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </section>

          <ReferencesBlock ids={result.reference_ids} />
        </div>

        <aside className="report-aside">
          <div className="aside-card">
            <h3>اكتمال البيانات</h3>
            <Meter percent={result.completeness.percent} />
            {result.completeness.missing_ar.length > 0 ? (
              <>
                <p className="aside-note">الحقول الناقصة:</p>
                <ul className="missing-list">
                  {result.completeness.missing_ar.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="aside-note">جميع الحقول المطلوبة متوفرة.</p>
            )}
          </div>

          <div className="aside-card aside-card-quiet">
            <h3>بيانات المنتج</h3>
            <dl className="meta-list">
              <div>
                <dt>نوع المنتج</dt>
                <dd>{result.product.productType === 'drink' ? 'مشروب' : 'غذاء صلب'}</dd>
              </div>
              <div>
                <dt>أساس القيم</dt>
                <dd>{result.product.nutritionBasis === '100ml' ? 'لكل 100 مل' : 'لكل 100 غ'}</dd>
              </div>
              <div>
                <dt>الفئة</dt>
                <dd>{result.product.category || 'غير محددة'}</dd>
              </div>
              <div>
                <dt>المكونات المطابقة</dt>
                <dd>{result.additives.length}</dd>
              </div>
            </dl>
          </div>

          {result.unknownIngredients.length > 0 && (
            <details className="aside-card details-card">
              <summary>مكونات لم تُطابق ({result.unknownIngredients.length})</summary>
              <p className="aside-note">
                هذه المكونات ليست في قاعدة المعرفة المحدودة. عدم مطابقتها لا يعني أنها آمنة أو
                ضارة؛ يعني أن المنصة لا تملك بطاقة موثقة لها.
              </p>
              <ul className="unknown-list">
                {result.unknownIngredients.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          )}
        </aside>
      </div>
    </>
  );
}

function CosmeticsReport({ result }: { result: CosmeticsEvaluationResult }) {
  return (
    <>
      <section className="report-hero">
        <div className="report-hero-main">
          <div className="report-kicker">
            <Badge tone="amber">تقرير تجميلي</Badge>
            <span>EU 1223/2009</span>
          </div>
          <h1>{result.product.name}</h1>
          <p className="report-brand">
            {result.product.brand || 'بلا علامة تجارية'}
            {result.product.category ? ` · ${result.product.category}` : ''}
          </p>
          <div className="report-meta">
            <span>أُصدر في {formatDate(result.generated_at)}</span>
            <span>قاعدة المعرفة {result.kb_version}</span>
            <span>{result.product.application === 'leave-on' ? 'يُترك على الجلد' : 'يُشطف'}</span>
          </div>
        </div>

        <div className="cosmetics-summary-card">
          <span className="score-label">المحاور</span>
          <div className="axis-grid">
            <div className="axis axis-clay">
              <strong>{result.counts.prohibited}</strong>
              <span>محظور</span>
            </div>
            <div className="axis axis-amber">
              <strong>{result.counts.restricted}</strong>
              <span>مقيد</span>
            </div>
            <div className="axis axis-ink">
              <strong>{result.counts.labelling}</strong>
              <span>وسم</span>
            </div>
            <div className="axis axis-neutral">
              <strong>{result.counts.unknown}</strong>
              <span>غير معروف</span>
            </div>
          </div>
          <p className="axis-note">لا درجة مركبة. لكل محور معنى تنظيمي مستقل.</p>
        </div>
      </section>

      <Callout tone="info" title="كيف تقرأ هذا التقرير">
        «محظور» يعني إدراجًا في الملحق II. «مقيد» يعني وجود حد أو شرط استخدام. «وسم» يعني التزامًا
        بالإفصاح عند تجاوز حد معين. «غير معروف» يعني أن المكوّن خارج تغطية قاعدة المعرفة، وليس أنه
        آمن.
      </Callout>

      <div className="report-grid">
        <div className="report-main">
          <section className="report-section">
            <SectionHeading number="01" eyebrow="INGREDIENTS" title="المكونات والمحاور" />
            <div className="table-wrap">
              <table className="data-table ingredient-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">المكوّن</th>
                    <th scope="col">الحالة</th>
                    <th scope="col">التركيز</th>
                    <th scope="col">التفصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ingredients.map((ingredient) => (
                    <tr key={`${ingredient.raw}-${ingredient.position}`}>
                      <td className="cell-index">{String(ingredient.position + 1).padStart(2, '0')}</td>
                      <th scope="row">
                        <span dir="auto">{ingredient.raw}</span>
                        {ingredient.entry && (
                          <span className="ingredient-ar">{ingredient.entry.name_ar}</span>
                        )}
                      </th>
                      <td>
                        <Badge tone={severityTone(ingredient.severity)}>
                          {ingredient.regulatory_label_ar}
                        </Badge>
                      </td>
                      <td>
                        {ingredient.concentration_percent === null ||
                        ingredient.concentration_percent === undefined
                          ? 'غير معروف'
                          : `${ingredient.concentration_percent}%`}
                      </td>
                      <td className="cell-detail">
                        <details>
                          <summary>عرض</summary>
                          <div className="detail-body">
                            {ingredient.applied_limits.length > 0 ? (
                              <ul className="limit-list">
                                {ingredient.applied_limits.map((applied, index) => (
                                  <li key={`${ingredient.raw}-limit-${index}`}>
                                    <span
                                      className={`limit-result limit-${applied.result}`}
                                    >
                                      {applied.result === 'within_limit' && 'ضمن الحد'}
                                      {applied.result === 'exceeds_limit' && 'يتجاوز الحد'}
                                      {applied.result === 'concentration_unknown' && 'التحقق غير ممكن'}
                                      {applied.result === 'not_applicable' && 'غير منطبق'}
                                    </span>
                                    <p>{applied.message_ar}</p>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="muted">لا توجد حدود منطبقة مسجلة لهذا المكوّن.</p>
                            )}
                            {ingredient.notes_ar.map((note) => (
                              <p className="detail-note" key={note}>
                                {note}
                              </p>
                            ))}
                            {ingredient.entry && (
                              <Link
                                className="text-link"
                                to={`/knowledge?q=${encodeURIComponent(
                                  ingredient.entry.kind === 'cosmetic_ingredient'
                                    ? ingredient.entry.inci_name
                                    : ingredient.entry.name_en,
                                )}`}
                              >
                                فتح بطاقة المعرفة <ArrowIcon size={16} />
                              </Link>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="table-footnote">
              الترتيب المعروض هو ترتيب الإدخال، وليس دليلًا على التركيز. لا تُستنتج النسب من ترتيب
              INCI.
            </p>
          </section>

          <AlertsBlock alerts={result.alerts} />

          <section className="report-section">
            <SectionHeading number="05" eyebrow="LIMITATIONS" title="حدود هذا التقرير" />
            <ul className="limitation-list">
              {result.limitations_ar.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </section>

          <ReferencesBlock ids={result.reference_ids} />
        </div>

        <aside className="report-aside">
          <div className="aside-card">
            <h3>تغطية المكونات</h3>
            <Meter percent={result.completeness.percent} label="نسبة المكونات المطابقة" />
            <p className="aside-note">
              النسبة تقيس تغطية قاعدة المعرفة، لا سلامة المنتج. كلما زادت المكونات غير المعروفة،
              قلّ ما يمكن للمنصة قوله.
            </p>
            {result.unknownIngredients.length > 0 && (
              <details className="inline-details">
                <summary>عرض المكونات غير المعروفة ({result.unknownIngredients.length})</summary>
                <ul className="unknown-list">
                  {result.unknownIngredients.map((item) => (
                    <li key={item} dir="auto">
                      {item}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <div className="aside-card aside-card-quiet">
            <h3>بيانات المنتج</h3>
            <dl className="meta-list">
              <div>
                <dt>طريقة الاستخدام</dt>
                <dd>{result.product.application === 'leave-on' ? 'يُترك على الجلد' : 'يُشطف'}</dd>
              </div>
              <div>
                <dt>منطقة الاستخدام</dt>
                <dd>{result.product.area}</dd>
              </div>
              <div>
                <dt>المكونات المطابقة</dt>
                <dd>{result.ingredients.filter((item) => item.matched).length}</dd>
              </div>
              <div>
                <dt>بلا قيد محدد</dt>
                <dd>{result.counts.no_specific_restriction}</dd>
              </div>
            </dl>
          </div>

          {result.product.warnings && (
            <div className="aside-card aside-card-quiet">
              <h3>تحذيرات الملصق</h3>
              <p className="aside-note">{result.product.warnings}</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export default function ReportPage() {
  const { result, history, clearHistory, openHistory } = useApp();
  const navigate = useNavigate();

  if (!result) {
    return (
      <div className="page">
        <EmptyState
          title="لا يوجد تقرير بعد"
          action={
            <div className="empty-actions">
              <Link to="/food" className="button button-primary">
                تحليل غذائي
              </Link>
              <Link to="/cosmetics" className="button button-ghost">
                تحليل تجميلي
              </Link>
            </div>
          }
        >
          <p>
            ابدأ بتحليل منتج، وسيظهر التقرير هنا. يمكنك أيضًا فتح تقرير محفوظ من سجل هذا الجهاز.
          </p>
          {history.length > 0 && (
            <div className="history-list compact">
              {history.slice(0, 5).map((item) => (
                <div className="history-row" key={item.id}>
                  <Badge tone={item.kind === 'food' ? 'green' : 'amber'}>
                    {item.kind === 'food' ? 'غذاء' : 'تجميل'}
                  </Badge>
                  <div className="history-name">
                    <strong>{item.product_name}</strong>
                    <span>{item.summary_ar}</span>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      openHistory(item.id);
                    }}
                  >
                    فتح
                  </button>
                </div>
              ))}
              <button type="button" className="text-button danger" onClick={clearHistory}>
                مسح كل السجل المحلي
              </button>
            </div>
          )}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page report-page">
      <div className="report-toolbar">
        <div className="report-toolbar-left">
          <Link to={result.kind === 'food' ? '/food' : '/cosmetics'} className="text-link">
            <ArrowIcon size={16} /> تحليل جديد
          </Link>
          <span className="toolbar-divider" />
          <span className="muted">آخر تقرير على هذا الجهاز</span>
        </div>
        <div className="report-toolbar-right">
          <button type="button" className="button button-ghost button-small" onClick={() => window.print()}>
            <PrintIcon size={16} />
            طباعة / PDF
          </button>
          <button
            type="button"
            className="button button-ghost button-small"
            onClick={() => {
              clearHistory();
              navigate('/report');
            }}
          >
            مسح السجل
          </button>
        </div>
      </div>

      {result.kind === 'food' ? <FoodReport result={result} /> : <CosmeticsReport result={result} />}

      <section className="report-disclaimer">
        <ShieldIcon size={22} />
        <div>
          <strong>هذا تقرير معلوماتي، وليس شهادة سلامة.</strong>
          <p>
            المنصة لا تصدر حكمًا على سلامة منتج بعينه، ولا تحسب التعرض الفردي، ولا تستبدل الجهة
            الرقابية أو المختص. تحقق دائمًا من الملصق الرسمي والتحذيرات، واستشر مختصًا عند الحاجة.
          </p>
        </div>
      </section>
    </div>
  );
}
