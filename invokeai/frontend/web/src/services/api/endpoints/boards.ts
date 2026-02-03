import { ASSETS_CATEGORIES, IMAGE_CATEGORIES } from 'features/gallery/store/types';
import queryString from 'query-string';
import type {
  BoardDTO,
  BoardMoveRequest,
  CreateBoardArg,
  ImageCategory,
  ListBoardsArgs,
  OffsetPaginatedResults_ImageDTO_,
  UpdateBoardArg,
} from 'services/api/types';
import { getListImagesUrl } from 'services/api/util';

import type { ApiTagDescription } from '..';
import { api, buildV1Url, LIST_TAG } from '..';

/**
 * Builds an endpoint URL for the boards router
 * @example
 * buildBoardsUrl('some-path')
 * // '/api/v1/boards/some-path'
 */
export const buildBoardsUrl = (path: string = '') => buildV1Url(`boards/${path}`);

export const boardsApi = api.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Boards Queries
     */
    listAllBoards: build.query<Array<BoardDTO>, ListBoardsArgs>({
      query: (args) => ({
        url: buildBoardsUrl(),
        params: { all: true, ...args },
      }),
      providesTags: (result) => {
        // any list of boards
        const tags: ApiTagDescription[] = [{ type: 'Board', id: LIST_TAG }, 'FetchOnReconnect'];

        if (result) {
          // and individual tags for each board
          tags.push(
            ...result.map(({ board_id }) => ({
              type: 'Board' as const,
              id: board_id,
            }))
          );
        }

        return tags;
      },
    }),

    listAllImageNamesForBoard: build.query<
      Array<string>,
      { board_id: string | 'none'; categories: ImageCategory[] | undefined; is_intermediate: boolean | undefined }
    >({
      query: ({ board_id, categories, is_intermediate }) => ({
        url: buildBoardsUrl(
          `${board_id}/image_names?${queryString.stringify({ categories, is_intermediate }, { arrayFormat: 'none' })}`
        ),
      }),
      providesTags: (result, error, arg) => [{ type: 'ImageNameList', id: JSON.stringify(arg) }, 'FetchOnReconnect'],
    }),

    getBoardImagesTotal: build.query<{ total: number }, string | undefined>({
      query: (board_id) => ({
        url: getListImagesUrl({
          board_id: board_id ?? 'none',
          categories: IMAGE_CATEGORIES,
          is_intermediate: false,
          limit: 0,
          offset: 0,
        }),
        method: 'GET',
      }),
      providesTags: (result, error, arg) => [{ type: 'BoardImagesTotal', id: arg ?? 'none' }, 'FetchOnReconnect'],
      transformResponse: (response: OffsetPaginatedResults_ImageDTO_) => {
        return { total: response.total };
      },
    }),

    getBoardAssetsTotal: build.query<{ total: number }, string | undefined>({
      query: (board_id) => ({
        url: getListImagesUrl({
          board_id: board_id ?? 'none',
          categories: ASSETS_CATEGORIES,
          is_intermediate: false,
          limit: 0,
          offset: 0,
        }),
        method: 'GET',
      }),
      providesTags: (result, error, arg) => [{ type: 'BoardAssetsTotal', id: arg ?? 'none' }, 'FetchOnReconnect'],
      transformResponse: (response: OffsetPaginatedResults_ImageDTO_) => {
        return { total: response.total };
      },
    }),

    /**
     * Boards Mutations
     */

    createBoard: build.mutation<BoardDTO, CreateBoardArg & { parent_board_id?: string | null }>({
      query: ({ board_name, parent_board_id }) => ({
        url: buildBoardsUrl(),
        method: 'POST',
        params: { board_name, ...(parent_board_id && { parent_board_id }) },
      }),
      invalidatesTags: (result, error, arg) => {
        const tags: ApiTagDescription[] = [{ type: 'Board', id: LIST_TAG }];
        // Also invalidate parent's children if creating a subfolder
        if (arg.parent_board_id) {
          tags.push({ type: 'Board', id: `children-${arg.parent_board_id}` });
        }
        return tags;
      },
    }),

    updateBoard: build.mutation<BoardDTO, UpdateBoardArg>({
      query: ({ board_id, changes }) => ({
        url: buildBoardsUrl(board_id),
        method: 'PATCH',
        body: changes,
      }),
      invalidatesTags: (result, error, arg) => {
        const tags: ApiTagDescription[] = [];
        if (Object.keys(arg.changes).includes('archived')) {
          tags.push({ type: 'Board', id: LIST_TAG });
        }

        tags.push({ type: 'Board', id: arg.board_id });

        return tags;
      },
    }),

    // Hierarchy endpoints for nested folder support

    getBoardChildren: build.query<Array<BoardDTO>, string>({
      query: (board_id) => ({
        url: buildBoardsUrl(`${board_id}/children`),
      }),
      providesTags: (result, error, arg) => {
        const tags: ApiTagDescription[] = [{ type: 'Board', id: `children-${arg}` }, 'FetchOnReconnect'];
        if (result) {
          tags.push(...result.map(({ board_id }) => ({ type: 'Board' as const, id: board_id })));
        }
        return tags;
      },
    }),

    getBoardDescendants: build.query<Array<BoardDTO>, string>({
      query: (board_id) => ({
        url: buildBoardsUrl(`${board_id}/descendants`),
      }),
      providesTags: (result, error, arg) => {
        const tags: ApiTagDescription[] = [{ type: 'Board', id: `descendants-${arg}` }, 'FetchOnReconnect'];
        if (result) {
          tags.push(...result.map(({ board_id }) => ({ type: 'Board' as const, id: board_id })));
        }
        return tags;
      },
    }),

    getBoardAncestors: build.query<Array<BoardDTO>, string>({
      query: (board_id) => ({
        url: buildBoardsUrl(`${board_id}/ancestors`),
      }),
      providesTags: (result, error, arg) => {
        const tags: ApiTagDescription[] = [{ type: 'Board', id: `ancestors-${arg}` }, 'FetchOnReconnect'];
        if (result) {
          tags.push(...result.map(({ board_id }) => ({ type: 'Board' as const, id: board_id })));
        }
        return tags;
      },
    }),

    moveBoard: build.mutation<
      BoardDTO,
      { board_id: string; move_request: BoardMoveRequest; old_parent_id?: string | null }
    >({
      query: ({ board_id, move_request }) => ({
        url: buildBoardsUrl(`${board_id}/move`),
        method: 'PATCH',
        body: move_request,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'Board', id: LIST_TAG },
        { type: 'Board', id: arg.board_id },
        { type: 'Board', id: `children-root` },
        { type: 'Board', id: `children-${arg.move_request.new_parent_id ?? 'root'}` },
        // Invalidate old parent's children
        { type: 'Board', id: `children-${arg.old_parent_id ?? 'root'}` },
      ],
    }),

    // Unseen notifications endpoints

    getUnseenCount: build.query<number, string>({
      query: (board_id) => ({
        url: buildBoardsUrl(`${board_id}/unseen_count`),
      }),
      providesTags: (result, error, arg) => [{ type: 'Board', id: `unseen-${arg}` }, 'FetchOnReconnect'],
    }),

    markImagesAsSeen: build.mutation<void, { board_id: string; image_names?: string[] }>({
      query: ({ board_id, image_names }) => ({
        url: buildBoardsUrl(`${board_id}/mark_seen`),
        method: 'POST',
        body: image_names ? { image_names } : null,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'Board', id: arg.board_id },
        { type: 'Board', id: `unseen-${arg.board_id}` },
        { type: 'Board', id: LIST_TAG },
        'ImageNameList', // Refreshes getImageNames to update unseen_image_names
      ],
    }),
  }),
});

export const {
  useListAllBoardsQuery,
  useGetBoardImagesTotalQuery,
  useGetBoardAssetsTotalQuery,
  useCreateBoardMutation,
  useUpdateBoardMutation,
  useListAllImageNamesForBoardQuery,
  // Hierarchy hooks
  useGetBoardChildrenQuery,
  useGetBoardDescendantsQuery,
  useGetBoardAncestorsQuery,
  useMoveBoardMutation,
  // Unseen notifications hooks
  useGetUnseenCountQuery,
  useMarkImagesAsSeenMutation,
} = boardsApi;
