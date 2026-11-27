export const KCAL_TO_KJ = 4.184;

export function kcalToKj(kcal: number): number {
  return kcal * KCAL_TO_KJ;
}

/** salt (g) / 2.5 = sodium (g); ×1000 = sodium (mg). */
export function saltToSodiumMg(saltG: number): number {
  return (saltG / 2.5) * 1000;
}

export function sodiumMgToSaltG(sodiumMg: number): number {
  return (sodiumMg * 2.5) / 1000;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
