import type { ComboboxOption } from '@invoke-ai/ui-library';
import { Box, Text } from '@invoke-ai/ui-library';
import type { GroupBase, OptionProps } from 'chakra-react-select';
import type { BoardComboboxOption } from 'features/gallery/util/boardTreeUtils';
import { memo } from 'react';

const INDENT_PX = 12;

type BoardOptionProps = OptionProps<ComboboxOption, false, GroupBase<ComboboxOption>>;

export const BoardOption = memo((props: BoardOptionProps) => {
  const { data, innerRef, innerProps, isSelected, isFocused } = props;
  // Safely access depth property - fallback to 0 if not present
  const depth = (data as BoardComboboxOption).depth ?? 0;
  const paddingLeft = depth * INDENT_PX;

  return (
    <Box
      ref={innerRef}
      ps={`${paddingLeft}px`}
      py={1}
      px={2}
      cursor="pointer"
      bg={isSelected ? 'base.700' : isFocused ? 'base.750' : undefined}
      _hover={{ bg: 'base.700' }}
      {...innerProps}
    >
      <Text userSelect="none">{data.label}</Text>
    </Box>
  );
});

BoardOption.displayName = 'BoardOption';
