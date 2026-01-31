import { Badge, Box, Flex, IconButton, Text } from '@invoke-ai/ui-library';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PiPencilSimpleBold, PiTrashSimpleBold } from 'react-icons/pi';
import type { LoraCategoryDTO } from 'services/api/endpoints/loraCategories';

import { LoraCategoryForm } from './LoraCategoryForm';

// Convert hex to rgba with alpha for subtle background
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type Props = {
  category: LoraCategoryDTO;
  onUpdate: (id: string, name: string, color: string) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
};

export const LoraCategoryItem = memo(
  ({ category, onUpdate, onDelete, isUpdating = false, isDeleting = false }: Props) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);

    const handleEdit = useCallback(() => {
      setIsEditing(true);
    }, []);

    const handleCancelEdit = useCallback(() => {
      setIsEditing(false);
    }, []);

    const handleSubmitEdit = useCallback(
      (name: string, color: string) => {
        onUpdate(category.id, name, color);
        setIsEditing(false);
      },
      [category.id, onUpdate]
    );

    const handleDelete = useCallback(() => {
      onDelete(category.id);
    }, [category.id, onDelete]);

    if (isEditing) {
      return (
        <Flex p={3} borderWidth={1} borderRadius="base" borderColor="base.700" bg="base.850">
          <LoraCategoryForm
            initialName={category.name}
            initialColor={category.color}
            onSubmit={handleSubmitEdit}
            onCancel={handleCancelEdit}
            isLoading={isUpdating}
            submitLabel={t('common.update')}
          />
        </Flex>
      );
    }

    return (
      <Flex
        p={3}
        borderWidth={1}
        borderRadius="base"
        borderColor="base.700"
        bg="base.850"
        alignItems="center"
        justifyContent="space-between"
        gap={3}
      >
        <Flex alignItems="center" gap={3} flex={1} minW={0}>
          <Box w={4} h={4} borderRadius="full" bg={category.color} flexShrink={0} />
          <Badge
            variant="subtle"
            flexShrink={0}
            bg={hexToRgba(category.color, 0.2)}
            color={category.color}
            borderColor={hexToRgba(category.color, 0.4)}
            borderWidth={1}
          >
            {category.name}
          </Badge>
          {category.is_default && (
            <Text fontSize="xs" color="base.500" flexShrink={0}>
              ({t('common.default')})
            </Text>
          )}
        </Flex>
        {!category.is_default && (
          <Flex gap={1} flexShrink={0}>
            <IconButton
              aria-label={t('common.edit')}
              icon={<PiPencilSimpleBold />}
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              isDisabled={isUpdating || isDeleting}
            />
            <IconButton
              aria-label={t('common.delete')}
              icon={<PiTrashSimpleBold />}
              size="sm"
              variant="ghost"
              colorScheme="error"
              onClick={handleDelete}
              isLoading={isDeleting}
              isDisabled={isUpdating}
            />
          </Flex>
        )}
      </Flex>
    );
  }
);

LoraCategoryItem.displayName = 'LoraCategoryItem';
