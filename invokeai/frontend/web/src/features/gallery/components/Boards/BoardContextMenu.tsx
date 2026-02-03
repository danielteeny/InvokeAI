import type { ContextMenuProps } from '@invoke-ai/ui-library';
import { ContextMenu, MenuGroup, MenuItem, MenuList } from '@invoke-ai/ui-library';
import { createSelector } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { $boardForAutoAssignment } from 'features/gallery/components/Boards/AutoAssignmentRulesModal';
import { $boardToDelete } from 'features/gallery/components/Boards/DeleteBoardModal';
import { $boardToMove } from 'features/gallery/components/Boards/MoveBoardModal';
import { selectAutoAddBoardId, selectAutoAssignBoardOnClick } from 'features/gallery/store/gallerySelectors';
import { autoAddBoardIdChanged } from 'features/gallery/store/gallerySlice';
import { toast } from 'features/toast/toast';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PiArchiveBold,
  PiArchiveFill,
  PiCheckBold,
  PiDownloadBold,
  PiEyeSlashBold,
  PiFolderBold,
  PiFolderPlusBold,
  PiGearBold,
  PiPlusBold,
  PiTrashSimpleBold,
} from 'react-icons/pi';
import { useGetRulesForBoardQuery } from 'services/api/endpoints/boardAssignment';
import {
  useCreateBoardMutation,
  useMarkImagesAsSeenMutation,
  useMarkImagesAsUnseenMutation,
  useUpdateBoardMutation,
} from 'services/api/endpoints/boards';
import { useBulkDownloadImagesMutation } from 'services/api/endpoints/images';
import { useBoardName } from 'services/api/hooks/useBoardName';
import type { BoardDTO } from 'services/api/types';

type Props = {
  board: BoardDTO;
  children: ContextMenuProps<HTMLDivElement>['children'];
};

