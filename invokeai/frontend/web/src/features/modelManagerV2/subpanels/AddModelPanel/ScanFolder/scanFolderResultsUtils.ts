import type { ScanFolderResponse } from 'services/api/endpoints/models';

export type ScanFolderResult = ScanFolderResponse[number];

export type ScanFolderSortMode = 'name_asc' | 'name_desc' | 'modified_desc' | 'modified_asc';

export const getScanResultName = (result: ScanFolderResult): string => {
  const explicitName = result.name?.trim();
  if (explicitName) {
    return explicitName;
  }

  const normalizedPath = result.path.replace(/\\/g, '/').replace(/\/+$/, '');
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  return lastSlashIndex === -1 ? normalizedPath : normalizedPath.slice(lastSlashIndex + 1);
};

const getScanResultModifiedTimestamp = (result: ScanFolderResult): number | null => {
  if (!result.modified_at) {
    return null;
  }

  const parsed = Date.parse(result.modified_at);
  return Number.isNaN(parsed) ? null : parsed;
};

const compareByName = (a: ScanFolderResult, b: ScanFolderResult): number => {
  const nameDiff = getScanResultName(a).localeCompare(getScanResultName(b), undefined, { sensitivity: 'base' });
  if (nameDiff !== 0) {
    return nameDiff;
  }

  return a.path.localeCompare(b.path, undefined, { sensitivity: 'base' });
};

export const compareScanResults = (a: ScanFolderResult, b: ScanFolderResult, sortMode: ScanFolderSortMode): number => {
  if (sortMode === 'name_asc') {
    return compareByName(a, b);
  }

  if (sortMode === 'name_desc') {
    return compareByName(b, a);
  }

  const aModified = getScanResultModifiedTimestamp(a);
  const bModified = getScanResultModifiedTimestamp(b);

  if (aModified === null && bModified === null) {
    return compareByName(a, b);
  }
  if (aModified === null) {
    return 1;
  }
  if (bModified === null) {
    return -1;
  }

  if (aModified !== bModified) {
    return sortMode === 'modified_desc' ? bModified - aModified : aModified - bModified;
  }

  return compareByName(a, b);
};

export const filterAndSortScanResults = (
  results: ScanFolderResponse,
  searchTerm: string,
  sortMode: ScanFolderSortMode
): ScanFolderResponse => {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredResults = normalizedSearchTerm
    ? results.filter((result) => getScanResultName(result).toLowerCase().includes(normalizedSearchTerm))
    : [...results];

  return filteredResults.sort((a, b) => compareScanResults(a, b, sortMode));
};
