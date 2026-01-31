import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Select,
  Spinner,
  Text,
} from '@invoke-ai/ui-library';
import { LORA_CATEGORIES_ORDER, LORA_CATEGORY_TO_NAME } from 'features/modelManagerV2/models';
import type { ChangeEvent } from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useListLoraCategoriesQuery } from 'services/api/endpoints/loraCategories';

type BulkSetCategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (category: string) => void;
  modelCount: number;
  isUpdating?: boolean;
};

export const BulkSetCategoryModal = memo(
  ({ isOpen, onClose, onConfirm, modelCount, isUpdating = false }: BulkSetCategoryModalProps) => {
    const { t } = useTranslation();
    const cancelRef = useRef<HTMLButtonElement>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('uncategorized');
    const { data: categories, isLoading: isCategoriesLoading } = useListLoraCategoriesQuery();

    // Build category options from API or fallback to hardcoded
    const categoryOptions = useMemo(() => {
      if (categories) {
        return [{ id: 'uncategorized', name: 'Uncategorized' }, ...categories.filter((c) => c.id !== 'uncategorized')];
      }
      // Fallback to hardcoded values
      return LORA_CATEGORIES_ORDER.map((id) => ({
        id,
        name: LORA_CATEGORY_TO_NAME[id] ?? id,
      }));
    }, [categories]);

    const handleCategoryChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
      setSelectedCategory(e.target.value);
    }, []);

    const handleConfirm = useCallback(() => {
      onConfirm(selectedCategory);
    }, [onConfirm, selectedCategory]);

    const handleClose = useCallback(() => {
      setSelectedCategory('uncategorized');
      onClose();
    }, [onClose]);

    return (
      <AlertDialog isOpen={isOpen} onClose={handleClose} leastDestructiveRef={cancelRef} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('modelManager.setCategory')}
            </AlertDialogHeader>

            <AlertDialogBody>
              <Flex flexDir="column" gap={4}>
                <Text>
                  {t('modelManager.setCategoryDescription', {
                    count: modelCount,
                    defaultValue: `Set the category for ${modelCount} selected model(s).`,
                  })}
                </Text>
                <FormControl>
                  <FormLabel>{t('modelManager.category')}</FormLabel>
                  {isCategoriesLoading ? (
                    <Flex justifyContent="center" py={2}>
                      <Spinner size="sm" />
                    </Flex>
                  ) : (
                    <Select value={selectedCategory} onChange={handleCategoryChange}>
                      {categoryOptions.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </FormControl>
                <Text variant="subtext" color="base.400">
                  {t('modelManager.setCategoryNote', {
                    defaultValue: 'Note: Only LoRA models support categories. Other model types will be skipped.',
                  })}
                </Text>
              </Flex>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleClose} isDisabled={isUpdating}>
                {t('common.cancel')}
              </Button>
              <Button colorScheme="invokeBlue" onClick={handleConfirm} ml={3} isLoading={isUpdating}>
                {t('common.apply')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    );
  }
);

BulkSetCategoryModal.displayName = 'BulkSetCategoryModal';
