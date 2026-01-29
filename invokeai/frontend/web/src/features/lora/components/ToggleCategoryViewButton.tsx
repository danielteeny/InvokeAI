import { IconButton, Tooltip } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { loraCategoryViewToggled, selectLoraCategoryViewEnabled } from 'features/controlLayers/store/lorasSlice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiListBold, PiSquaresFourBold } from 'react-icons/pi';

export const ToggleCategoryViewButton = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const categoryViewEnabled = useAppSelector(selectLoraCategoryViewEnabled);

  const handleClick = useCallback(() => {
    dispatch(loraCategoryViewToggled());
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
