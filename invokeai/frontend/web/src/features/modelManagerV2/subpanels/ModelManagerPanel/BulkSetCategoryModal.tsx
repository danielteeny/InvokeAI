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
  Text,
} from '@invoke-ai/ui-library';
import { LORA_CATEGORIES_ORDER, LORA_CATEGORY_TO_NAME } from 'features/modelManagerV2/models';
import type { ChangeEvent } from 'react';
import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
                  <Select value={selectedCategory} onChange={handleCategoryChange}>
                    {LORA_CATEGORIES_ORDER.map((categoryId) => (
                      <option key={categoryId} value={categoryId}>
                        {LORA_CATEGORY_TO_NAME[categoryId] ?? categoryId}
                      </option>
                    ))}
                  </Select>
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
