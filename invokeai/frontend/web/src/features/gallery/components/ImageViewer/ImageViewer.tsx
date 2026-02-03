import { Divider, Flex } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { setComparisonImageDndTarget } from 'features/dnd/dnd';
import { DndDropTarget } from 'features/dnd/DndDropTarget';
import { CurrentImagePreview } from 'features/gallery/components/ImageViewer/CurrentImagePreview';
import { selectLastSelectedItem } from 'features/gallery/store/gallerySelectors';
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMarkImagesAsSeenByImageNamesMutation } from 'services/api/endpoints/boards';
import { useImageDTO } from 'services/api/endpoints/images';

import { ImageViewerToolbar } from './ImageViewerToolbar';

const dndTargetData = setComparisonImageDndTarget.getData();

export const ImageViewer = memo(() => {
  const { t } = useTranslation();

  const lastSelectedItem = useAppSelector(selectLastSelectedItem);
  const lastSelectedImageDTO = useImageDTO(lastSelectedItem ?? null);
  const [markAsSeen] = useMarkImagesAsSeenByImageNamesMutation();

  // Mark image as seen when selection changes (covers click + keyboard nav)
  // Uses the new endpoint that marks by image name regardless of which board it's in,
  // which fixes the issue where images weren't marked as seen when viewing in a parent's recursive view
  useEffect(() => {
    if (lastSelectedItem) {
      markAsSeen({ image_names: [lastSelectedItem] });
    }
  }, [lastSelectedItem, markAsSeen]);

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
