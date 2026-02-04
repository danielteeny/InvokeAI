import type { RootState } from 'app/store/store';
import { getPrefixedId } from 'features/controlLayers/konva/util';
import { zModelIdentifierField } from 'features/nodes/types/common';
import type { Graph } from 'features/nodes/util/graph/generation/Graph';
import { modelConfigsAdapterSelectors, selectModelConfigsQuery } from 'services/api/endpoints/models';
import type { Invocation, LoRAModelConfig, S } from 'services/api/types';

/**
 * Add LoRAs for Flux 2 Klein models.
 * Unlike standard FLUX, Flux 2 Klein uses Qwen3 encoder (not CLIP+T5),
 * so we only connect the transformer to the LoRA loader.
 */
export const addFlux2LoRAs = (
  state: RootState,
  g: Graph,
  denoise: Invocation<'flux2_denoise'>,
  modelLoader: Invocation<'flux2_klein_model_loader'>
): void => {
  // Look up actual model configs to get real base model (needed for preset-loaded LoRAs)
  const modelConfigsResult = selectModelConfigsQuery(state);

  const enabledLoRAs = state.loras.loras.filter((l) => {
    if (!l.isEnabled) {
      return false;
    }
    // Look up actual LoRA config to get real base model
    const loraConfig = modelConfigsResult.data
      ? (modelConfigsAdapterSelectors.selectById(modelConfigsResult.data, l.model.key) as LoRAModelConfig | undefined)
      : undefined;
    const loraBase = loraConfig?.base ?? l.model.base;
    return loraBase === 'flux2';
  });

  if (enabledLoRAs.length === 0) {
    return;
  }

  const loraMetadata: S['LoRAMetadataField'][] = [];

  // We will collect LoRAs into a single collection node, then pass them to the LoRA collection loader, which applies
  // each LoRA to the transformer only (Flux 2 doesn't use CLIP/T5).
  const loraCollector = g.addNode({
    id: getPrefixedId('lora_collector'),
    type: 'collect',
  });
  const loraCollectionLoader = g.addNode({
    type: 'flux_lora_collection_loader',
    id: getPrefixedId('flux_lora_collection_loader'),
  });

  g.addEdge(loraCollector, 'collection', loraCollectionLoader, 'loras');
  // Only connect transformer (Flux 2 doesn't use CLIP/T5 encoders)
  g.addEdge(modelLoader, 'transformer', loraCollectionLoader, 'transformer');
  // Reroute transformer connection through the LoRA collection loader
  g.deleteEdgesTo(denoise, ['transformer']);
  g.addEdge(loraCollectionLoader, 'transformer', denoise, 'transformer');

  for (const lora of enabledLoRAs) {
    const { weight } = lora;
    const parsedModel = zModelIdentifierField.parse(lora.model);

    const loraSelector = g.addNode({
      type: 'lora_selector',
      id: getPrefixedId('lora_selector'),
      lora: parsedModel,
      weight,
    });

    loraMetadata.push({
      model: parsedModel,
      weight,
    });

    g.addEdge(loraSelector, 'lora', loraCollector, 'item');
  }

  g.upsertMetadata({ loras: loraMetadata });
};

/**
 * Add LoRAs for standard FLUX models (CLIP+T5 based).
 */
export const addFLUXLoRAs = (
  state: RootState,
  g: Graph,
  denoise: Invocation<'flux_denoise'>,
  modelLoader: Invocation<'flux_model_loader'>,
  fluxTextEncoder: Invocation<'flux_text_encoder'>
): void => {
  // Look up actual model configs to get real base model (needed for preset-loaded LoRAs)
  const modelConfigsResult = selectModelConfigsQuery(state);

  const enabledLoRAs = state.loras.loras.filter((l) => {
    if (!l.isEnabled) {
      return false;
    }
    // Look up actual LoRA config to get real base model
    const loraConfig = modelConfigsResult.data
      ? (modelConfigsAdapterSelectors.selectById(modelConfigsResult.data, l.model.key) as LoRAModelConfig | undefined)
      : undefined;
    const loraBase = loraConfig?.base ?? l.model.base;
    return loraBase === 'flux' || loraBase === 'flux2';
  });
  const loraCount = enabledLoRAs.length;

  if (loraCount === 0) {
    return;
  }

  const loraMetadata: S['LoRAMetadataField'][] = [];

  // We will collect LoRAs into a single collection node, then pass them to the LoRA collection loader, which applies
  // each LoRA to the transformer and text encoders.
  const loraCollector = g.addNode({
    id: getPrefixedId('lora_collector'),
    type: 'collect',
  });
  const loraCollectionLoader = g.addNode({
    type: 'flux_lora_collection_loader',
    id: getPrefixedId('flux_lora_collection_loader'),
  });

  g.addEdge(loraCollector, 'collection', loraCollectionLoader, 'loras');
  // Use model loader as transformer input
  g.addEdge(modelLoader, 'transformer', loraCollectionLoader, 'transformer');
  g.addEdge(modelLoader, 'clip', loraCollectionLoader, 'clip');
  g.addEdge(modelLoader, 't5_encoder', loraCollectionLoader, 't5_encoder');
  // Reroute model connections through the LoRA collection loader
  g.deleteEdgesTo(denoise, ['transformer']);
  g.deleteEdgesTo(fluxTextEncoder, ['clip', 't5_encoder']);
  g.addEdge(loraCollectionLoader, 'transformer', denoise, 'transformer');
  g.addEdge(loraCollectionLoader, 'clip', fluxTextEncoder, 'clip');
  g.addEdge(loraCollectionLoader, 't5_encoder', fluxTextEncoder, 't5_encoder');

  for (const lora of enabledLoRAs) {
    const { weight } = lora;
    const parsedModel = zModelIdentifierField.parse(lora.model);

    const loraSelector = g.addNode({
      type: 'lora_selector',
      id: getPrefixedId('lora_selector'),
      lora: parsedModel,
      weight,
    });

    loraMetadata.push({
      model: parsedModel,
      weight,
    });

    g.addEdge(loraSelector, 'lora', loraCollector, 'item');
  }

  g.upsertMetadata({ loras: loraMetadata });
};
