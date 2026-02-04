import type { ComboboxOption } from '@invoke-ai/ui-library';
import type { BoardDTO } from 'services/api/types';

/**
 * Gets the hierarchy depth from a path string.
 * E.g., "/parent1/parent2" = depth 2
 */
export const getDepth = (path?: string | null): number => {
  if (!path) {
    return 0;
  }
  return path.split('/').filter(Boolean).length;
};

/**
 * Sorts boards hierarchically so parents come before children,
 * and siblings are sorted by position then name.
 */
export const sortBoardsHierarchically = (boards: BoardDTO[]): BoardDTO[] => {
  const boardMap = new Map(boards.map((b) => [b.board_id, b]));

  return [...boards].sort((a, b) => {
    const aPath = a.path ?? '';
    const bPath = b.path ?? '';

    // Compare by full path first (to group children under parents)
    const aFullPath = aPath ? `${aPath}/${a.board_id}` : `/${a.board_id}`;
    const bFullPath = bPath ? `${bPath}/${b.board_id}` : `/${b.board_id}`;

    // Sort by path segments to ensure parents come before children
    const aSegments = aFullPath.split('/').filter(Boolean);
    const bSegments = bFullPath.split('/').filter(Boolean);

    // Compare segment by segment
    for (let i = 0; i < Math.min(aSegments.length, bSegments.length); i++) {
      const aSegment = aSegments[i];
      const bSegment = bSegments[i];
      if (!aSegment || !bSegment) {
        continue;
      }

      const aBoard = boardMap.get(aSegment);
      const bBoard = boardMap.get(bSegment);

      if (aSegment !== bSegment) {
        // Different boards at this level - sort by position, then name
        const aPos = aBoard?.position ?? 0;
        const bPos = bBoard?.position ?? 0;
        if (aPos !== bPos) {
          return aPos - bPos;
        }
        return (aBoard?.board_name ?? '').localeCompare(bBoard?.board_name ?? '');
      }
    }

    // One is ancestor of the other - shorter path (parent) comes first
    return aSegments.length - bSegments.length;
  });
};

/**
 * Builds a tree-style prefix with vertical lines (├─, └─, │) for a board.
 */
export const getTreePrefix = (
  board: BoardDTO,
  sortedBoards: BoardDTO[],
  boardMap: Map<string, BoardDTO>
): string => {
  const depth = getDepth(board.path);
  if (depth === 0) {
    return '';
  }

  const pathIds = board.path?.split('/').filter(Boolean) ?? [];
  let prefix = '';

  // For each ancestor level, determine if we need a vertical line (│) or space
  for (let level = 0; level < depth; level++) {
    const ancestorId = pathIds[level];
    const ancestor = ancestorId ? boardMap.get(ancestorId) : undefined;

    if (level < depth - 1) {
      // Not the last level - check if this ancestor has siblings after it
      const ancestorSiblings = sortedBoards.filter((b) => b.parent_board_id === ancestor?.parent_board_id);
      const ancestorIndex = ancestorSiblings.findIndex((b) => b.board_id === ancestorId);
      const ancestorHasMoreSiblings = ancestorIndex < ancestorSiblings.length - 1;

      prefix += ancestorHasMoreSiblings ? '│ ' : '  ';
    } else {
      // Last level - show branch connector for this board
      const siblings = sortedBoards.filter((b) => b.parent_board_id === board.parent_board_id);
      const isLastChild = siblings[siblings.length - 1]?.board_id === board.board_id;
      prefix += isLastChild ? '└─' : '├─';
    }
  }

  return prefix;
};

/**
 * Converts an array of boards to ComboboxOption[] with tree-style prefixes.
 * Returns boards sorted hierarchically with ASCII tree structure.
 */
export const boardsToHierarchicalOptions = (boards: BoardDTO[]): ComboboxOption[] => {
  const boardMap = new Map(boards.map((b) => [b.board_id, b]));
  const sortedBoards = sortBoardsHierarchically(boards);

  return sortedBoards.map((board) => {
    const treePrefix = getTreePrefix(board, sortedBoards, boardMap);
    return {
      label: `${treePrefix}${board.board_name}`,
      value: board.board_id,
    };
  });
};
