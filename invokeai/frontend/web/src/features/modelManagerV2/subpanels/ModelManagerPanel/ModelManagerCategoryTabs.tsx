import { Badge, Button, Flex, HStack } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { LORA_CATEGORIES_ORDER, LORA_CATEGORY_TO_COLOR, LORA_CATEGORY_TO_NAME } from 'features/modelManagerV2/models';
import { selectSelectedLoraCategory, setSelectedLoraCategory } from 'features/modelManagerV2/store/modelManagerV2Slice';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useListLoraCategoriesQuery } from 'services/api/endpoints/loraCategories';
import type { LoRAModelConfig } from 'services/api/types';

// Type for LoRA config with optional category field (until OpenAPI schema is regenerated)
type LoRAModelConfigWithCategory = LoRAModelConfig & { category?: string | null };

type CategoryBadgeProps = {
  categoryId: string;
  name: string;
  color: string;
  count: number;
  isSelected: boolean;
};

const CategoryBadge = memo(({ categoryId, name, color, count, isSelected }: CategoryBadgeProps) => {
  const dispatch = useAppDispatch();

  const handleClick = useCallback(() => {
    dispatch(setSelectedLoraCategory(categoryId));
  }, [dispatch, categoryId]);

  return (
    <Badge
      role="button"
      size="xs"
      variant="solid"
      userSelect="none"
      cursor="pointer"
      bg={isSelected ? color : 'transparent'}
      color={isSelected ? undefined : 'base.200'}
      borderColor={color}
      borderWidth={1}
      onClick={handleClick}
      flexShrink={0}
      whiteSpace="nowrap"
    >
      {name} ({count})
    </Badge>
  );
});

CategoryBadge.displayName = 'CategoryBadge';

type Props = {
  loraConfigs: LoRAModelConfig[];
};

export const ModelManagerCategoryTabs = memo(({ loraConfigs }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedCategory = useAppSelector(selectSelectedLoraCategory);
  const { data: categories } = useListLoraCategoriesQuery();

  // Count LoRAs per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { uncategorized: 0 };
    for (const lora of loraConfigs as LoRAModelConfigWithCategory[]) {
      const category = lora.category ?? 'uncategorized';
      counts[category] = (counts[category] ?? 0) + 1;
    }
    return counts;
  }, [loraConfigs]);

  // Build category info map from API or fallback to hardcoded
  const categoryInfoMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    if (categories) {
      for (const cat of categories) {
        map[cat.id] = { name: cat.name, color: cat.color };
      }
    }
    // Always include hardcoded as fallback
    for (const id of LORA_CATEGORIES_ORDER) {
      if (!map[id]) {
        map[id] = {
          name: LORA_CATEGORY_TO_NAME[id] ?? 'Unknown',
          color: LORA_CATEGORY_TO_COLOR[id] ?? '#9E9E9E',
        };
      }
    }
    return map;
  }, [categories]);

  // Get categories that have LoRAs, ordered by API order then hardcoded order
  const availableCategories = useMemo(() => {
    const allCategoryIds = new Set<string>();

    // Add API categories first (they're already ordered)
    if (categories) {
      for (const cat of categories) {
        if ((categoryCounts[cat.id] ?? 0) > 0) {
          allCategoryIds.add(cat.id);
        }
      }
    }

    // Add any remaining from hardcoded that have counts
    for (const catId of LORA_CATEGORIES_ORDER) {
      if ((categoryCounts[catId] ?? 0) > 0 && !allCategoryIds.has(catId)) {
        allCategoryIds.add(catId);
      }
    }

    // Add any custom categories that have LoRAs but aren't in the default list
    for (const catId of Object.keys(categoryCounts)) {
      if ((categoryCounts[catId] ?? 0) > 0 && !allCategoryIds.has(catId)) {
        allCategoryIds.add(catId);
      }
    }

    return Array.from(allCategoryIds);
  }, [categories, categoryCounts]);

  const handleSelectAll = useCallback(() => {
    dispatch(setSelectedLoraCategory(null));
  }, [dispatch]);

  const totalCount = loraConfigs.length;

  if (availableCategories.length <= 1) {
    return null;
  }

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
        {availableCategories.map((categoryId) => {
          // If category not found in API or hardcoded, show "Unknown" instead of raw UUID
          const info = categoryInfoMap[categoryId] ?? { name: 'Unknown', color: '#9E9E9E' };
          return (
            <CategoryBadge
              key={categoryId}
              categoryId={categoryId}
              name={info.name}
              color={info.color}
              count={categoryCounts[categoryId] ?? 0}
              isSelected={selectedCategory === categoryId}
            />
          );
        })}
      </HStack>
    </Flex>
  );
});

ModelManagerCategoryTabs.displayName = 'ModelManagerCategoryTabs';
