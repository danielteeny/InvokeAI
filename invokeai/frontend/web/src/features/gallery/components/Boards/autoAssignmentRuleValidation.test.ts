import { describe, expect, it } from 'vitest';

import { getConditionValueForSave, isConditionValid } from './autoAssignmentRuleUtils';

describe('auto assignment rule condition validation', () => {
  it('accepts any operator without value', () => {
    const condition = {
      condition_type: 'lora_present' as const,
      operator: 'any' as const,
      case_sensitive: false,
    };

    expect(isConditionValid(condition)).toBe(true);
    expect(getConditionValueForSave(condition)).toBeUndefined();
  });

  it('rejects non-any operators without value', () => {
    const condition = {
      condition_type: 'model_name' as const,
      operator: 'equals' as const,
      case_sensitive: false,
    };

    expect(isConditionValid(condition)).toBe(false);
  });

  it('validates numeric condition values correctly', () => {
    const emptyNumeric = {
      condition_type: 'width_min' as const,
      operator: 'greater_than' as const,
      value: '',
      case_sensitive: false,
    };

    const invalidNumeric = {
      condition_type: 'width_min' as const,
      operator: 'greater_than' as const,
      value: 'abc',
      case_sensitive: false,
    };

    const validNumeric = {
      condition_type: 'width_min' as const,
      operator: 'greater_than' as const,
      value: '1024',
      case_sensitive: false,
    };

    expect(isConditionValid(emptyNumeric)).toBe(false);
    expect(isConditionValid(invalidNumeric)).toBe(false);
    expect(isConditionValid(validNumeric)).toBe(true);
    expect(getConditionValueForSave(validNumeric)).toBe('1024');
  });
});
