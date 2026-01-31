import {
  Button,
  Divider,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useToast,
} from '@invoke-ai/ui-library';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PiPlusBold } from 'react-icons/pi';
import {
  useCreateLoraCategoryMutation,
  useDeleteLoraCategoryMutation,
  useListLoraCategoriesQuery,
  useUpdateLoraCategoryMutation,
} from 'services/api/endpoints/loraCategories';

import { LoraCategoryForm } from './LoraCategoryForm';
import { LoraCategoryItem } from './LoraCategoryItem';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const LoraCategoryManagerModal = memo(({ isOpen, onClose }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: categories, isLoading, error: listError } = useListLoraCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useCreateLoraCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateLoraCategoryMutation();
  const [deleteCategory] = useDeleteLoraCategoryMutation();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddNew = useCallback(() => {
    setIsAddingNew(true);
  }, []);

  const handleCancelAdd = useCallback(() => {
    setIsAddingNew(false);
  }, []);

  const handleCreate = useCallback(
    async (name: string, color: string) => {
      try {
        await createCategory({ name, color }).unwrap();
        setIsAddingNew(false);
        toast({
          title: t('modelManager.categoryCreated', { defaultValue: 'Category created' }),
          status: 'success',
        });
      } catch {
        toast({
          title: t('modelManager.categoryCreateFailed', { defaultValue: 'Failed to create category' }),
          status: 'error',
        });
      }
    },
    [createCategory, toast, t]
  );

  const handleUpdate = useCallback(
    async (id: string, name: string, color: string) => {
      try {
        await updateCategory({ id, changes: { name, color } }).unwrap();
        toast({
          title: t('modelManager.categoryUpdatedSingle', { defaultValue: 'Category updated' }),
          status: 'success',
        });
      } catch {
        toast({
          title: t('modelManager.categoryUpdateFailedSingle', { defaultValue: 'Failed to update category' }),
          status: 'error',
        });
      }
    },
    [updateCategory, toast, t]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteCategory(id).unwrap();
        toast({
          title: t('modelManager.categoryDeleted', { defaultValue: 'Category deleted' }),
          status: 'success',
        });
      } catch {
        toast({
          title: t('modelManager.categoryDeleteFailed', { defaultValue: 'Failed to delete category' }),
          status: 'error',
        });
      } finally {
        setDeletingId(null);
      }
    },
    [deleteCategory, toast, t]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('modelManager.manageCategories')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex flexDir="column" gap={3}>
            <Text color="base.400" fontSize="sm">
              {t('modelManager.manageCategoriesDescription')}
            </Text>

            {isLoading ? (
              <Flex justifyContent="center" py={4}>
                <Spinner />
              </Flex>
            ) : listError ? (
              <Text color="error.300" fontSize="sm">
                {t('modelManager.categoryLoadError', {
                  defaultValue: 'Failed to load categories. Please restart InvokeAI to enable custom categories.',
                })}
              </Text>
            ) : (
              <Flex flexDir="column" gap={2}>
                {categories?.map((category) => (
                  <LoraCategoryItem
                    key={category.id}
                    category={category}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    isUpdating={isUpdating}
                    isDeleting={deletingId === category.id}
                  />
                ))}
              </Flex>
            )}

            <Divider />

            {isAddingNew ? (
              <Flex
                p={3}
                borderWidth={1}
                borderRadius="base"
                borderColor="invokeBlue.500"
                borderStyle="dashed"
                bg="base.850"
              >
                <LoraCategoryForm
                  onSubmit={handleCreate}
                  onCancel={handleCancelAdd}
                  isLoading={isCreating}
                  submitLabel={t('common.create')}
                />
              </Flex>
            ) : (
              <Button leftIcon={<PiPlusBold />} onClick={handleAddNew} variant="ghost" w="full">
                {t('modelManager.addCategory')}
              </Button>
            )}
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>{t('common.close')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});

LoraCategoryManagerModal.displayName = 'LoraCategoryManagerModal';
