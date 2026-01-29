import { Button, Flex, HStack, Tag, TagLabel } from '@invoke-ai/ui-library';
import type { AppDispatch } from 'app/store/store';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { loraSelectedCategoryChanged, selectLoraSelectedCategory } from 'features/controlLayers/store/lorasSlice';
import { LORA_CATEGORIES_ORDER, LORA_CATEGORY_TO_COLOR, LORA_CATEGORY_TO_NAME } from 'features/modelManagerV2/models';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { LoRAModelConfig } from 'services/api/types';

// Type for LoRA config with optional category field (until OpenAPI schema is regenerated)
type LoRAModelConfigWithCategory = LoRAModelConfig & { category?: string | null };

type CategoryTagProps = {
  categoryId: string;
  count: number;
  isSelected: boolean;
  dispatch: AppDispatch;
};

const CategoryTag = memo(({ categoryId, count, isSelected, dispatch }: CategoryTagProps) => {
  const colorScheme = LORA_CATEGORY_TO_COLOR[categoryId] ?? 'base';

  const handleClick = useCallback(() => {
    dispatch(loraSelectedCategoryChanged(categoryId));
  }, [dispatch, categoryId]);

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
        {LORA_CATEGORY_TO_NAME[categoryId] ?? categoryId} ({count})
      </TagLabel>
    </Tag>
  );
});

CategoryTag.displayName = 'CategoryTag';

type Props = {
  loraConfigs: LoRAModelConfig[];
};

export const CategoryTabs = memo(({ loraConfigs }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedCategory = useAppSelector(selectLoraSelectedCategory);

  // Count LoRAs per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { uncategorized: 0 };
    for (const lora of loraConfigs as LoRAModelConfigWithCategory[]) {
      const category = lora.category ?? 'uncategorized';
      counts[category] = (counts[category] ?? 0) + 1;
    }
    return counts;
  }, [loraConfigs]);

  // Get categories that have LoRAs
  const availableCategories = useMemo(() => {
    return LORA_CATEGORIES_ORDER.filter((cat) => (categoryCounts[cat] ?? 0) > 0);
  }, [categoryCounts]);

  const handleSelectAll = useCallback(() => {
    dispatch(loraSelectedCategoryChanged(null));
  }, [dispatch]);

  const totalCount = loraConfigs.length;

  return (
    <Flex overflowX="auto" maxW="full" pb={1}>
      <HStack gap={1} py={1} px={1} flexShrink={0}>
        <Button
          size="xs"
          variant={selectedCategory === null ? 'solid' : 'ghost'}
          colorScheme={selectedCategory === null ? 'invokeBlue' : 'base'}
          onClick={handleSelectAll}
          flexShrink={0}
        >
          {t('common.all')} ({totalCount})
        </Button>
        {availableCategories.map((categoryId) => (
          <CategoryTag
            key={categoryId}
            categoryId={categoryId}
            count={categoryCounts[categoryId] ?? 0}
            isSelected={selectedCategory === categoryId}
            dispatch={dispatch}
          />
        ))}
      </HStack>
    </Flex>
  );
});

CategoryTabs.displayName = 'CategoryTabs';
