import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { EvaluationResult, HistoryItem } from '../types';
import {
  addHistory,
  clearHistory as clearStoredHistory,
  loadHistory,
  loadHistoryResult,
  loadLastResult,
  saveLastResult,
} from '../lib/history';

interface AppContextValue {
  result: EvaluationResult | null;
  history: HistoryItem[];
  setResult: (result: EvaluationResult | null) => void;
  openHistory: (id: string) => boolean;
  clearHistory: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<EvaluationResult | null>(() => loadLastResult());
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());

  const setResult = useCallback((next: EvaluationResult | null) => {
    setResultState(next);
    if (next) {
      saveLastResult(next);
      setHistory(addHistory(next));
    }
  }, []);

  const clearHistory = useCallback(() => {
    clearStoredHistory();
    setHistory([]);
  }, []);

  const openHistory = useCallback((id: string): boolean => {
    const stored = loadHistoryResult(id);
    if (!stored) return false;
    setResultState(stored);
    saveLastResult(stored);
    return true;
  }, []);

  const value = useMemo(
    () => ({ result, history, setResult, openHistory, clearHistory }),
    [result, history, setResult, openHistory, clearHistory],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
