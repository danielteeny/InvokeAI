import { Box, Button, Flex, FormControl, FormLabel, Input, Menu, MenuButton, MenuItem, MenuList } from '@invoke-ai/ui-library';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PiCaretDownBold } from 'react-icons/pi';

// Available color options for categories (hex values - optimized for dark UI readability)
const CATEGORY_COLORS = [
  { value: '#F06292', label: 'Pink' },
  { value: '#EC407A', label: 'Magenta' },
  { value: '#BA68C8', label: 'Red-Violet' },
  { value: '#AB47BC', label: 'Purple' },
  { value: '#9575CD', label: 'Violet' },
  { value: '#7986CB', label: 'Indigo' },
  { value: '#42A5F5', label: 'Blue' },
  { value: '#29B6F6', label: 'Light Blue' },
  { value: '#26C6DA', label: 'Cyan' },
  { value: '#26A69A', label: 'Teal' },
  { value: '#66BB6A', label: 'Forest Green' },
  { value: '#81C784', label: 'Green' },
  { value: '#AED581', label: 'Light Green' },
  { value: '#D4E157', label: 'Lime' },
  { value: '#FFEE58', label: 'Yellow' },
  { value: '#FFCA28', label: 'Amber' },
  { value: '#FFA726', label: 'Tangerine' },
  { value: '#FF7043', label: 'Orange' },
  { value: '#EF5350', label: 'Red' },
  { value: '#E57373', label: 'Crimson' },
  { value: '#A1887F', label: 'Brown' },
  { value: '#BDBDBD', label: 'Gray' },
  { value: '#90A4AE', label: 'Blue-Gray' },
  { value: '#9E9E9E', label: 'Dark Gray' },
  { value: '#EA3323', label: 'Inverted Red' },
] as const;

// Convert hex to rgba with alpha for subtle backgrounds
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type ColorMenuItemProps = {
  colorOption: (typeof CATEGORY_COLORS)[number];
  isSelected: boolean;
  onSelect: (value: string) => void;
};

const ColorMenuItem = memo(({ colorOption, isSelected, onSelect }: ColorMenuItemProps) => {
  const handleClick = useCallback(() => {
    onSelect(colorOption.value);
  }, [colorOption.value, onSelect]);

  return (
    <MenuItem
      onClick={handleClick}
      bg={isSelected ? hexToRgba(colorOption.value, 0.3) : 'transparent'}
      color={colorOption.value}
      borderLeftWidth={3}
      borderLeftColor={colorOption.value}
      _hover={{ bg: hexToRgba(colorOption.value, 0.2) }}
    >
      {colorOption.label}
    </MenuItem>
  );
});
ColorMenuItem.displayName = 'ColorMenuItem';

type Props = {
  initialName?: string;
  initialColor?: string;
  onSubmit: (name: string, color: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
};

export const LoraCategoryForm = memo(
  ({ initialName = '', initialColor = '#E91E8C', onSubmit, onCancel, isLoading = false, submitLabel }: Props) => {
    const { t } = useTranslation();
    const [name, setName] = useState(initialName);
    const [color, setColor] = useState(initialColor);

    const handleSubmit = useCallback(() => {
      if (name.trim()) {
        onSubmit(name.trim(), color);
      }
    }, [name, color, onSubmit]);

    const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    }, []);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Enter' && name.trim()) {
          handleSubmit();
        } else if (e.key === 'Escape') {
          onCancel();
        }
      },
      [handleSubmit, onCancel, name]
    );

    return (
      <Flex flexDir="column" gap={3}>
        <FormControl>
          <FormLabel>{t('modelManager.categoryName')}</FormLabel>
          <Input
            value={name}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            placeholder={t('modelManager.categoryNamePlaceholder')}
            autoFocus
          />
        </FormControl>
        <FormControl>
          <FormLabel>{t('modelManager.categoryColor')}</FormLabel>
          <Flex gap={2} alignItems="center">
            <Box w={6} h={6} borderRadius="md" bg={color} flexShrink={0} />
            <Menu>
              <MenuButton
                as={Button}
                size="sm"
                variant="outline"
                rightIcon={<PiCaretDownBold />}
                w="full"
                textAlign="left"
                color={color}
                borderColor={hexToRgba(color, 0.4)}
              >
                {CATEGORY_COLORS.find((c) => c.value === color)?.label ?? 'Select color'}
              </MenuButton>
              <MenuList maxH="300px" overflowY="auto">
                {CATEGORY_COLORS.map((c) => (
                  <ColorMenuItem
                    key={c.value}
                    colorOption={c}
                    isSelected={color === c.value}
                    onSelect={setColor}
                  />
                ))}
              </MenuList>
            </Menu>
          </Flex>
        </FormControl>
        <Flex gap={2} justifyContent="flex-end">
          <Button onClick={onCancel} isDisabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button colorScheme="invokeBlue" onClick={handleSubmit} isLoading={isLoading} isDisabled={!name.trim()}>
            {submitLabel ?? t('common.save')}
          </Button>
        </Flex>
      </Flex>
    );
  }
);

LoraCategoryForm.displayName = 'LoraCategoryForm';
