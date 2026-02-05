import {
  Box,
  Button,
  Collapse,
  Flex,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Spinner,
  Text,
} from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { useAssertSingleton } from 'common/hooks/useAssertSingleton';
import { toast } from 'features/toast/toast';
import { atom } from 'nanostores';
import type { MouseEvent } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PiCaretDownBold, PiCaretRightBold } from 'react-icons/pi';
import {
  useGetBoardChildrenQuery,
  useGetBoardDescendantsQuery,
  useListAllBoardsQuery,
  useMoveBoardMutation,
} from 'services/api/endpoints/boards';
import { useBoardName } from 'services/api/hooks/useBoardName';
import type { BoardDTO } from 'services/api/types';

export const $boardToMove = atom<BoardDTO | null>(null);

interface BoardTreeNodeProps {
  board: BoardDTO;
  depth: number;
  selectedId: string | null;
  disabledIds: Set<string>;
  onSelect: (boardId: string) => void;
}

const BoardTreeNode = memo(({ board, depth, selectedId, disabledIds, onSelect }: BoardTreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // Always fetch children to know if board has children (needed to show/hide expand button)
  const { data: children, isLoading: isLoadingChildren } = useGetBoardChildrenQuery(board.board_id);

  const hasChildren = (children?.length ?? 0) > 0;
  const indentPx = depth * 16;
  const isDisabled = disabledIds.has(board.board_id);
  const isSelected = selectedId === board.board_id;

  const toggleExpanded = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleSelect = useCallback(() => {
    if (!isDisabled) {
      onSelect(board.board_id);
    }
  }, [isDisabled, onSelect, board.board_id]);

  return (
    <Box>
      <Flex
        alignItems="center"
        py={1}
        px={2}
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        opacity={isDisabled ? 0.5 : 1}
        bg={isSelected ? 'base.700' : 'transparent'}
        borderRadius="md"
        _hover={!isDisabled ? { bg: 'base.750' } : undefined}
        onClick={handleSelect}
      >
        <Box w={`${indentPx}px`} flexShrink={0} />
        <Box w={6} h={6} flexShrink={0}>
          {isLoadingChildren ? (
            <Flex w="full" h="full" alignItems="center" justifyContent="center">
              <Spinner size="xs" />
            </Flex>
          ) : hasChildren ? (
            <IconButton
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              icon={isExpanded ? <PiCaretDownBold /> : <PiCaretRightBold />}
              onClick={toggleExpanded}
              size="xs"
              variant="ghost"
              opacity={0.5}
              _hover={{ opacity: 1 }}
            />
          ) : null}
        </Box>
        <Radio isChecked={isSelected} isDisabled={isDisabled} mr={2} pointerEvents="none" />
        <Text fontSize="sm" noOfLines={1}>
          {board.board_name}
        </Text>
        {isDisabled && (
          <Text fontSize="xs" color="base.500" ml={2}>
            (current)
          </Text>
        )}
      </Flex>

      <Collapse in={isExpanded && hasChildren}>
        <Box>
          {children?.map((child) => (
            <BoardTreeNode
              key={child.board_id}
              board={child}
              depth={depth + 1}
              selectedId={selectedId}
              disabledIds={disabledIds}
              onSelect={onSelect}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
});
BoardTreeNode.displayName = 'BoardTreeNode';

const MoveBoardModal = () => {
  useAssertSingleton('MoveBoardModal');
  const { t } = useTranslation();
  const board = useStore($boardToMove);
  const boardName = useBoardName(board?.board_id ?? '');

  const { data: allBoards = [] } = useListAllBoardsQuery({ include_archived: true }, { skip: !board });
  const { data: descendants = [] } = useGetBoardDescendantsQuery(board?.board_id ?? '', { skip: !board });

  const [moveBoard, { isLoading: isMoving }] = useMoveBoardMutation();
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);

  // Build set of disabled board IDs (the board itself and all its descendants)
  const disabledIds = useMemo(() => {
    const ids = new Set<string>();
    if (board) {
      ids.add(board.board_id);
      for (const desc of descendants) {
        ids.add(desc.board_id);
      }
    }
    return ids;
  }, [board, descendants]);

  // Filter to only root-level boards for tree display
  const rootBoards = useMemo(() => {
    return allBoards.filter((b) => !b.parent_board_id);
  }, [allBoards]);

  const handleClose = useCallback(() => {
    $boardToMove.set(null);
    setSelectedDestination(null);
  }, []);

  const handleSelectRoot = useCallback(() => {
    setSelectedDestination('root');
  }, []);

  const handleSelectBoard = useCallback((boardId: string) => {
    setSelectedDestination(boardId);
  }, []);

  const handleMove = useCallback(async () => {
    if (!board || selectedDestination === null) {
      return;
    }

    const newParentId = selectedDestination === 'root' ? null : selectedDestination;

    // Don't move if destination is current parent
    if (newParentId === board.parent_board_id) {
      toast({
        status: 'info',
        title: t('boards.alreadyInDestination'),
      });
      return;
    }

    try {
      await moveBoard({
        board_id: board.board_id,
        move_request: { new_parent_id: newParentId },
        old_parent_id: board.parent_board_id,
      }).unwrap();

      toast({
        status: 'success',
        title: t('boards.boardMoved'),
      });
      handleClose();
    } catch {
      toast({
        status: 'error',
        title: t('boards.moveBoardError'),
      });
    }
  }, [board, selectedDestination, moveBoard, t, handleClose]);

  if (!board) {
    return null;
  }

  const isCurrentlyRoot = !board.parent_board_id;
  const isRootSelected = selectedDestination === 'root';

  return (
    <Modal isOpen={Boolean(board)} onClose={handleClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {t('boards.moveBoardTitle')} &quot;{boardName}&quot;
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text color="base.400" mb={4}>
            {t('boards.selectDestination')}
          </Text>

          <RadioGroup value={selectedDestination ?? ''}>
            <Flex direction="column" gap={1}>
              {/* Root option */}
              <Flex
                alignItems="center"
                py={1}
                px={2}
                cursor={isCurrentlyRoot ? 'not-allowed' : 'pointer'}
                opacity={isCurrentlyRoot ? 0.5 : 1}
                bg={isRootSelected ? 'base.700' : 'transparent'}
                borderRadius="md"
                _hover={!isCurrentlyRoot ? { bg: 'base.750' } : undefined}
                onClick={!isCurrentlyRoot ? handleSelectRoot : undefined}
              >
                <Radio isChecked={isRootSelected} isDisabled={isCurrentlyRoot} mr={2} pointerEvents="none" />
                <Text fontSize="sm" fontWeight="medium">
                  {t('boards.moveToRoot')}
                </Text>
                {isCurrentlyRoot && (
                  <Text fontSize="xs" color="base.500" ml={2}>
                    (current)
                  </Text>
                )}
              </Flex>

              <Box h={2} />

              {/* Board tree */}
              {rootBoards.map((rootBoard) => (
                <BoardTreeNode
                  key={rootBoard.board_id}
                  board={rootBoard}
                  depth={0}
                  selectedId={selectedDestination === 'root' ? null : selectedDestination}
                  disabledIds={disabledIds}
                  onSelect={handleSelectBoard}
                />
              ))}
            </Flex>
          </RadioGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={handleClose} mr={2}>
            {t('common.cancel')}
          </Button>
          <Button
            colorScheme="invokeBlue"
            onClick={handleMove}
            isLoading={isMoving}
            isDisabled={selectedDestination === null}
          >
            {t('boards.moveHere')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default memo(MoveBoardModal);
