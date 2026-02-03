import { IconButton, Tooltip } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { selectRecursiveFolderView } from 'features/gallery/store/gallerySelectors';
import { recursiveFolderViewChanged } from 'features/gallery/store/gallerySlice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiFolderOpenBold, PiFoldersBold } from 'react-icons/pi';

/**
 * Toggle button to switch between recursive folder view (Lightroom-style: show all descendants)
 * and non-recursive view (Finder-style: show only direct contents).
 * Affects both the gallery image display and the unseen count badges on boards.
 */
export const RecursiveViewToggle = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const recursiveFolderView = useAppSelector(selectRecursiveFolderView);

  const toggleRecursiveView = useCallback(() => {
    dispatch(recursiveFolderViewChanged(!recursiveFolderView));
  }, [dispatch, recursiveFolderView]);

  return (
    <Tooltip label={recursiveFolderView ? t('gallery.showOnlyDirectContents') : t('gallery.showAllDescendants')}>
      <IconButton
        aria-label={recursiveFolderView ? t('gallery.showOnlyDirectContents') : t('gallery.showAllDescendants')}
        icon={recursiveFolderView ? <PiFoldersBold /> : <PiFolderOpenBold />}
        onClick={toggleRecursiveView}
        size="sm"
        variant="link"
        color={recursiveFolderView ? 'invokeBlue.300' : undefined}
      />
    </Tooltip>
  );
});
RecursiveViewToggle.displayName = 'RecursiveViewToggle';
