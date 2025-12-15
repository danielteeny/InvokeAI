import { IconButton } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { lorasReordered, lorasSortToggled, selectLoRASortMode } from 'features/controlLayers/store/lorasSlice';
import React, { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiClockCounterClockwiseBold, PiSortAscendingBold } from 'react-icons/pi';
import { useLoRAModels } from 'services/api/hooks/modelsByType';

export const SortLoRAsButton = memo(({ loraIds }: { loraIds: string[] }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const sortMode = useAppSelector(selectLoRASortMode);
  const [modelConfigs] = useLoRAModels();

  // Determine button appearance based on current mode
  const { icon, tooltip } = useMemo(() => {
    if (sortMode === 'order-applied') {
      return {
        icon: PiSortAscendingBold,
        tooltip: t('models.sortLoRAsAlphabetically'),
      };
    }
    return {
      icon: PiClockCounterClockwiseBold,
      tooltip: t('models.sortLoRAsOrderApplied'),
    };
  }, [sortMode, t]);

  const handleToggle = useCallback(() => {
    if (sortMode === 'order-applied') {
      // Switching to alphabetical: toggle mode, then sort
      dispatch(lorasSortToggled());

      // Perform the actual alphabetical sort
      const modelNameMap = new Map(modelConfigs.map((config) => [config.key, config.name]));
      const sortedIds = [...loraIds].sort((idA, idB) => {
        const nameA = (modelNameMap.get(idA) ?? idA).toLowerCase();
        const nameB = (modelNameMap.get(idB) ?? idB).toLowerCase();
        return nameA.localeCompare(nameB);
      });
      dispatch(lorasReordered({ loraIds: sortedIds }));
    } else {
      // Switching back to order-applied: toggle handles restoration
      dispatch(lorasSortToggled());
    }
  }, [dispatch, sortMode, loraIds, modelConfigs]);

  return (
    <IconButton
      size="sm"
      variant="ghost"
      onClick={handleToggle}
      tooltip={tooltip}
      aria-label={tooltip}
      icon={React.createElement(icon)}
    />
  );
});

SortLoRAsButton.displayName = 'SortLoRAsButton';
