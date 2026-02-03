import { Divider, Flex } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { setComparisonImageDndTarget } from 'features/dnd/dnd';
import { DndDropTarget } from 'features/dnd/DndDropTarget';
import { CurrentImagePreview } from 'features/gallery/components/ImageViewer/CurrentImagePreview';
import { selectLastSelectedItem, selectSelectedBoardId } from 'features/gallery/store/gallerySelectors';
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMarkImagesAsSeenMutation } from 'services/api/endpoints/boards';
import { useImageDTO } from 'services/api/endpoints/images';

import { ImageViewerToolbar } from './ImageViewerToolbar';

const dndTargetData = setComparisonImageDndTarget.getData();

export const ImageViewer = memo(() => {
  const { t } = useTranslation();

  const lastSelectedItem = useAppSelector(selectLastSelectedItem);
  const lastSelectedImageDTO = useImageDTO(lastSelectedItem ?? null);
  const boardId = useAppSelector(selectSelectedBoardId);
  const [markAsSeen] = useMarkImagesAsSeenMutation();

  // Mark image as seen when selection changes (covers click + keyboard nav)
  useEffect(() => {
    if (lastSelectedItem && boardId && boardId !== 'none') {
      markAsSeen({ board_id: boardId, image_names: [lastSelectedItem] });
    }
  }, [lastSelectedItem, boardId, markAsSeen]);

  return (
    <Flex flexDir="column" w="full" h="full" overflow="hidden" gap={2} position="relative">
      <ImageViewerToolbar />
      <Divider />
      <Flex w="full" h="full" position="relative">
        <CurrentImagePreview imageDTO={lastSelectedImageDTO} />
        <DndDropTarget
          dndTarget={setComparisonImageDndTarget}
          dndTargetData={dndTargetData}
          label={t('gallery.selectForCompare')}
        />
      </Flex>
    </Flex>
  );
});

ImageViewer.displayName = 'ImageViewer';
