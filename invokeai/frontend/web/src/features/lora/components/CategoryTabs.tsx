import { Button, Flex, HStack, Tag, TagLabel } from '@invoke-ai/ui-library';
import type { AppDispatch } from 'app/store/store';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { loraSelectedCategoryChanged, selectLoraSelectedCategory } from 'features/controlLayers/store/lorasSlice';
import { LORA_CATEGORIES_ORDER, LORA_CATEGORY_TO_COLOR, LORA_CATEGORY_TO_NAME } from 'features/modelManagerV2/models';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useListLoraCategoriesQuery } from 'services/api/endpoints/loraCategories';
import type { LoRAModelConfig } from 'services/api/types';

// Type for LoRA config with optional category field (until OpenAPI schema is regenerated)
type LoRAModelConfigWithCategory = LoRAModelConfig & { category?: string | null };

// Convert hex to rgba with alpha
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type CategoryTagProps = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  count: number;
  isSelected: boolean;
  dispatch: AppDispatch;
};

const CategoryTag = memo(
  ({ categoryId, categoryName, categoryColor, count, isSelected, dispatch }: CategoryTagProps) => {
    const handleClick = useCallback(() => {
      dispatch(loraSelectedCategoryChanged(categoryId));
    }, [dispatch, categoryId]);

    return (
      <Tag
        size="sm"
        variant="subtle"
        cursor="pointer"
        onClick={handleClick}
        flexShrink={0}
        whiteSpace="nowrap"
        bg={isSelected ? categoryColor : hexToRgba(categoryColor, 0.2)}
        color={isSelected ? 'white' : categoryColor}
        borderColor={hexToRgba(categoryColor, 0.4)}
        borderWidth={1}
        _hover={{ opacity: 0.8 }}
      >
        <TagLabel>
          {categoryName} ({count})
        </TagLabel>
      </Tag>
    );
  }
);

CategoryTag.displayName = 'CategoryTag';

type Props = {
  loraConfigs: LoRAModelConfig[];
};

export const CategoryTabs = memo(({ loraConfigs }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedCategory = useAppSelector(selectLoraSelectedCategory);
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
          name: LORA_CATEGORY_TO_NAME[id] ?? id,
          color: LORA_CATEGORY_TO_COLOR[id] ?? 'base',
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
        {availableCategories.map((categoryId) => {
          const info = categoryInfoMap[categoryId] ?? { name: categoryId, color: '#9E9E9E' };
          return (
            <CategoryTag
              key={categoryId}
              categoryId={categoryId}
              categoryName={info.name}
              categoryColor={info.color}
              count={categoryCounts[categoryId] ?? 0}
              isSelected={selectedCategory === categoryId}
              dispatch={dispatch}
            />
          );
        })}
      </HStack>
    </Flex>
  );
});

CategoryTabs.displayName = 'CategoryTabs';
