import { Box, Button, Flex, Grid, GridItem, HStack, IconButton, Spinner, Text } from '@invoke-ai/ui-library';
import { createSelector } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector, useAppStore } from 'app/store/storeHooks';
import { getFocusedRegion, useIsRegionFocused } from 'common/hooks/focus';
import {
  selectCurrentPage,
  selectGalleryImageMinimumWidth,
  selectImageToCompare,
  selectLastSelectedItem,
  selectPaginationPageSize,
  selectSelectionCount,
} from 'features/gallery/store/gallerySelectors';
import { currentPageChanged, imageToCompareChanged, selectionChanged } from 'features/gallery/store/gallerySlice';
import type { PaginationPageSize } from 'features/gallery/store/types';
import { useRegisteredHotkeys } from 'features/system/components/HotkeysModal/useHotkeyData';
import type { RefObject } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiCaretLeftBold, PiCaretRightBold } from 'react-icons/pi';
import { imagesApi, useImageDTO, useStarImagesMutation, useUnstarImagesMutation } from 'services/api/endpoints/images';

import { getItemIndex } from './getItemIndex';
import { getItemsPerRow } from './getItemsPerRow';
import { GalleryImage, GalleryImagePlaceholder } from './ImageGrid/GalleryImage';
import { GallerySelectionCountTag } from './ImageGrid/GallerySelectionCountTag';
import { useGalleryImageNames } from './use-gallery-image-names';

const selectGridTemplateColumns = createSelector(
  selectGalleryImageMinimumWidth,
  (galleryImageMinimumWidth) => `repeat(auto-fill, minmax(${galleryImageMinimumWidth}px, 1fr))`
);

/**
 * Calculate the number of items that fit in the grid container
 */
const useAutoPageSize = (containerRef: RefObject<HTMLDivElement | null>, enabled: boolean): number => {
  const galleryImageMinimumWidth = useAppSelector(selectGalleryImageMinimumWidth);
  const [autoSize, setAutoSize] = useState(50);

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      return;
    }

    const calculateSize = () => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const gap = 4; // 1 in chakra spacing = 4px
      const itemSize = galleryImageMinimumWidth + gap;

      const cols = Math.floor(containerWidth / itemSize);
      const rows = Math.floor(containerHeight / itemSize);
      const totalItems = Math.max(cols * rows, 20); // Minimum 20 items

      // Round to nearest 10 for cleaner pagination
      setAutoSize(Math.round(totalItems / 10) * 10);
    };

    calculateSize();

    const resizeObserver = new ResizeObserver(() => {
      calculateSize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [enabled, galleryImageMinimumWidth, containerRef]);

  return autoSize;
};

/**
 * Wraps an image - either the placeholder as it is being loaded or the loaded image
 */
const PaginatedImageAtPosition = memo(({ imageName }: { imageName: string }) => {
  const { currentData: imageDTO, isUninitialized } = imagesApi.endpoints.getImageDTO.useQueryState(imageName);
  imagesApi.endpoints.getImageDTO.useQuerySubscription(imageName, { skip: isUninitialized });

  if (!imageDTO) {
    return <GalleryImagePlaceholder data-item-id={imageName} />;
  }

  return <GalleryImage imageDTO={imageDTO} />;
});
PaginatedImageAtPosition.displayName = 'PaginatedImageAtPosition';

/**
 * Get the effective page size (handle 'auto' case)
 */
const useEffectivePageSize = (
  containerRef: RefObject<HTMLDivElement | null>,
  paginationPageSize: PaginationPageSize
): number => {
  const autoSize = useAutoPageSize(containerRef, paginationPageSize === 'auto');
  return paginationPageSize === 'auto' ? autoSize : paginationPageSize;
};

/**
 * Handles keyboard navigation for paginated grid
 */
