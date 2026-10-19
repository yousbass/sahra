export interface TentConfiguration {
  large: number;
  small: number;
  entertainment: number;
}

/**
 * Normalizes both the current mobile shape and older web field names.
 * Returning null distinguishes a listing with no stored configuration from
 * one that intentionally stores zero for every tent type.
 */
export function normalizeTentConfiguration(value: unknown): TentConfiguration | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const count = (current: string, legacy: string) => {
    const parsed = Number(raw[current] ?? raw[legacy] ?? 0);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  };

  return {
    large: count('large', 'largeTents'),
    small: count('small', 'smallTents'),
    entertainment: count('entertainment', 'entertainmentTents'),
  };
}

export function hasConfiguredTents(config: TentConfiguration | null): config is TentConfiguration {
  return !!config && config.large + config.small + config.entertainment > 0;
}