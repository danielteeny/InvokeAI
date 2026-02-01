import type { ImageCategory } from 'services/api/types';
import z from 'zod';

const zGalleryView = z.enum(['images', 'assets']);
export type GalleryView = z.infer<typeof zGalleryView>;
const zBoardId = z.string();
// TS hack to get autocomplete for "none" but accept any string
export type BoardId = 'none' | (string & {});
const zComparisonMode = z.enum(['slider', 'side-by-side', 'hover']);
export type ComparisonMode = z.infer<typeof zComparisonMode>;
const zComparisonFit = z.enum(['contain', 'fill']);
export type ComparisonFit = z.infer<typeof zComparisonFit>;
const zOrderDir = z.enum(['ASC', 'DESC']);
export type OrderDir = z.infer<typeof zOrderDir>;
const zBoardRecordOrderBy = z.enum(['created_at', 'board_name']);
export type BoardRecordOrderBy = z.infer<typeof zBoardRecordOrderBy>;

// Gallery mode for performance optimization
const zGalleryMode = z.enum(['infinite-scroll', 'pagination']);
export type GalleryMode = z.infer<typeof zGalleryMode>;
const zPaginationPageSize = z.union([z.literal('auto'), z.literal(20), z.literal(50), z.literal(100)]);
export type PaginationPageSize = z.infer<typeof zPaginationPageSize>;

export const IMAGE_CATEGORIES: ImageCategory[] = ['general'];
export const ASSETS_CATEGORIES: ImageCategory[] = ['control', 'mask', 'user', 'other'];

export const zGalleryState = z.object({
  selection: z.array(z.string()),
  shouldAutoSwitch: z.boolean(),
  autoAssignBoardOnClick: z.boolean(),
  autoAddBoardId: zBoardId,
  galleryImageMinimumWidth: z.number(),
  selectedBoardId: zBoardId,
  galleryView: zGalleryView,
  boardSearchText: z.string(),
  starredFirst: z.boolean(),
  orderDir: zOrderDir,
  searchTerm: z.string(),
  alwaysShowImageSizeBadge: z.boolean(),
  imageToCompare: z.string().nullable(),
  comparisonMode: zComparisonMode,
  comparisonFit: zComparisonFit,
  shouldShowArchivedBoards: z.boolean(),
  boardsListOrderBy: zBoardRecordOrderBy,
  boardsListOrderDir: zOrderDir,
  // Performance mode settings
  galleryMode: zGalleryMode,
  paginationPageSize: zPaginationPageSize,
  currentPage: z.number(),
  // Folder hierarchy settings
  recursiveFolderView: z.boolean(), // true = show all descendants (Lightroom-style), false = show only direct contents (Finder-style)
});

export type GalleryState = z.infer<typeof zGalleryState>;
