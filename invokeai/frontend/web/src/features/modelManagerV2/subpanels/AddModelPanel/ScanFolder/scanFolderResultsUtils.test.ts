import type { ScanFolderResponse } from 'services/api/endpoints/models';
import { describe, expect, it } from 'vitest';

import { filterAndSortScanResults } from './scanFolderResultsUtils';

const RESULTS: ScanFolderResponse = [
  {
    path: '/models/Lora/zulu.safetensors',
    name: 'zulu.safetensors',
    modified_at: '2026-01-01T12:00:00Z',
    is_installed: false,
  },
  {
    path: '/models/Lora/alpha.safetensors',
    name: 'alpha.safetensors',
    modified_at: '2026-01-03T12:00:00Z',
    is_installed: false,
  },
  {
    path: '/models/Lora/no-date.safetensors',
    name: 'no-date.safetensors',
    modified_at: null,
    is_installed: true,
  },
  {
    path: '/models/Lora/path-derived.safetensors',
    name: '',
    modified_at: '2025-12-31T12:00:00Z',
    is_installed: false,
  },
];

describe('filterAndSortScanResults', () => {
  it('sorts by name ascending', () => {
    const result = filterAndSortScanResults(RESULTS, '', 'name_asc');
    expect(result.map((r) => r.path)).toEqual([
      '/models/Lora/alpha.safetensors',
      '/models/Lora/no-date.safetensors',
      '/models/Lora/path-derived.safetensors',
      '/models/Lora/zulu.safetensors',
    ]);
  });

  it('sorts by name descending', () => {
    const result = filterAndSortScanResults(RESULTS, '', 'name_desc');
    expect(result.map((r) => r.path)).toEqual([
      '/models/Lora/zulu.safetensors',
      '/models/Lora/path-derived.safetensors',
      '/models/Lora/no-date.safetensors',
      '/models/Lora/alpha.safetensors',
    ]);
  });

  it('sorts by modified date newest first and pushes missing timestamps to the end', () => {
    const result = filterAndSortScanResults(RESULTS, '', 'modified_desc');
    expect(result.map((r) => r.path)).toEqual([
      '/models/Lora/alpha.safetensors',
      '/models/Lora/zulu.safetensors',
      '/models/Lora/path-derived.safetensors',
      '/models/Lora/no-date.safetensors',
    ]);
  });

  it('sorts by modified date oldest first and pushes missing timestamps to the end', () => {
    const result = filterAndSortScanResults(RESULTS, '', 'modified_asc');
    expect(result.map((r) => r.path)).toEqual([
      '/models/Lora/path-derived.safetensors',
      '/models/Lora/zulu.safetensors',
      '/models/Lora/alpha.safetensors',
      '/models/Lora/no-date.safetensors',
    ]);
  });

  it('applies search before sorting', () => {
    const result = filterAndSortScanResults(RESULTS, 'alpha', 'modified_desc');
    expect(result.map((r) => r.path)).toEqual(['/models/Lora/alpha.safetensors']);
  });
});