const usePaginatedKeyboardNavigation = (
  imageNames: string[],
  containerRef: RefObject<HTMLDivElement | null>,
  currentPage: number,
  effectivePageSize: number,
  goToPage: (page: number) => void
) => {
  const { dispatch, getState } = useAppStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const focusedRegion = getFocusedRegion();
      if (focusedRegion !== 'gallery' && focusedRegion !== 'viewer') {
        return;
      }
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const rootEl = containerRef.current;
      if (!rootEl || imageNames.length === 0) {
        return;
      }

      const imagesPerRow = getItemsPerRow(rootEl);

      event.preventDefault();

      const state = getState();
      const imageName = event.altKey
        ? (selectImageToCompare(state) ?? selectLastSelectedItem(state))
        : selectLastSelectedItem(state);

      const currentIndex = getItemIndex(imageName ?? null, imageNames);
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowLeft':
          if (currentIndex > 0) {
            newIndex = currentIndex - 1;
          }
          break;
        case 'ArrowRight':
          if (currentIndex < imageNames.length - 1) {
            newIndex = currentIndex + 1;
          }
          break;
        case 'ArrowUp':
          if (imagesPerRow === 0) {
            break;
          }
          if (currentIndex >= imagesPerRow) {
            newIndex = currentIndex - imagesPerRow;
          }
          break;
        case 'ArrowDown':
          if (imagesPerRow === 0) {
            break;
          }
          if (currentIndex < imageNames.length - imagesPerRow) {
            newIndex = Math.min(imageNames.length - 1, currentIndex + imagesPerRow);
          }
          break;
      }

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < imageNames.length) {
        const newImageName = imageNames[newIndex];
        if (newImageName) {
          // Check if we need to navigate to a different page
          const newPage = Math.floor(newIndex / effectivePageSize);
          if (newPage !== currentPage) {
            goToPage(newPage);
          }

          if (event.altKey) {
            dispatch(imageToCompareChanged(newImageName));
          } else {
            dispatch(selectionChanged([newImageName]));
          }
        }
      }
    },
    [containerRef, imageNames, getState, dispatch, effectivePageSize, currentPage, goToPage]
  );

  useRegisteredHotkeys({
    id: 'galleryNavLeft',
    category: 'gallery',
    callback: handleKeyDown,
    options: { preventDefault: true },
    dependencies: [handleKeyDown],
  });

  useRegisteredHotkeys({
    id: 'galleryNavRight',
    category: 'gallery',
    callback: handleKeyDown,
    options: { preventDefault: true },
    dependencies: [handleKeyDown],
  });

  useRegisteredHotkeys({
    id: 'galleryNavUp',
    category: 'gallery',
    callback: handleKeyDown,
    options: { preventDefault: true },
    dependencies: [handleKeyDown],
  });

  useRegisteredHotkeys({
    id: 'galleryNavDown',
    category: 'gallery',
    callback: handleKeyDown,
    options: { preventDefault: true },
    dependencies: [handleKeyDown],
  });

  useRegisteredHotkeys({
    id: 'galleryNavLeftAlt',
    category: 'gallery',
    callback: handleKeyDown,
    options: { preventDefault: true },
    dependencies: [handleKeyDown],
  });

  useRegisteredHotkeys({
    id: 'galleryNavRightAlt',
    category: 'gallery',
    callback: handleKeyDown,
    options: { preventDefault: true },
    dependencies: [handleKeyDown],
  });

  useRegisteredHotkeys({
    id: 'galleryNavUpAlt',
    category: 'gallery',
    callback: handleKeyDown,
    options: { preventDefault: true },
    dependencies: [handleKeyDown],
  });

  useRegisteredHotkeys({
    id: 'galleryNavDownAlt',
    category: 'gallery',
    callback: handleKeyDown,
    options: { preventDefault: true },
    dependencies: [handleKeyDown],
  });
};

/**
 * Handles star image hotkey for paginated grid
 */
const useStarImageHotkey = () => {
  const lastSelectedItem = useAppSelector(selectLastSelectedItem);
  const selectionCount = useAppSelector(selectSelectionCount);
  const isGalleryFocused = useIsRegionFocused('gallery');
  const isViewerFocused = useIsRegionFocused('viewer');
  const imageDTO = useImageDTO(lastSelectedItem);
  const [starImages] = useStarImagesMutation();
  const [unstarImages] = useUnstarImagesMutation();

  const handleStarHotkey = useCallback(() => {
    if (!imageDTO) {
      return;
    }
    if (!isGalleryFocused && !isViewerFocused) {
      return;
    }
    if (imageDTO.starred) {
      unstarImages({ image_names: [imageDTO.image_name] });
    } else {
      starImages({ image_names: [imageDTO.image_name] });
    }
  }, [imageDTO, isGalleryFocused, isViewerFocused, starImages, unstarImages]);

  useRegisteredHotkeys({
    id: 'starImage',
    category: 'gallery',
    callback: handleStarHotkey,
    options: { enabled: !!imageDTO && selectionCount === 1 && (isGalleryFocused || isViewerFocused) },
    dependencies: [imageDTO, selectionCount, isGalleryFocused, isViewerFocused, handleStarHotkey],
  });
};

