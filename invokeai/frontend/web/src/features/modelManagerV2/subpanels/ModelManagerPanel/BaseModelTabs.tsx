import { Badge, Button, Flex, HStack } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { MODEL_BASE_TO_SHORT_NAME } from 'features/modelManagerV2/models';
import { selectSelectedBaseModel, setSelectedBaseModel } from 'features/modelManagerV2/store/modelManagerV2Slice';
import type { BaseModelType } from 'features/nodes/types/common';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnyModelConfig } from 'services/api/types';

// Hex colors for base model types (matching the theme colors)
const BASE_MODEL_HEX_COLORS: Record<string, string> = {
  'sd-1': '#48BB78', // green
  'sd-2': '#38B2AC', // teal
  'sd-3': '#9F7AEA', // purple
  sdxl: '#4299E1', // invokeBlue
  'sdxl-refiner': '#4299E1', // invokeBlue
  flux: '#D69E2E', // gold
  flux2: '#D69E2E', // gold
  cogview4: '#F56565', // red
  'z-image': '#00B5D8', // cyan
  any: '#A0AEC0', // base
  unknown: '#F56565', // red
};

type BaseModelTagProps = {
  baseModel: BaseModelType;
  count: number;
  isSelected: boolean;
};

const BaseModelTag = memo(({ baseModel, count, isSelected }: BaseModelTagProps) => {
  const dispatch = useAppDispatch();
  const hexColor = BASE_MODEL_HEX_COLORS[baseModel] ?? '#A0AEC0';
  const displayName = MODEL_BASE_TO_SHORT_NAME[baseModel] ?? baseModel;

  const handleClick = useCallback(() => {
    dispatch(setSelectedBaseModel(baseModel));
  }, [dispatch, baseModel]);

  // Match the Picker dropdown styling exactly
  const bg = isSelected ? hexColor : 'transparent';
  const color = isSelected ? undefined : 'base.200';

  return (
    <Badge
      role="button"
      size="xs"
      variant="solid"
      userSelect="none"
      bg={bg}
      color={color}
      borderColor={hexColor}
      borderWidth={1}
      onClick={handleClick}
      flexShrink={0}
      whiteSpace="nowrap"
    >
      {displayName} ({count})
    </Badge>
  );
});

BaseModelTag.displayName = 'BaseModelTag';

type Props = {
  modelConfigs: AnyModelConfig[];
};

export const BaseModelTabs = memo(({ modelConfigs }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedBaseModel = useAppSelector(selectSelectedBaseModel);

  // Count models per base model type
  const baseModelCounts = useMemo(() => {
    const counts: Partial<Record<BaseModelType, number>> = {};
    for (const model of modelConfigs) {
      const base = model.base as BaseModelType;
      counts[base] = (counts[base] ?? 0) + 1;
    }
    return counts;
  }, [modelConfigs]);

  // Get base models that have models, in a consistent order
  const availableBaseModels = useMemo(() => {
    const orderedBases: BaseModelType[] = [
      'flux',
      'flux2',
      'sdxl',
      'sdxl-refiner',
      'sd-1',
      'sd-2',
      'sd-3',
      'cogview4',
      'z-image',
      'any',
      'unknown',
    ];
    return orderedBases.filter((base) => (baseModelCounts[base] ?? 0) > 0);
  }, [baseModelCounts]);

  const handleSelectAll = useCallback(() => {
    dispatch(setSelectedBaseModel(null));
  }, [dispatch]);

  const totalCount = modelConfigs.length;

  if (availableBaseModels.length <= 1) {
    return null;
  }

  return (
    <Flex overflowX="auto" maxW="full" pb={1}>
      <HStack gap={1} py={1} px={1} flexShrink={0}>
        <Button
          size="xs"
          variant={selectedBaseModel === null ? 'solid' : 'ghost'}
          colorScheme={selectedBaseModel === null ? 'invokeBlue' : 'base'}
          onClick={handleSelectAll}
          flexShrink={0}
        >
          {t('common.all')} ({totalCount})
        </Button>
        {availableBaseModels.map((baseModel) => (
          <BaseModelTag
            key={baseModel}
            baseModel={baseModel}
            count={baseModelCounts[baseModel] ?? 0}
            isSelected={selectedBaseModel === baseModel}
          />
        ))}
      </HStack>
    </Flex>
  );
});

BaseModelTabs.displayName = 'BaseModelTabs';
