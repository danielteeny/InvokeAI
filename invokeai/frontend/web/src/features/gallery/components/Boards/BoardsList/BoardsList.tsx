import { Collapse, Flex, Text, useDisclosure } from '@invoke-ai/ui-library';
import { EMPTY_ARRAY } from 'app/store/constants';
import { useAppSelector } from 'app/store/storeHooks';
import { fixTooltipCloseOnScrollStyles } from 'common/util/fixTooltipCloseOnScrollStyles';
import {
  selectBoardSearchText,
  selectListBoardsQueryArgs,
  selectSelectedBoardId,
} from 'features/gallery/store/gallerySelectors';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useListAllBoardsQuery } from 'services/api/endpoints/boards';

import AddBoardButton from './AddBoardButton';
import { BoardTree } from './BoardTree';
import NoBoardBoard from './NoBoardBoard';

export const BoardsList = memo(() => {
  const { t } = useTranslation();
  const selectedBoardId = useAppSelector(selectSelectedBoardId);
  const boardSearchText = useAppSelector(selectBoardSearchText);
  const queryArgs = useAppSelector(selectListBoardsQueryArgs);
  const { data: boards } = useListAllBoardsQuery(queryArgs);
  const { isOpen } = useDisclosure({ defaultIsOpen: true });

  const boardsList = useMemo(() => boards ?? EMPTY_ARRAY, [boards]);

  const hasBoards = boardsList.length > 0 || boardSearchText.length === 0;

  return (
    <Flex direction="column">
      <Flex
        position="sticky"
        w="full"
        justifyContent="space-between"
        alignItems="center"
        ps={2}
        py={1}
        zIndex={1}
        top={0}
        bg="base.900"
      >
        <Text fontSize="sm" fontWeight="semibold" userSelect="none" color="base.500">
          {t('boards.boards')}
        </Text>
        <AddBoardButton />
      </Flex>
      <Collapse in={isOpen} style={fixTooltipCloseOnScrollStyles}>
        <Flex direction="column" gap={1}>
          {/* Always show "Uncategorized" board unless searching */}
          {!boardSearchText.length && <NoBoardBoard key="none" isSelected={selectedBoardId === 'none'} />}

          {/* Render boards as a tree structure */}
          {hasBoards ? (
            <BoardTree boards={boardsList} searchText={boardSearchText} />
          ) : (
            <Text variant="subtext" textAlign="center">
              {t('boards.noBoards', { boardType: boardSearchText.length ? 'Matching' : '' })}
            </Text>
          )}
        </Flex>
      </Collapse>
    </Flex>
  );
});
BoardsList.displayName = 'BoardsList';
