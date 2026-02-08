import type { BaseModelType } from 'features/nodes/types/common';
import type { MainModelConfig } from 'services/api/types';

import type { RefImageState } from './types';
import { getGlobalReferenceImageWarnings } from './validators';

const DEFAULT_MAX_ENABLED_GLOBAL_REF_IMAGES = 5;

const MAX_ENABLED_GLOBAL_REF_IMAGES_BY_BASE: Partial<Record<BaseModelType, number>> = {
  'sd-1': 5,
  sdxl: 5,
  flux: 5,
  flux2: 10,
};

export const getMaxEnabledGlobalRefImagesForModel = (model: MainModelConfig | null | undefined): number => {
  if (!model) {
    return DEFAULT_MAX_ENABLED_GLOBAL_REF_IMAGES;
  }
  return MAX_ENABLED_GLOBAL_REF_IMAGES_BY_BASE[model.base] ?? DEFAULT_MAX_ENABLED_GLOBAL_REF_IMAGES;
};

export const getEnabledGlobalRefImagesForModel = (
  entities: RefImageState[],
  model: MainModelConfig | null | undefined
): RefImageState[] => {
  const maxEnabled = getMaxEnabledGlobalRefImagesForModel(model);
  return entities
    .filter((entity) => entity.isEnabled)
    .filter((entity) => getGlobalReferenceImageWarnings(entity, model).length === 0)
    .slice(0, maxEnabled);
};
