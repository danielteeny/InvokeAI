import type { ComboboxOnChange, ComboboxOption } from '@invoke-ai/ui-library';
import { Combobox, ConfirmationAlertDialog, Flex, FormControl, Text } from '@invoke-ai/ui-library';
import { createSelector } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { useAssertSingleton } from 'common/hooks/useAssertSingleton';
import {
  changeBoardReset,
  isModalOpenChanged,
  selectChangeBoardModalSlice,
} from 'features/changeBoardModal/store/slice';
import { selectSelectedBoardId } from 'features/gallery/store/gallerySelectors';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useListAllBoardsQuery } from 'services/api/endpoints/boards';
import { useAddImagesToBoardMutation, useRemoveImagesFromBoardMutation } from 'services/api/endpoints/images';

const selectImagesToChange = createSelector(
  selectChangeBoardModalSlice,
  (changeBoardModal) => changeBoardModal.image_names
);

const selectIsModalOpen = createSelector(
  selectChangeBoardModalSlice,
  (changeBoardModal) => changeBoardModal.isModalOpen
);

const ChangeBoardModal = () => {
  useAssertSingleton('ChangeBoardModal');
  const dispatch = useAppDispatch();
  const currentBoardId = useAppSelector(selectSelectedBoardId);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>();
  const { data: boards, isFetching } = useListAllBoardsQuery({ include_archived: true });
  const isModalOpen = useAppSelector(selectIsModalOpen);
  const imagesToChange = useAppSelector(selectImagesToChange);
  const [addImagesToBoard] = useAddImagesToBoardMutation();
  const [removeImagesFromBoard] = useRemoveImagesFromBoardMutation();
  const { t } = useTranslation();

  // Helper to build breadcrumb path for a board
  const getBreadcrumbLabel = useCallback(
    (boardId: string): string => {
      if (boardId === 'none') return t('boards.uncategorized');
      if (!boards) return '';

      const board = boards.find((b) => b.board_id === boardId);
      if (!board) return '';

      // Build breadcrumb from path
      const pathIds = board.path?.split('/').filter(Boolean) ?? [];
      const breadcrumbNames = pathIds
        .map((id) => boards.find((b) => b.board_id === id)?.board_name)
        .filter(Boolean);
      breadcrumbNames.push(board.board_name);

      return breadcrumbNames.join(' > ');
    },
    [boards, t]
  );

  const options = useMemo<ComboboxOption[]>(() => {
    if (!boards) {
      return [{ label: t('boards.uncategorized'), value: 'none' }];
    }

    // Create a map of board_id to board for quick lookup
    const boardMap = new Map(boards.map((b) => [b.board_id, b]));

    // Helper to get depth from path (e.g., "/parent1/parent2" = depth 2)
    const getDepth = (path?: string | null): number => {
      if (!path) return 0;
      return path.split('/').filter(Boolean).length;
    };

    // Build tree-style prefix with vertical lines
    const getTreePrefix = (board: (typeof boards)[0], sortedBoards: typeof boards): string => {
      const depth = getDepth(board.path);
      if (depth === 0) return '';

      const pathIds = board.path?.split('/').filter(Boolean) ?? [];
      let prefix = '';

      // For each ancestor level, determine if we need a vertical line (│) or space
      for (let level = 0; level < depth; level++) {
        const ancestorId = pathIds[level];
        const ancestor = ancestorId ? boardMap.get(ancestorId) : undefined;

        if (level < depth - 1) {
          // Not the last level - check if this ancestor has siblings after it
          const ancestorSiblings = sortedBoards.filter(
            (b) => b.parent_board_id === ancestor?.parent_board_id
          );
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

    // Sort boards: root boards first (by position), then children under their parents
    const sortedBoards = [...boards].sort((a, b) => {
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
        if (!aSegment || !bSegment) continue;

        const aBoard = boardMap.get(aSegment);
        const bBoard = boardMap.get(bSegment);

        if (aSegment !== bSegment) {
          // Different boards at this level - sort by position, then name
          const aPos = aBoard?.position ?? 0;
          const bPos = bBoard?.position ?? 0;
          if (aPos !== bPos) return aPos - bPos;
          return (aBoard?.board_name ?? '').localeCompare(bBoard?.board_name ?? '');
        }
      }

      // One is ancestor of the other - shorter path (parent) comes first
      return aSegments.length - bSegments.length;
    });

    const hierarchicalOptions = sortedBoards.map((board) => {
      const treePrefix = getTreePrefix(board, sortedBoards);
      return {
        label: `${treePrefix}${board.board_name}`,
        value: board.board_id,
      };
    });

    return [{ label: t('boards.uncategorized'), value: 'none' }]
      .concat(hierarchicalOptions)
      .filter((board) => board.value !== currentBoardId);
  }, [boards, currentBoardId, t]);

  // For the selected value, show breadcrumbs instead of tree prefix
  const value = useMemo(() => {
    if (!selectedBoardId) return undefined;
    return {
      label: getBreadcrumbLabel(selectedBoardId),
      value: selectedBoardId,
    };
  }, [selectedBoardId, getBreadcrumbLabel]);

  const handleClose = useCallback(() => {
    dispatch(changeBoardReset());
    dispatch(isModalOpenChanged(false));
  }, [dispatch]);

  const handleChangeBoard = useCallback(() => {
    if (!selectedBoardId || imagesToChange.length === 0) {
      return;
    }

    if (imagesToChange.length) {
      if (selectedBoardId === 'none') {
        removeImagesFromBoard({ image_names: imagesToChange });
      } else {
        addImagesToBoard({
          image_names: imagesToChange,
          board_id: selectedBoardId,
        });
      }
    }
    dispatch(changeBoardReset());
  }, [addImagesToBoard, dispatch, imagesToChange, removeImagesFromBoard, selectedBoardId]);

  const onChange = useCallback<ComboboxOnChange>((v) => {
    if (!v) {
      return;
    }
    setSelectedBoardId(v.value);
  }, []);

  return (
    <ConfirmationAlertDialog
      isOpen={isModalOpen}
      onClose={handleClose}
      title={t('boards.changeBoard')}
      acceptCallback={handleChangeBoard}
      acceptButtonText={t('boards.move')}
      cancelButtonText={t('boards.cancel')}
      useInert={false}
    >
      <Flex flexDir="column" gap={4}>
        <Text>
          {t('boards.movingImagesToBoard', {
            count: imagesToChange.length,
          })}
        </Text>
        <FormControl isDisabled={isFetching}>
          <Combobox
            placeholder={isFetching ? t('boards.loading') : t('boards.selectBoard')}
            onChange={onChange}
            value={value}
            options={options}
          />
        </FormControl>
      </Flex>
    </ConfirmationAlertDialog>
  );
};

export default memo(ChangeBoardModal);
