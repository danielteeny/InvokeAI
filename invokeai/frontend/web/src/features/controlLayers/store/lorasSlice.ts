import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from 'app/store/store';
import type { SliceConfig } from 'app/store/types';
import { paramsReset } from 'features/controlLayers/store/paramsSlice';
import { type LoRA, zLoRA } from 'features/controlLayers/store/types';
import { zModelIdentifierField } from 'features/nodes/types/common';
import type { LoRAModelConfig } from 'services/api/types';
import { v4 as uuidv4 } from 'uuid';
import z from 'zod';

export const DEFAULT_LORA_WEIGHT_CONFIG = {
  initial: 0.75,
  sliderMin: -1,
  sliderMax: 2,
  numberInputMin: -10,
  numberInputMax: 10,
  fineStep: 0.01,
  coarseStep: 0.05,
};

const zLoRAsState = z.object({
  loras: z.array(zLoRA),
  sortMode: z.enum(['manual', 'alphabetical', 'category']).default('manual'),
  manualOrder: z.array(z.string()).default([]),
  categoryViewEnabled: z.boolean().default(false),
  selectedCategory: z.string().nullable().default(null),
});
type LoRAsState = z.infer<typeof zLoRAsState>;
type LoRASortMode = LoRAsState['sortMode'];

const getInitialState = (): LoRAsState => ({
  loras: [],
  sortMode: 'manual',
  manualOrder: [],
  categoryViewEnabled: false,
  selectedCategory: null,
});

const selectLoRA = (state: LoRAsState, id: string) => state.loras.find((lora) => lora.id === id);

const slice = createSlice({
  name: 'loras',
  initialState: getInitialState(),
  reducers: {
    loraAdded: {
      reducer: (state, action: PayloadAction<{ model: LoRAModelConfig; id: string }>) => {
        const { model, id } = action.payload;
        const parsedModel = zModelIdentifierField.parse(model);
        const defaultLoRAConfig: Pick<LoRA, 'weight' | 'isEnabled'> = {
          weight: model.default_settings?.weight ?? DEFAULT_LORA_WEIGHT_CONFIG.initial,
          isEnabled: true,
        };
        state.loras.push({ ...defaultLoRAConfig, model: parsedModel, id });
        state.manualOrder.push(id);
      },
      prepare: (payload: { model: LoRAModelConfig }) => ({ payload: { ...payload, id: uuidv4() } }),
    },
    loraRecalled: (state, action: PayloadAction<{ lora: LoRA }>) => {
      const { lora } = action.payload;
      // Remove existing lora if it exists
      const existingIds = state.loras
        .filter((l) => l.model.key === lora.model.key || l.id === lora.id)
        .map((l) => l.id);
      state.loras = state.loras.filter((l) => l.model.key !== lora.model.key && l.id !== lora.id);
      state.manualOrder = state.manualOrder.filter((id) => !existingIds.includes(id));
      // Add the recalled lora
      state.loras.push(lora);
      state.manualOrder.push(lora.id);
    },
    loraDeleted: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      state.loras = state.loras.filter((lora) => lora.id !== id);
      state.manualOrder = state.manualOrder.filter((loraId) => loraId !== id);
    },
    loraWeightChanged: (state, action: PayloadAction<{ id: string; weight: number }>) => {
      const { id, weight } = action.payload;
      const lora = selectLoRA(state, id);
      if (!lora) {
        return;
      }
      lora.weight = weight;
    },
    loraIsEnabledChanged: (state, action: PayloadAction<{ id: string; isEnabled: boolean }>) => {
      const { id, isEnabled } = action.payload;
      const lora = selectLoRA(state, id);
      if (!lora) {
        return;
      }
      lora.isEnabled = isEnabled;
    },
    lorasReordered: (state, action: PayloadAction<{ loraIds: string[] }>) => {
      const { loraIds } = action.payload;
      const reordered: LoRA[] = [];
      for (const id of loraIds) {
        const lora = state.loras.find((l) => l.id === id);
        if (lora) {
          reordered.push(lora);
        }
      }
      state.loras = reordered;
      // Manual reordering updates manualOrder and switches to manual mode
      state.sortMode = 'manual';
      state.manualOrder = loraIds;
    },
    lorasSortModeChanged: (state, action: PayloadAction<LoRASortMode>) => {
      state.sortMode = action.payload;
    },
    loraAllDeleted: (state) => {
      state.loras = [];
      state.manualOrder = [];
    },
    loraCategoryViewToggled: (state) => {
      state.categoryViewEnabled = !state.categoryViewEnabled;
      // Reset selected category when toggling off
      if (!state.categoryViewEnabled) {
        state.selectedCategory = null;
      }
    },
    loraSelectedCategoryChanged: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
    },
    lorasReplacedFromPreset: (state, action: PayloadAction<{ loras: LoRA[] }>) => {
      const { loras } = action.payload;
      state.loras = loras;
      state.manualOrder = loras.map((lora) => lora.id);
    },
  },
  extraReducers(builder) {
    builder.addCase(paramsReset, () => {
      // When a new session is requested, clear all LoRAs
      return getInitialState();
    });
  },
});

export const {
  loraAdded,
  loraRecalled,
  loraDeleted,
  loraWeightChanged,
  loraIsEnabledChanged,
  loraAllDeleted,
  lorasReordered,
  lorasSortModeChanged,
  loraCategoryViewToggled,
  loraSelectedCategoryChanged,
  lorasReplacedFromPreset,
} = slice.actions;

export const lorasSliceConfig: SliceConfig<typeof slice> = {
  slice,
  schema: zLoRAsState,
  getInitialState,
  persistConfig: {
    migrate: (state) => zLoRAsState.parse(state),
  },
};

export const selectLoRAsSlice = (state: RootState) => state.loras;
export const selectAddedLoRAs = createSelector(selectLoRAsSlice, (loras) => loras.loras);
export const selectLoRASortMode = createSelector(selectLoRAsSlice, (loras) => loras.sortMode);
export const selectManualOrder = createSelector(selectLoRAsSlice, (loras) => loras.manualOrder);
export const selectLoraCategoryViewEnabled = createSelector(selectLoRAsSlice, (loras) => loras.categoryViewEnabled);
export const selectLoraSelectedCategory = createSelector(selectLoRAsSlice, (loras) => loras.selectedCategory);
export const buildSelectLoRA = (id: string) =>
  createSelector([selectLoRAsSlice], (loras) => {
    return selectLoRA(loras, id);
  });
