import { Button, Flex, HStack, Tag, TagLabel } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { MODEL_BASE_TO_COLOR, MODEL_BASE_TO_SHORT_NAME } from 'features/modelManagerV2/models';
import { selectSelectedBaseModel, setSelectedBaseModel } from 'features/modelManagerV2/store/modelManagerV2Slice';
import type { BaseModelType } from 'features/nodes/types/common';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnyModelConfig } from 'services/api/types';

type BaseModelTagProps = {
  baseModel: BaseModelType;
  count: number;
  isSelected: boolean;
};

const BaseModelTag = memo(({ baseModel, count, isSelected }: BaseModelTagProps) => {
  const dispatch = useAppDispatch();
  const colorScheme = MODEL_BASE_TO_COLOR[baseModel] ?? 'base';
  const displayName = MODEL_BASE_TO_SHORT_NAME[baseModel] ?? baseModel;

  const handleClick = useCallback(() => {
    dispatch(setSelectedBaseModel(baseModel));
  }, [dispatch, baseModel]);

  return (
    <Tag
      size="sm"
      variant={isSelected ? 'solid' : 'subtle'}
      colorScheme={colorScheme}
      cursor="pointer"
      onClick={handleClick}
      flexShrink={0}
      _hover={{ opacity: 0.8 }}
    >
      <TagLabel>
        {displayName} ({count})
      </TagLabel>
    </Tag>
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
