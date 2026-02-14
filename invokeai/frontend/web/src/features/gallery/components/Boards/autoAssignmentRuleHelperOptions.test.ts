import { describe, expect, it } from 'vitest';

import {
  buildLoRANameHelperOptions,
  buildModelBaseHelperOptions,
  buildModelNameHelperOptions,
} from './autoAssignmentRuleUtils';

describe('auto assignment rule helper option builders', () => {
  it('dedupes and sorts model name options', () => {
    const options = buildModelNameHelperOptions([
      { name: 'Zeta Model' },
      { name: 'Alpha Model' },
      { name: 'Alpha Model' },
    ]);

    expect(options).toEqual([
      { label: 'Alpha Model', value: 'Alpha Model' },
      { label: 'Zeta Model', value: 'Zeta Model' },
    ]);
  });

  it('dedupes and sorts LoRA name options', () => {
    const options = buildLoRANameHelperOptions([
      { name: 'Stylize' },
      { name: 'Character' },
      { name: 'Stylize' },
    ]);

    expect(options).toEqual([
      { label: 'Character', value: 'Character' },
      { label: 'Stylize', value: 'Stylize' },
    ]);
  });

  it('derives model base options from installed models plus fallbacks', () => {
    const options = buildModelBaseHelperOptions(
      [{ base: 'custom-base' }, { base: 'flux' }, { base: 'custom-base' }],
      ['sdxl', 'flux']
    );

    expect(options).toEqual([
      { label: 'custom-base', value: 'custom-base' },
      { label: 'flux', value: 'flux' },
      { label: 'sdxl', value: 'sdxl' },
    ]);
  });
});
