import type { SystemStyleObject } from '@invoke-ai/ui-library';
import { Badge, Box, Flex, Icon, Image, Text, Tooltip } from '@invoke-ai/ui-library';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import type { AddImageToBoardDndTargetData } from 'features/dnd/dnd';
import { addImageToBoardDndTarget } from 'features/dnd/dnd';
import { DndDropTarget } from 'features/dnd/DndDropTarget';
import { AutoAddBadge } from 'features/gallery/components/Boards/AutoAddBadge';
import BoardContextMenu from 'features/gallery/components/Boards/BoardContextMenu';
import { BoardEditableTitle } from 'features/gallery/components/Boards/BoardsList/BoardEditableTitle';
import { BoardTooltip } from 'features/gallery/components/Boards/BoardsList/BoardTooltip';
import {
  selectAutoAddBoardId,
  selectAutoAssignBoardOnClick,
  selectRecursiveFolderView,
  selectSelectedBoardId,
} from 'features/gallery/store/gallerySelectors';
import { autoAddBoardIdChanged, boardIdSelected } from 'features/gallery/store/gallerySlice';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiArchiveBold, PiImageSquare } from 'react-icons/pi';
import { useGetImageDTOQuery } from 'services/api/endpoints/images';
import type { BoardDTO } from 'services/api/types';

const _hover: SystemStyleObject = {
  bg: 'base.850',
};

interface GalleryBoardProps {
  board: BoardDTO;
  isSelected: boolean;
}

const GalleryBoard = ({ board, isSelected }: GalleryBoardProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const autoAddBoardId = useAppSelector(selectAutoAddBoardId);
  const autoAssignBoardOnClick = useAppSelector(selectAutoAssignBoardOnClick);
  const selectedBoardId = useAppSelector(selectSelectedBoardId);
  const recursiveFolderView = useAppSelector(selectRecursiveFolderView);

  // Show recursive counts when in recursive view, otherwise show direct counts
  const displayedUnseenCount = recursiveFolderView
    ? (board.unseen_count_recursive ?? board.unseen_count ?? 0)
    : (board.unseen_count ?? 0);

  const displayedImageCount = recursiveFolderView
    ? (board.image_count_recursive ?? board.image_count)
    : board.image_count;

  const displayedAssetCount = recursiveFolderView
    ? (board.asset_count_recursive ?? board.asset_count)
    : board.asset_count;

  const onClick = useCallback(() => {
    if (selectedBoardId !== board.board_id) {
      dispatch(boardIdSelected({ boardId: board.board_id }));
    }
    if (autoAssignBoardOnClick && autoAddBoardId !== board.board_id) {
      dispatch(autoAddBoardIdChanged(board.board_id));
    }
  }, [selectedBoardId, board.board_id, autoAssignBoardOnClick, autoAddBoardId, dispatch]);

  const dndTargetData = useMemo<AddImageToBoardDndTargetData>(
    () => addImageToBoardDndTarget.getData({ boardId: board.board_id }),
    [board.board_id]
  );

  const boardCounts = useMemo(
    () => ({
      image_count: displayedImageCount,
      asset_count: displayedAssetCount,
    }),
    [displayedImageCount, displayedAssetCount]
  );

  return (
    <Box position="relative" w="full" h={12}>
      <BoardContextMenu board={board}>
        {(ref) => (
          <Tooltip
            label={<BoardTooltip board={board} boardCounts={boardCounts} />}
            openDelay={1000}
            placement="right"
            closeOnScroll
            p={2}
          >
            <Flex
              ref={ref}
              onClick={onClick}
              alignItems="center"
              borderRadius="base"
              cursor="pointer"
              py={1}
              ps={1}
              pe={4}
              gap={4}
              bg={isSelected ? 'base.850' : undefined}
              _hover={_hover}
              w="full"
              h="full"
            >
              <Box position="relative">
                <CoverImage board={board} />
                {displayedUnseenCount > 0 && (
                  <Badge
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    bg="invokeYellow.500"
                    color="blackAlpha.800"
                    fontSize="9px"
                    fontWeight="bold"
                    px={1}
                    py={0}
                    borderRadius="full"
                    lineHeight="short"
                    minH="auto"
                  >
                    +{displayedUnseenCount}
                  </Badge>
                )}
              </Box>
              <Flex flex={1}>
                <BoardEditableTitle board={board} isSelected={isSelected} />
              </Flex>
              {autoAddBoardId === board.board_id && <AutoAddBadge />}
              {board.archived && <Icon as={PiArchiveBold} fill="base.300" />}
              <Flex justifyContent="flex-end">
                <Text variant="subtext">
                  {displayedImageCount} | {displayedAssetCount}
                </Text>
              </Flex>
            </Flex>
          </Tooltip>
        )}
      </BoardContextMenu>
      <DndDropTarget dndTarget={addImageToBoardDndTarget} dndTargetData={dndTargetData} label={t('gallery.move')} />
    </Box>
  );
};

export default memo(GalleryBoard);

const CoverImage = ({ board }: { board: BoardDTO }) => {
  const { currentData: coverImage } = useGetImageDTOQuery(board.cover_image_name ?? skipToken);

  if (coverImage) {
    return (
      <Image
        src={coverImage.thumbnail_url}
        draggable={false}
        objectFit="cover"
        w={10}
        h={10}
        borderRadius="base"
        borderBottomRadius="lg"
      />
    );
  }

  return (
    <Flex w={10} h={10} justifyContent="center" alignItems="center">
      <Icon boxSize={10} as={PiImageSquare} opacity={0.7} color="base.500" />
    </Flex>
  );
};
