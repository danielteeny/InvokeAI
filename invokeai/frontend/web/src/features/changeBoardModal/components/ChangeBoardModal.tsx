import type { ComboboxOnChange } from '@invoke-ai/ui-library';
import { Combobox, ConfirmationAlertDialog, Flex, FormControl, Text } from '@invoke-ai/ui-library';
import { createSelector } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { useAssertSingleton } from 'common/hooks/useAssertSingleton';
import {
  changeBoardReset,
  isModalOpenChanged,
  selectChangeBoardModalSlice,
} from 'features/changeBoardModal/store/slice';
import { BoardOption } from 'features/gallery/components/Boards/BoardComboboxOption';
import { selectSelectedBoardId } from 'features/gallery/store/gallerySelectors';
import type { BoardComboboxOption } from 'features/gallery/util/boardTreeUtils';
import { boardsToHierarchicalOptionsWithDepth } from 'features/gallery/util/boardTreeUtils';
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
      if (boardId === 'none') {
        return t('boards.uncategorized');
      }
      if (!boards) {
        return '';
      }

      const board = boards.find((b) => b.board_id === boardId);
      if (!board) {
        return '';
      }

      // Build breadcrumb from path
      const pathIds = board.path?.split('/').filter(Boolean) ?? [];
      const breadcrumbNames = pathIds.map((id) => boards.find((b) => b.board_id === id)?.board_name).filter(Boolean);
      breadcrumbNames.push(board.board_name);

      return breadcrumbNames.join(' > ');
    },
    [boards, t]
  );

  const options = useMemo<BoardComboboxOption[]>(() => {
    const uncategorizedOption: BoardComboboxOption = { label: t('boards.uncategorized'), value: 'none', depth: 0 };
    if (!boards) {
      return [uncategorizedOption];
    }

    const hierarchicalOptions = boardsToHierarchicalOptionsWithDepth(boards);

    return [uncategorizedOption, ...hierarchicalOptions].filter((board) => board.value !== currentBoardId);
  }, [boards, currentBoardId, t]);

  // For the selected value, show breadcrumbs instead of tree prefix
  const value = useMemo(() => {
    if (!selectedBoardId) {
      return undefined;
    }
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
            components={{ Option: BoardOption }}
          />
        </FormControl>
      </Flex>
    </ConfirmationAlertDialog>
  );
};

export default memo(ChangeBoardModal);
