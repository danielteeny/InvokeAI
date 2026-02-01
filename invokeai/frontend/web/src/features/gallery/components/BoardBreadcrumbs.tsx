import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, Flex, Icon, Text } from '@invoke-ai/ui-library';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { selectSelectedBoardId } from 'features/gallery/store/gallerySelectors';
import { boardIdSelected } from 'features/gallery/store/gallerySlice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiCaretRightBold, PiHouseBold } from 'react-icons/pi';
import { useGetBoardAncestorsQuery, useListAllBoardsQuery } from 'services/api/endpoints/boards';
import type { BoardDTO } from 'services/api/types';

interface AncestorBreadcrumbProps {
  ancestor: BoardDTO;
  onNavigate: (boardId: string) => void;
}

const AncestorBreadcrumb = memo(({ ancestor, onNavigate }: AncestorBreadcrumbProps) => {
  const handleClick = useCallback(() => {
    onNavigate(ancestor.board_id);
  }, [ancestor.board_id, onNavigate]);

  return (
    <BreadcrumbItem>
      <BreadcrumbLink onClick={handleClick} color="base.400" _hover={{ color: 'base.200' }}>
        {ancestor.board_name}
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
});

AncestorBreadcrumb.displayName = 'AncestorBreadcrumb';

/**
 * Breadcrumb navigation for nested board hierarchy.
 * Shows the path from root to current board, allowing navigation to any ancestor.
 */
export const BoardBreadcrumbs = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedBoardId = useAppSelector(selectSelectedBoardId);

  // Get the current board's details
  const { data: boards } = useListAllBoardsQuery({});
  const currentBoard = boards?.find((b) => b.board_id === selectedBoardId);

  // Get ancestors (parent, grandparent, etc.) if viewing a nested board
  const { data: ancestors } = useGetBoardAncestorsQuery(
    selectedBoardId !== 'none' && currentBoard?.parent_board_id ? selectedBoardId : skipToken
  );

  const navigateToBoard = useCallback(
    (boardId: string | 'none') => {
      dispatch(boardIdSelected({ boardId }));
    },
    [dispatch]
  );

  const navigateToRoot = useCallback(() => {
    navigateToBoard('none');
  }, [navigateToBoard]);

  // Don't show breadcrumbs for root level or "Uncategorized"
  if (selectedBoardId === 'none' || !currentBoard?.parent_board_id) {
    return null;
  }

  return (
    <Flex alignItems="center" gap={1} py={1} px={2} bg="base.850" borderRadius="base">
      <Breadcrumb
        separator={<Icon as={PiCaretRightBold} color="base.500" boxSize={3} />}
        spacing={1}
        fontSize="sm"
      >
        {/* Root/Home */}
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={navigateToRoot}
            color="base.400"
            _hover={{ color: 'base.200' }}
            display="flex"
            alignItems="center"
            gap={1}
          >
            <Icon as={PiHouseBold} boxSize={3} />
            <Text>{t('gallery.allImages')}</Text>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Ancestors */}
        {ancestors?.map((ancestor) => (
          <AncestorBreadcrumb key={ancestor.board_id} ancestor={ancestor} onNavigate={navigateToBoard} />
        ))}

        {/* Current board (not a link) */}
        <BreadcrumbItem isCurrentPage>
          <Text color="base.200" fontWeight="medium">
            {currentBoard.board_name}
          </Text>
        </BreadcrumbItem>
      </Breadcrumb>
    </Flex>
  );
});
BoardBreadcrumbs.displayName = 'BoardBreadcrumbs';
