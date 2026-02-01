import { IconButton, Tooltip } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { selectCategoryViewEnabled, toggleCategoryView } from 'features/modelManagerV2/store/modelManagerV2Slice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiListBold, PiSquaresFourBold } from 'react-icons/pi';

export const ToggleCategoryViewButton = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const categoryViewEnabled = useAppSelector(selectCategoryViewEnabled);

  const handleClick = useCallback(() => {
    dispatch(toggleCategoryView());
  }, [dispatch]);

  return (
    <Tooltip label={categoryViewEnabled ? t('common.list') : t('common.grid')}>
      <IconButton
        aria-label={categoryViewEnabled ? t('common.list') : t('common.grid')}
        icon={categoryViewEnabled ? <PiListBold /> : <PiSquaresFourBold />}
        onClick={handleClick}
        variant="ghost"
        size="sm"
      />
    </Tooltip>
  );
});

ToggleCategoryViewButton.displayName = 'ToggleCategoryViewButton';
