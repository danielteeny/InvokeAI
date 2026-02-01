# Prefixes used to distinguish between transformer and CLIP text encoder keys in the FLUX InvokeAI LoRA format.
FLUX_LORA_TRANSFORMER_PREFIX = "lora_transformer-"
FLUX_LORA_CLIP_PREFIX = "lora_clip-"
FLUX_LORA_T5_PREFIX = "lora_t5-"

# Flux 2 uses diffusers-native layer names (transformer_blocks, single_transformer_blocks)
# instead of BFL format (double_blocks, single_blocks), so it needs a separate prefix.
FLUX2_LORA_TRANSFORMER_PREFIX = "lora_flux2_transformer-"