const BoardContextMenu = ({ board, children }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const autoAssignBoardOnClick = useAppSelector(selectAutoAssignBoardOnClick);
  const selectIsSelectedForAutoAdd = useMemo(
    () => createSelector(selectAutoAddBoardId, (autoAddBoardId) => board.board_id === autoAddBoardId),
    [board.board_id]
  );

  const [updateBoard] = useUpdateBoardMutation();
  const [markImagesAsSeen] = useMarkImagesAsSeenMutation();
  const [markImagesAsUnseen] = useMarkImagesAsUnseenMutation();
  const [createBoard, { isLoading: isCreatingSubfolder }] = useCreateBoardMutation();
  const { data: rules } = useGetRulesForBoardQuery(board.board_id);
  const rulesCount = rules?.length ?? 0;
  const unseenCount = board.unseen_count ?? 0;
  const totalImageCount = board.image_count + board.asset_count;

  const isSelectedForAutoAdd = useAppSelector(selectIsSelectedForAutoAdd);
  const boardName = useBoardName(board.board_id);

  const [bulkDownload] = useBulkDownloadImagesMutation();

  const handleSetAutoAdd = useCallback(() => {
    dispatch(autoAddBoardIdChanged(board.board_id));
  }, [board.board_id, dispatch]);

  const handleBulkDownload = useCallback(() => {
    bulkDownload({ image_names: [], board_id: board.board_id });
  }, [board.board_id, bulkDownload]);

  const handleArchive = useCallback(async () => {
    try {
      await updateBoard({
        board_id: board.board_id,
        changes: { archived: true },
      }).unwrap();
    } catch {
      toast({
        status: 'error',
        title: 'Unable to archive board',
      });
    }
  }, [board.board_id, updateBoard]);

  const handleUnarchive = useCallback(() => {
    updateBoard({
      board_id: board.board_id,
      changes: { archived: false },
    });
  }, [board.board_id, updateBoard]);

  const setAsBoardToDelete = useCallback(() => {
    $boardToDelete.set(board);
  }, [board]);

  const handleMarkAsSeen = useCallback(async () => {
    try {
      await markImagesAsSeen({ board_id: board.board_id }).unwrap();
      toast({
        status: 'success',
        title: t('boards.markedAsSeen'),
      });
    } catch {
      toast({
        status: 'error',
        title: t('boards.unableToMarkAsSeen'),
      });
    }
  }, [board.board_id, markImagesAsSeen, t]);

  const handleMarkAsUnseen = useCallback(async () => {
    try {
      await markImagesAsUnseen({ board_id: board.board_id }).unwrap();
      toast({
        status: 'success',
        title: t('boards.markedAsUnseen'),
      });
    } catch {
      toast({
        status: 'error',
        title: t('boards.unableToMarkAsUnseen'),
      });
    }
  }, [board.board_id, markImagesAsUnseen, t]);

  const handleManageAutoAssignmentRules = useCallback(() => {
    $boardForAutoAssignment.set(board);
  }, [board]);

  const handleMoveTo = useCallback(() => {
    $boardToMove.set(board);
  }, [board]);

  const handleAddSubfolder = useCallback(async () => {
    try {
      // Create a new board as a child of this board
      await createBoard({ board_name: t('boards.newSubfolder'), parent_board_id: board.board_id }).unwrap();
      toast({
        status: 'success',
        title: t('boards.subfolderCreated'),
      });
    } catch {
      toast({
        status: 'error',
        title: t('boards.createSubfolderError'),
      });
    }
  }, [board.board_id, createBoard, t]);

  const renderMenuFunc = useCallback(
    () => (
      <MenuList visibility="visible">
        <MenuGroup title={boardName}>
          {!autoAssignBoardOnClick && (
            <MenuItem icon={<PiPlusBold />} isDisabled={isSelectedForAutoAdd} onClick={handleSetAutoAdd}>
              {isSelectedForAutoAdd ? t('boards.selectedForAutoAdd') : t('boards.menuItemAutoAdd')}
            </MenuItem>
          )}

          <MenuItem icon={<PiDownloadBold />} onClickCapture={handleBulkDownload}>
            {t('boards.downloadBoard')}
          </MenuItem>

          <MenuItem icon={<PiGearBold />} onClick={handleManageAutoAssignmentRules}>
            {t('boards.manageAutoAssignmentRules')} {rulesCount > 0 && `(${rulesCount})`}
          </MenuItem>

          <MenuItem icon={<PiFolderBold />} onClick={handleMoveTo}>
            {t('boards.moveTo')}
          </MenuItem>

          <MenuItem icon={<PiFolderPlusBold />} onClick={handleAddSubfolder} isDisabled={isCreatingSubfolder}>
            {t('boards.addSubfolder')}
          </MenuItem>

          {unseenCount > 0 && (
            <MenuItem icon={<PiCheckBold />} onClick={handleMarkAsSeen}>
              {t('boards.markAllAsSeen')} ({unseenCount})
            </MenuItem>
          )}

          {totalImageCount > 0 && unseenCount < totalImageCount && (
            <MenuItem icon={<PiEyeSlashBold />} onClick={handleMarkAsUnseen}>
              {t('boards.markAllAsUnseen')}
            </MenuItem>
          )}

          {board.archived && (
            <MenuItem icon={<PiArchiveBold />} onClick={handleUnarchive}>
              {t('boards.unarchiveBoard')}
            </MenuItem>
          )}

          {!board.archived && (
            <MenuItem icon={<PiArchiveFill />} onClick={handleArchive}>
              {t('boards.archiveBoard')}
            </MenuItem>
          )}

          <MenuItem color="error.300" icon={<PiTrashSimpleBold />} onClick={setAsBoardToDelete} isDestructive>
            {t('boards.deleteBoard')}
          </MenuItem>
        </MenuGroup>
      </MenuList>
    ),
    [
      boardName,
      autoAssignBoardOnClick,
      isSelectedForAutoAdd,
      handleSetAutoAdd,
      t,
      handleBulkDownload,
      handleManageAutoAssignmentRules,
      handleMoveTo,
      handleAddSubfolder,
      isCreatingSubfolder,
      rulesCount,
      unseenCount,
      totalImageCount,
      handleMarkAsSeen,
      handleMarkAsUnseen,
      board.archived,
      handleUnarchive,
      handleArchive,
      setAsBoardToDelete,
    ]
  );

  return <ContextMenu renderMenu={renderMenuFunc}>{children}</ContextMenu>;
};

export default memo(BoardContextMenu);