export const PaginatedGrid = memo(() => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridTemplateColumns = useAppSelector(selectGridTemplateColumns);
  const currentPage = useAppSelector(selectCurrentPage);
  const paginationPageSize = useAppSelector(selectPaginationPageSize);

  const { imageNames, isLoading } = useGalleryImageNames();
  const effectivePageSize = useEffectivePageSize(containerRef, paginationPageSize);

  const totalImages = imageNames.length;
  const totalPages = Math.ceil(totalImages / effectivePageSize);

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      dispatch(currentPageChanged(totalPages - 1));
    }
  }, [currentPage, totalPages, dispatch]);

  // Get the images for the current page
  const pageImageNames = useMemo(() => {
    const start = currentPage * effectivePageSize;
    const end = start + effectivePageSize;
    return imageNames.slice(start, end);
  }, [imageNames, currentPage, effectivePageSize]);

  // Fetch DTOs for visible images
  const [fetchImageDTOs] = imagesApi.endpoints.getImageDTOsByNames.useMutation();

  useEffect(() => {
    if (pageImageNames.length > 0) {
      fetchImageDTOs({ image_names: pageImageNames });
    }
  }, [pageImageNames, fetchImageDTOs]);

  const goToPage = useCallback(
    (page: number) => {
      dispatch(currentPageChanged(Math.max(0, Math.min(page, totalPages - 1))));
    },
    [dispatch, totalPages]
  );

  const goToPrevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const goToNextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  // Add keyboard navigation and star hotkey support
  useStarImageHotkey();
  usePaginatedKeyboardNavigation(imageNames, containerRef, currentPage, effectivePageSize, goToPage);

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if there aren't many
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(0);

      if (currentPage > 2) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 3) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages - 1);
      }
    }

    return pages;
  }, [totalPages, currentPage]);

  if (isLoading) {
    return (
      <Flex w="full" h="full" alignItems="center" justifyContent="center" gap={4}>
        <Spinner size="lg" opacity={0.3} />
        <Text color="base.300">Loading gallery...</Text>
      </Flex>
    );
  }

  if (imageNames.length === 0) {
    return (
      <Flex w="full" h="full" alignItems="center" justifyContent="center">
        <Text color="base.300">No images found</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" w="full" h="full" gap={2} overflow="hidden">
      {/* Grid container */}
      <Box ref={containerRef} flex={1} overflow="auto" position="relative" minH={0}>
        <Grid gridTemplateColumns={gridTemplateColumns} gap={1} p={1}>
          {pageImageNames.map((imageName) => (
            <GridItem key={imageName} aspectRatio="1/1">
              <PaginatedImageAtPosition imageName={imageName} />
            </GridItem>
          ))}
        </Grid>
        <GallerySelectionCountTag />
      </Box>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Flex
          justifyContent="center"
          alignItems="center"
          gap={2}
          py={2}
          px={4}
          bg="base.850"
          borderRadius="base"
          flexShrink={0}
        >
          <IconButton
            aria-label="Previous page"
            icon={<PiCaretLeftBold />}
            onClick={goToPrevPage}
            isDisabled={currentPage === 0}
            size="sm"
            variant="ghost"
          />

          <HStack spacing={1}>
            {pageNumbers.map((page, index) =>
              page === 'ellipsis' ? (
                <Text key={`ellipsis-${index}`} color="base.500" px={2}>
                  ...
                </Text>
              ) : (
                <PageButton key={page} page={page} currentPage={currentPage} onPageChange={goToPage} />
              )
            )}
          </HStack>

          <IconButton
            aria-label="Next page"
            icon={<PiCaretRightBold />}
            onClick={goToNextPage}
            isDisabled={currentPage >= totalPages - 1}
            size="sm"
            variant="ghost"
          />

          <Text color="base.400" fontSize="sm" ml={2}>
            {totalImages} images
          </Text>
        </Flex>
      )}
    </Flex>
  );
});

PaginatedGrid.displayName = 'PaginatedGrid';

interface PageButtonProps {
  page: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const PageButton = memo(({ page, currentPage, onPageChange }: PageButtonProps) => {
  const handleClick = useCallback(() => {
    onPageChange(page);
  }, [page, onPageChange]);

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant={page === currentPage ? 'solid' : 'ghost'}
      colorScheme={page === currentPage ? 'invokeBlue' : undefined}
      minW={8}
    >
      {page + 1}
    </Button>
  );
});

PageButton.displayName = 'PageButton';
