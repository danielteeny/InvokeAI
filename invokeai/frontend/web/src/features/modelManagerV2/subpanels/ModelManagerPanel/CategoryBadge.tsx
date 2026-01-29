import { Badge } from '@invoke-ai/ui-library';
import { LORA_CATEGORY_TO_COLOR, LORA_CATEGORY_TO_NAME } from 'features/modelManagerV2/models';
import { memo } from 'react';

type Props = {
  category: string | null | undefined;
};

export const CategoryBadge = memo(({ category }: Props) => {
  const categoryId = category ?? 'uncategorized';
  const colorScheme = LORA_CATEGORY_TO_COLOR[categoryId] ?? 'base';
  const displayName = LORA_CATEGORY_TO_NAME[categoryId] ?? categoryId;

  return (
    <Badge size="xs" colorScheme={colorScheme} variant="subtle">
      {displayName}
    </Badge>
  );
});

CategoryBadge.displayName = 'CategoryBadge';
