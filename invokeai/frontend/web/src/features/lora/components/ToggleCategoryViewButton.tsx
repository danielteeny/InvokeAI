import { IconButton, Tooltip } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { loraCategoryViewToggled, selectLoraCategoryViewEnabled } from 'features/controlLayers/store/lorasSlice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiFoldersBold, PiListBold } from 'react-icons/pi';

export const ToggleCategoryViewButton = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const categoryViewEnabled = useAppSelector(selectLoraCategoryViewEnabled);

  const handleClick = useCallback(() => {
    dispatch(loraCategoryViewToggled());
  }, [dispatch]);

  const label = categoryViewEnabled ? t('models.sortLoRAsByCategory') : t('common.list');

  return (
    <Tooltip label={label}>
      <IconButton
        aria-label={label}
        icon={categoryViewEnabled ? <PiFoldersBold /> : <PiListBold />}
        onClick={handleClick}
        variant="ghost"
        size="sm"
      />
    </Tooltip>
  );
});

ToggleCategoryViewButton.displayName = 'ToggleCategoryViewButton';
