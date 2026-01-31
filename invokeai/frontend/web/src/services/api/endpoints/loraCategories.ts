import type { ApiTagDescription } from '..';
import { api, buildV1Url, LIST_TAG } from '..';

/**
 * LoRA category data structure
 */
export type LoraCategoryDTO = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_default: boolean;
};

type ListLoraCategoriesResponse = LoraCategoryDTO[];

type CreateLoraCategoryArg = {
  name: string;
  color: string;
  sort_order?: number;
};

type UpdateLoraCategoryArg = {
  id: string;
  changes: {
    name?: string;
    color?: string;
    sort_order?: number;
  };
};

/**
 * Builds an endpoint URL for the lora_categories router
 */
const buildLoraCategoriesUrl = (path: string = '') => buildV1Url(`lora_categories/${path}`);

const loraCategoriesApi = api.injectEndpoints({
  endpoints: (build) => ({
    /**
     * List all LoRA categories (defaults + custom)
     */
    listLoraCategories: build.query<ListLoraCategoriesResponse, void>({
      query: () => ({
        url: buildLoraCategoriesUrl(),
      }),
      providesTags: (result) => {
        const tags: ApiTagDescription[] = [{ type: 'LoRACategories', id: LIST_TAG }, 'FetchOnReconnect'];

        if (result) {
          tags.push(
            ...result.map(({ id }) => ({
              type: 'LoRACategories' as const,
              id,
            }))
          );
        }

        return tags;
      },
    }),

    /**
     * Create a new LoRA category
     */
    createLoraCategory: build.mutation<LoraCategoryDTO, CreateLoraCategoryArg>({
      query: (body) => ({
        url: buildLoraCategoriesUrl(),
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'LoRACategories', id: LIST_TAG }],
    }),

    /**
     * Update an existing LoRA category
     */
    updateLoraCategory: build.mutation<LoraCategoryDTO, UpdateLoraCategoryArg>({
      query: ({ id, changes }) => ({
        url: buildLoraCategoriesUrl(`i/${id}`),
        method: 'PATCH',
        body: changes,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'LoRACategories', id: LIST_TAG },
        { type: 'LoRACategories', id: arg.id },
      ],
    }),

    /**
     * Delete a LoRA category
     */
    deleteLoraCategory: build.mutation<{ deleted: string }, string>({
      query: (id) => ({
        url: buildLoraCategoriesUrl(`i/${id}`),
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'LoRACategories', id: LIST_TAG }],
    }),
  }),
});

export const {
  useListLoraCategoriesQuery,
  useCreateLoraCategoryMutation,
  useUpdateLoraCategoryMutation,
  useDeleteLoraCategoryMutation,
} = loraCategoriesApi;
