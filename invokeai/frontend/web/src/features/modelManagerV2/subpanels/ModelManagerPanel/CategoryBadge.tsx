import { Badge } from '@invoke-ai/ui-library';
import { LORA_CATEGORY_TO_COLOR, LORA_CATEGORY_TO_NAME } from 'features/modelManagerV2/models';
import { memo, useMemo } from 'react';
import { useListLoraCategoriesQuery } from 'services/api/endpoints/loraCategories';

type Props = {
  category: string | null | undefined;
};

// Convert hex to rgba with alpha for subtle background
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const CategoryBadge = memo(({ category }: Props) => {
  const { data: categories } = useListLoraCategoriesQuery();
  const categoryId = category ?? 'uncategorized';

  const { color, displayName } = useMemo(() => {
    // First try to find in API categories
    if (categories) {
      const found = categories.find((c) => c.id === categoryId);
      if (found) {
        return { color: found.color, displayName: found.name };
      }
    }
    // Fallback to hardcoded values (also hex now)
    const fallbackColor = LORA_CATEGORY_TO_COLOR[categoryId] ?? '#9E9E9E';
    const fallbackName = LORA_CATEGORY_TO_NAME[categoryId] ?? categoryId;
    return { color: fallbackColor, displayName: fallbackName };
  }, [categories, categoryId]);

  return (
    <Badge
      size="xs"
      variant="subtle"
      bg={hexToRgba(color, 0.2)}
      color={color}
      borderColor={hexToRgba(color, 0.4)}
      borderWidth={1}
    >
      {displayName}
    </Badge>
  );
});

CategoryBadge.displayName = 'CategoryBadge';
