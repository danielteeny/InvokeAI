import { Divider, Flex } from '@invoke-ai/ui-library';
import { logger } from 'app/logging/logger';
import { useAppSelector } from 'app/store/storeHooks';
import { setComparisonImageDndTarget } from 'features/dnd/dnd';
import { DndDropTarget } from 'features/dnd/DndDropTarget';
import { CurrentImagePreview } from 'features/gallery/components/ImageViewer/CurrentImagePreview';
import { selectLastSelectedItem } from 'features/gallery/store/gallerySelectors';
import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMarkImagesAsSeenByImageNamesMutation } from 'services/api/endpoints/boards';
import { useImageDTO } from 'services/api/endpoints/images';

import { ImageViewerToolbar } from './ImageViewerToolbar';

const log = logger('gallery');
const dndTargetData = setComparisonImageDndTarget.getData();
const MARK_SEEN_DEBOUNCE_MS = 1000;

export const ImageViewer = memo(() => {
  const { t } = useTranslation();

  const lastSelectedItem = useAppSelector(selectLastSelectedItem);
  const lastSelectedImageDTO = useImageDTO(lastSelectedItem ?? null);
  const [markAsSeen] = useMarkImagesAsSeenByImageNamesMutation();
  const pendingRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Mark images as seen when selection changes, debounced to batch rapid navigation
  useEffect(() => {
    if (lastSelectedItem) {
      pendingRef.current.add(lastSelectedItem);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const names = Array.from(pendingRef.current);
        pendingRef.current.clear();
        if (names.length > 0) {
          markAsSeen({ image_names: names }).catch((error) => {
            log.error({ error }, 'Failed to mark images as seen');
          });
        }
      }, MARK_SEEN_DEBOUNCE_MS);
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
