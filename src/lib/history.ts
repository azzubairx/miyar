import type { EvaluationResult, HistoryItem } from '../types';

const HISTORY_KEY = 'miyar.history.v1';
const LAST_RESULT_KEY = 'miyar.lastResult.v1';
const RESULTS_KEY = 'miyar.results.v1';
const MAX_HISTORY = 24;
const MAX_SNAPSHOTS = 12;

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {
    /* التخزين قد يكون معطلاً؛ لا نُفشل التقييم بسببه. */
  }
}

export function addHistory(result: EvaluationResult): HistoryItem[] {
  const item: HistoryItem = {
    id: result.id,
    kind: result.kind,
    product_name: result.product.name || 'منتج بلا اسم',
    brand: result.product.brand || '',
    created_at: result.generated_at,
    summary_ar:
      result.kind === 'food'
        ? result.npm.score === null
          ? 'بيانات غير مكتملة'
          : `نتيجة NPM: ${result.npm.score}`
        : `${result.counts.prohibited} محظور · ${result.counts.restricted} مقيد · ${result.counts.unknown} غير معروف`,
  };
  const next = [item, ...loadHistory().filter((existing) => existing.id !== item.id)].slice(0, MAX_HISTORY);
  saveHistory(next);
  saveResultSnapshot(result, next);
  return next;
}

function loadSnapshots(): Record<string, EvaluationResult> {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, EvaluationResult>) : {};
  } catch {
    return {};
  }
}

function saveResultSnapshot(result: EvaluationResult, history: HistoryItem[]): void {
  try {
    const snapshots = loadSnapshots();
    snapshots[result.id] = result;
    const allowed = new Set(history.slice(0, MAX_SNAPSHOTS).map((item) => item.id));
    for (const id of Object.keys(snapshots)) {
      if (!allowed.has(id)) delete snapshots[id];
    }
    localStorage.setItem(RESULTS_KEY, JSON.stringify(snapshots));
  } catch {
    /* ignore */
  }
}

export function loadHistoryResult(id: string): EvaluationResult | null {
  const snapshots = loadSnapshots();
  return snapshots[id] ?? null;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(RESULTS_KEY);
  } catch {
    /* ignore */
  }
}

export function saveLastResult(result: EvaluationResult): void {
  try {
    sessionStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result));
  } catch {
    /* ignore */
  }
}

export function loadLastResult(): EvaluationResult | null {
  try {
    const raw = sessionStorage.getItem(LAST_RESULT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EvaluationResult;
  } catch {
    return null;
  }
}
