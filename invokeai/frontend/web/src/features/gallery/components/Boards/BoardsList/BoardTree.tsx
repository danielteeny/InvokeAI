import { Box, Collapse, Flex, IconButton, Spinner } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { selectSelectedBoardId } from 'features/gallery/store/gallerySelectors';
import type { MouseEvent } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import { PiCaretDownBold, PiCaretRightBold } from 'react-icons/pi';
import { useGetBoardChildrenQuery } from 'services/api/endpoints/boards';
import type { BoardDTO } from 'services/api/types';

import GalleryBoard from './GalleryBoard';

interface BoardTreeNodeProps {
  board: BoardDTO;
  depth: number;
  isSelected: boolean;
}

/**
 * A single node in the board tree that can be expanded to show children
 */
const BoardTreeNode = memo(({ board, depth, isSelected }: BoardTreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // Always fetch children to know if board has children (needed to show/hide expand button)
  const { data: children, isLoading: isLoadingChildren } = useGetBoardChildrenQuery(board.board_id);

  const hasChildren = (children?.length ?? 0) > 0;
  const indentPx = depth * 16;

  const toggleExpanded = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <Box>
      <Flex alignItems="center" position="relative">
        {/* Indent spacer */}
        <Box w={`${indentPx}px`} flexShrink={0} />

        {/* Expand/collapse button */}
        <Flex w={6} h={12} flexShrink={0} alignItems="center" justifyContent="center">
          {isLoadingChildren ? (
            <Spinner size="xs" />
          ) : hasChildren ? (
            <IconButton
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              icon={isExpanded ? <PiCaretDownBold /> : <PiCaretRightBold />}
              onClick={toggleExpanded}
              size="xs"
              variant="ghost"
              opacity={0.5}
              _hover={{ opacity: 1 }}
            />
          ) : null}
        </Flex>

        {/* Board item */}
        <Box flex={1}>
          <GalleryBoard board={board} isSelected={isSelected} />
        </Box>
      </Flex>

      {/* Children */}
      <Collapse in={isExpanded && hasChildren}>
        <Box>
          {children?.map((child) => (
            <BoardTreeNodeWrapper key={child.board_id} board={child} depth={depth + 1} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
});
BoardTreeNode.displayName = 'BoardTreeNode';

/**
 * Wrapper that handles selection state for a tree node
 */
const BoardTreeNodeWrapper = memo(({ board, depth }: { board: BoardDTO; depth: number }) => {
  const selectedBoardId = useAppSelector(selectSelectedBoardId);
  const isSelected = selectedBoardId === board.board_id;

  return <BoardTreeNode board={board} depth={depth} isSelected={isSelected} />;
});
BoardTreeNodeWrapper.displayName = 'BoardTreeNodeWrapper';

interface BoardTreeProps {
  boards: BoardDTO[];
  searchText?: string;
}

/**
 * Renders boards in a tree structure with expandable folders
 * Root-level boards (no parent) are shown at the top level
 */
export const BoardTree = memo(({ boards, searchText = '' }: BoardTreeProps) => {
  const selectedBoardId = useAppSelector(selectSelectedBoardId);

  // Filter to only root-level boards (no parent)
  const rootBoards = useMemo(() => {
    let filtered = boards.filter((board) => !board.parent_board_id);

    // Apply search filter if present
    if (searchText.length > 0) {
      // When searching, show all matching boards regardless of hierarchy
      filtered = boards.filter((board) => board.board_name.toLowerCase().includes(searchText.toLowerCase()));
    }

    return filtered;
  }, [boards, searchText]);

  // When searching, render as flat list (search shows all matches)
  if (searchText.length > 0) {
    return (
      <Flex direction="column" gap={1}>
        {rootBoards.map((board) => (
          <GalleryBoard key={board.board_id} board={board} isSelected={selectedBoardId === board.board_id} />
        ))}
      </Flex>
    );
  }

  // Normal tree view
  return (
    <Flex direction="column" gap={1}>
      {rootBoards.map((board) => (
        <BoardTreeNodeWrapper key={board.board_id} board={board} depth={0} />
      ))}
    </Flex>
  );
});
BoardTree.displayName = 'BoardTree';
