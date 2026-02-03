import { IconButton, Tooltip } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { selectRecursiveFolderView, selectSelectedBoardId } from 'features/gallery/store/gallerySelectors';
import { recursiveFolderViewChanged } from 'features/gallery/store/gallerySlice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiFolderOpenBold, PiFoldersBold } from 'react-icons/pi';
import { useListAllBoardsQuery } from 'services/api/endpoints/boards';

/**
 * Toggle button to switch between recursive folder view (Lightroom-style: show all descendants)
 * and non-recursive view (Finder-style: show only direct contents).
 * Only shown when viewing a board that has children (nested folders).
 */
export const RecursiveViewToggle = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedBoardId = useAppSelector(selectSelectedBoardId);
  const recursiveFolderView = useAppSelector(selectRecursiveFolderView);

  // Check if the current board has children - only show toggle if it does
  const { data: boards } = useListAllBoardsQuery({});
  const hasChildren = selectedBoardId !== 'none' && boards?.some((board) => board.parent_board_id === selectedBoardId);

  const toggleRecursiveView = useCallback(() => {
    dispatch(recursiveFolderViewChanged(!recursiveFolderView));
  }, [dispatch, recursiveFolderView]);

  // Only show when viewing a board with nested children
  if (selectedBoardId === 'none' || !hasChildren) {
    return null;
  }

  return (
    <Tooltip label={recursiveFolderView ? t('gallery.showOnlyDirectContents') : t('gallery.showAllDescendants')}>
      <IconButton
        aria-label={recursiveFolderView ? t('gallery.showOnlyDirectContents') : t('gallery.showAllDescendants')}
        icon={recursiveFolderView ? <PiFoldersBold /> : <PiFolderOpenBold />}
        onClick={toggleRecursiveView}
        size="sm"
        variant="ghost"
        color={recursiveFolderView ? 'invokeBlue.300' : undefined}
      />
    </Tooltip>
  );
});
RecursiveViewToggle.displayName = 'RecursiveViewToggle';
