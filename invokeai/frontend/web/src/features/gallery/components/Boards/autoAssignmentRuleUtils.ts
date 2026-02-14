import type { ComboboxOption } from '@invoke-ai/ui-library';
import type { RuleCondition } from 'services/api/endpoints/boardAssignment';

export type RuleConditionDraft = Partial<RuleCondition>;
type ValidConditionDraft = RuleConditionDraft & Pick<RuleCondition, 'condition_type' | 'operator'>;

type ConditionType = RuleCondition['condition_type'];

export type HelperOptionsByConditionType = Partial<Record<ConditionType, ComboboxOption[]>>;

export const NUMERIC_CONDITION_TYPES = new Set<ConditionType>(['width_min', 'width_max', 'height_min', 'height_max']);

export const DEFAULT_MODEL_BASE_FALLBACKS = [
  'sd-1',
  'sd-2',
  'sd-3',
  'sdxl',
  'sdxl-refiner',
  'flux',
  'flux2',
  'cogview4',
  'z-image',
] as const;

const normalizeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

const hasValidNumericValue = (value: unknown): boolean => {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  const normalized = normalizeValue(value);
  if (!normalized) {
    return false;
  }
  return Number.isFinite(Number(normalized));
};

export const isConditionValueRequired = (condition: RuleConditionDraft): boolean => condition.operator !== 'any';

export const isConditionValueProvided = (condition: RuleConditionDraft): boolean => {
  if (!isConditionValueRequired(condition)) {
    return true;
  }

  if (condition.condition_type && NUMERIC_CONDITION_TYPES.has(condition.condition_type)) {
    return hasValidNumericValue(condition.value);
  }

  return normalizeValue(condition.value).length > 0;
};

export const isConditionValid = (condition: RuleConditionDraft): condition is ValidConditionDraft => {
  if (!condition.condition_type || !condition.operator) {
    return false;
  }
  return isConditionValueProvided(condition);
};

export const getConditionValueForSave = (condition: RuleConditionDraft): RuleCondition['value'] | undefined => {
  if (condition.operator === 'any') {
    return undefined;
  }

  if (condition.condition_type && NUMERIC_CONDITION_TYPES.has(condition.condition_type)) {
    return normalizeValue(condition.value);
  }

  return typeof condition.value === 'string' ? condition.value.trim() : condition.value;
};

const buildUniqueSortedOptions = (values: string[]): ComboboxOption[] => {
  const uniqueSortedValues = [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  return uniqueSortedValues.map((value) => ({ label: value, value }));
};

export const buildModelNameHelperOptions = <T extends { name: string }>(models: T[]): ComboboxOption[] =>
  buildUniqueSortedOptions(models.map((model) => model.name));

export const buildLoRANameHelperOptions = <T extends { name: string }>(models: T[]): ComboboxOption[] =>
  buildUniqueSortedOptions(models.map((model) => model.name));

export const buildModelBaseHelperOptions = <T extends { base: string }>(
  models: T[],
  fallbackBases: readonly string[] = DEFAULT_MODEL_BASE_FALLBACKS
): ComboboxOption[] => buildUniqueSortedOptions([...models.map((model) => model.base), ...fallbackBases]);
