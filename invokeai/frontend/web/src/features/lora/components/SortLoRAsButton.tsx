import { IconButton } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { lorasSortModeChanged, selectLoRASortMode } from 'features/controlLayers/store/lorasSlice';
import React, { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiFoldersBold, PiHandBold, PiSortAscendingBold } from 'react-icons/pi';

const SORT_MODE_CYCLE = {
  manual: 'alphabetical',
  alphabetical: 'category',
  category: 'manual',
} as const;

export const SortLoRAsButton = memo(() => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const sortMode = useAppSelector(selectLoRASortMode);

  // Determine button appearance based on current mode
  const { icon, tooltip } = useMemo(() => {
    switch (sortMode) {
      case 'manual':
        return {
          icon: PiHandBold,
          tooltip: t('models.sortLoRAsManual'),
        };
      case 'alphabetical':
        return {
          icon: PiSortAscendingBold,
          tooltip: t('models.sortLoRAsAlphabetically'),
        };
      case 'category':
        return {
          icon: PiFoldersBold,
          tooltip: t('models.sortLoRAsByCategory'),
        };
    }
  }, [sortMode, t]);

  const handleClick = useCallback(() => {
    const nextMode = SORT_MODE_CYCLE[sortMode];
    dispatch(lorasSortModeChanged(nextMode));
  }, [dispatch, sortMode]);

  return (
    <IconButton
      size="sm"
      variant="ghost"
      onClick={handleClick}
      tooltip={tooltip}
      aria-label={tooltip}
      icon={React.createElement(icon)}
    />
  );
});

SortLoRAsButton.displayName = 'SortLoRAsButton';
