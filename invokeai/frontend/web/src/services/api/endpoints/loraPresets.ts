import { api, buildV1Url, LIST_TAG } from '..';

type LoRAPresetItem = {
  model_key: string;
  weight: number;
  is_enabled: boolean;
};

type LoRAPresetData = {
  loras: LoRAPresetItem[];
};

export type LoRAPresetRecordDTO = {
  id: string;
  name: string;
  preset_data: LoRAPresetData;
};

type CreateLoRAPresetArg = {
  name: string;
  preset_data: LoRAPresetData;
};

type UpdateLoRAPresetArg = {
  id: string;
  name?: string;
  preset_data?: LoRAPresetData;
};

/**
 * Builds an endpoint URL for the lora_presets router
 * @example
 * buildLoRAPresetsUrl('some-path')
 * // '/api/v1/lora_presets/some-path'
 */
const buildLoRAPresetsUrl = (path: string = '') => buildV1Url(`lora_presets/${path}`);

const loraPresetsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listLoRAPresets: build.query<LoRAPresetRecordDTO[], void>({
      query: () => ({
        url: buildLoRAPresetsUrl(),
      }),
      providesTags: ['FetchOnReconnect', { type: 'LoRAPreset', id: LIST_TAG }],
    }),
    getLoRAPreset: build.query<LoRAPresetRecordDTO, string>({
      query: (lora_preset_id) => ({
        url: buildLoRAPresetsUrl(`i/${lora_preset_id}`),
      }),
      providesTags: (result, error, lora_preset_id) => [{ type: 'LoRAPreset', id: lora_preset_id }],
    }),
    createLoRAPreset: build.mutation<LoRAPresetRecordDTO, CreateLoRAPresetArg>({
      query: (body) => ({
        url: buildLoRAPresetsUrl(),
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'LoRAPreset', id: LIST_TAG }],
    }),
    updateLoRAPreset: build.mutation<LoRAPresetRecordDTO, UpdateLoRAPresetArg>({
      query: ({ id, ...body }) => ({
        url: buildLoRAPresetsUrl(`i/${id}`),
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'LoRAPreset', id: LIST_TAG },
        { type: 'LoRAPreset', id },
      ],
    }),
    deleteLoRAPreset: build.mutation<void, string>({
      query: (lora_preset_id) => ({
        url: buildLoRAPresetsUrl(`i/${lora_preset_id}`),
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, lora_preset_id) => [
        { type: 'LoRAPreset', id: LIST_TAG },
        { type: 'LoRAPreset', id: lora_preset_id },
      ],
    }),
  }),
});

export const {
  useListLoRAPresetsQuery,
  useGetLoRAPresetQuery,
  useCreateLoRAPresetMutation,
  useUpdateLoRAPresetMutation,
  useDeleteLoRAPresetMutation,
} = loraPresetsApi;
