"""Flux 2 LoRA conversion utilities.

Flux 2 uses diffusers' Flux2Transformer2DModel with native diffusers layer names
(transformer_blocks.*, single_transformer_blocks.*). Unlike Flux 1 which converts
to BFL format (double_blocks.*, single_blocks.*), Flux 2 LoRAs keep diffusers naming
so they match the actual model layer names.
"""

import re
from typing import Any, Dict

import torch

from invokeai.backend.patches.lora_conversions.flux_lora_constants import FLUX2_LORA_TRANSFORMER_PREFIX
from invokeai.backend.patches.model_patch_raw import ModelPatchRaw

# OneTrainer regex pattern - matches lora_transformer_* keys with diffusers-style layer names
FLUX_ONETRAINER_TRANSFORMER_KEY_REGEX = (
    r"lora_transformer_(single_transformer_blocks|transformer_blocks)_(\d+)_(\w+)\.(.*)"
)


def lora_model_from_flux2_diffusers_state_dict(
    state_dict: Dict[str, torch.Tensor], alpha: float | None
) -> ModelPatchRaw:
    """Convert diffusers-format Flux 2 LoRA to ModelPatchRaw without BFL conversion.

    Keeps diffusers layer names (transformer_blocks, single_transformer_blocks)
    since Flux2Transformer2DModel uses these names directly.

    Args:
        state_dict: The LoRA state dict in diffusers PEFT format.
        alpha: The alpha value for scaling. If None, uses rank as alpha.

    Returns:
        ModelPatchRaw with layers keyed by FLUX2_LORA_TRANSFORMER_PREFIX + diffusers layer name.
    """
    # Import here to avoid circular imports
    from invokeai.backend.patches.layers.utils import any_lora_layer_from_state_dict

    # Determine which prefix is used in the state dict
    has_base_model_prefix = any(k.startswith("base_model.model.") for k in state_dict.keys() if isinstance(k, str))
    prefix_to_strip = "base_model.model." if has_base_model_prefix else "transformer."

    # Group keys by layer (strip prefix and lora_A/lora_B suffix)
    grouped: dict[str, dict[str, torch.Tensor]] = {}
    for key, value in state_dict.items():
        if not isinstance(key, str):
            continue

        # Remove the model prefix (transformer. or base_model.model.)
        if key.startswith(prefix_to_strip):
            layer_key = key[len(prefix_to_strip) :]
        else:
            layer_key = key

        # Split off lora_A.weight or lora_B.weight suffix
        # e.g., "transformer_blocks.0.attn.to_q.lora_A.weight" -> "transformer_blocks.0.attn.to_q", "lora_A.weight"
        parts = layer_key.rsplit(".", maxsplit=2)
        if len(parts) >= 3:
            layer_name = parts[0]
            weight_key = ".".join(parts[1:])
        else:
            # Unexpected format, skip
            continue

        if layer_name not in grouped:
            grouped[layer_name] = {}
        grouped[layer_name][weight_key] = value

    # Convert grouped state dict to LoRA layers with Flux 2 prefix
    layers = {}
    for layer_name, weights in grouped.items():
        # Convert PEFT format (lora_A.weight, lora_B.weight) to standard format (lora_down.weight, lora_up.weight)
        layer_weights = {}
        if "lora_A.weight" in weights:
            layer_weights["lora_down.weight"] = weights["lora_A.weight"]
            layer_weights["lora_up.weight"] = weights["lora_B.weight"]
            if alpha is not None:
                layer_weights["alpha"] = torch.tensor(alpha)
        else:
            # Already in standard format or other format
            layer_weights = weights

        # Add Flux 2 prefix for LayerPatcher to use
        prefixed_key = f"{FLUX2_LORA_TRANSFORMER_PREFIX}{layer_name}"
        layers[prefixed_key] = any_lora_layer_from_state_dict(layer_weights)

    return ModelPatchRaw(layers=layers)


def is_state_dict_likely_in_flux2_onetrainer_format(state_dict: dict[str | int, Any]) -> bool:
    """Checks if the provided state dict is likely in the OneTrainer FLUX LoRA format.

    OneTrainer format uses diffusers-style layer names (transformer_blocks, single_transformer_blocks)
    which is the same naming that Flux 2 uses internally. This makes it compatible with Flux 2.

    This is intended to be a high-precision detector, but it is not guaranteed to have perfect precision.
    """
    # OneTrainer format uses lora_transformer_ prefix with diffusers-style layer names
    return all(
        re.match(FLUX_ONETRAINER_TRANSFORMER_KEY_REGEX, k)
        for k in state_dict.keys()
        if isinstance(k, str)
    )


def is_state_dict_likely_in_flux2_aitoolkit_format(state_dict: dict[str | int, Any]) -> bool:
    """Checks if the provided state dict is likely in AI-Toolkit format with BFL-style layer names.

    AI-Toolkit format uses diffusion_model.double_blocks.* and diffusion_model.single_blocks.*
    with BFL-style naming (img_attn, txt_attn, img_mlp, txt_mlp).
    """
    # AI-Toolkit format uses diffusion_model prefix with BFL-style layer names
    has_bfl_structure = any(
        k.startswith("diffusion_model.double_blocks.") or k.startswith("diffusion_model.single_blocks.")
        for k in state_dict.keys()
        if isinstance(k, str)
    )
    return has_bfl_structure


def lora_model_from_flux2_onetrainer_state_dict(state_dict: Dict[str, torch.Tensor]) -> ModelPatchRaw:
    """Convert OneTrainer-format Flux 2 LoRA to ModelPatchRaw.

    OneTrainer format uses underscores between layer names (Kohya-style) but with diffusers layer naming.
    We convert underscores back to periods and keep the diffusers layer names (no BFL conversion).

    Args:
        state_dict: The LoRA state dict in OneTrainer format.

    Returns:
        ModelPatchRaw with layers keyed by FLUX2_LORA_TRANSFORMER_PREFIX + diffusers layer name.
    """
    # Import here to avoid circular imports
    from invokeai.backend.patches.layers.base_layer_patch import BaseLayerPatch
    from invokeai.backend.patches.layers.utils import any_lora_layer_from_state_dict
    from invokeai.backend.patches.lora_conversions.flux_onetrainer_lora_conversion_utils import (
        flux_transformer_kohya_parsing_tree,
    )
    from invokeai.backend.patches.lora_conversions.kohya_key_utils import insert_periods_into_kohya_key

    # Group keys by layer
    grouped_state_dict: dict[str, dict[str, torch.Tensor]] = {}
    for key, value in state_dict.items():
        layer_name, param_name = key.split(".", 1)
        if layer_name not in grouped_state_dict:
            grouped_state_dict[layer_name] = {}
        grouped_state_dict[layer_name][param_name] = value

    # Convert Kohya-style keys (underscores) to diffusers keys (periods)
    lora_prefix = "lora_"
    lora_prefix_length = len(lora_prefix)
    converted_state_dict: dict[str, dict[str, torch.Tensor]] = {}

    for key, layer_weights in grouped_state_dict.items():
        if not key.startswith("lora_transformer"):
            # Skip non-transformer keys (CLIP, T5, etc.) - Flux 2 uses Qwen, not CLIP/T5
            continue

        # Remove the "lora_" prefix
        assert key.startswith(lora_prefix)
        new_key = key[lora_prefix_length:]

        # Add periods to the Kohya-style module keys using the parsing tree
        new_key = insert_periods_into_kohya_key(new_key, flux_transformer_kohya_parsing_tree)

        # Remove "transformer." prefix since we add our own prefix later
        if new_key.startswith("transformer."):
            new_key = new_key[len("transformer."):]

        converted_state_dict[new_key] = layer_weights

    # Create LoRA layers with Flux 2 prefix
    layers: dict[str, BaseLayerPatch] = {}
    for layer_name, layer_weights in converted_state_dict.items():
        prefixed_key = f"{FLUX2_LORA_TRANSFORMER_PREFIX}{layer_name}"
        layers[prefixed_key] = any_lora_layer_from_state_dict(layer_weights)

    return ModelPatchRaw(layers=layers)


def lora_model_from_flux2_aitoolkit_state_dict(state_dict: Dict[str, torch.Tensor]) -> ModelPatchRaw:
    """Convert AI-Toolkit-format LoRA with BFL naming to work with Flux 2's diffusers naming.

    AI-Toolkit format uses diffusion_model.double_blocks.*/single_blocks.* (BFL naming)
    but Flux 2 uses transformer_blocks.*/single_transformer_blocks.* (diffusers naming).

    This function converts BFL-style layer names to diffusers layer names and splits
    merged QKV weights into separate Q, K, V LoRAs.

    Args:
        state_dict: The LoRA state dict in AI-Toolkit format with BFL naming.

    Returns:
        ModelPatchRaw with layers keyed by FLUX2_LORA_TRANSFORMER_PREFIX + diffusers layer name.
    """
    # Import here to avoid circular imports
    from invokeai.backend.patches.layers.base_layer_patch import BaseLayerPatch
    from invokeai.backend.patches.layers.utils import any_lora_layer_from_state_dict

    # Rename PEFT keys to standard format
    renamed_state_dict: dict[str, torch.Tensor] = {}
    for key, value in state_dict.items():
        renamed_key = key.replace(".lora_A.", ".lora_down.").replace(".lora_B.", ".lora_up.")
        renamed_state_dict[renamed_key] = value

    # Group by layer
    grouped: dict[str, dict[str, torch.Tensor]] = {}
    for key, value in renamed_state_dict.items():
        # Split off the layer name and param name
        parts = key.rsplit(".", maxsplit=2)
        if len(parts) >= 3:
            layer_name = parts[0]
            weight_key = ".".join(parts[1:])
        else:
            continue

        # Remove diffusion_model. prefix
        if layer_name.startswith("diffusion_model."):
            layer_name = layer_name[len("diffusion_model."):]

        if layer_name not in grouped:
            grouped[layer_name] = {}
        grouped[layer_name][weight_key] = value

    # Convert BFL layer names to diffusers layer names
    layers: dict[str, BaseLayerPatch] = {}

    for bfl_layer_name, layer_weights in grouped.items():
        # Handle merged QKV layers by splitting them
        split_layers = _convert_bfl_layer_to_diffusers_layers(bfl_layer_name, layer_weights)
        for diffusers_name, weights in split_layers.items():
            prefixed_key = f"{FLUX2_LORA_TRANSFORMER_PREFIX}{diffusers_name}"
            layers[prefixed_key] = any_lora_layer_from_state_dict(weights)

    return ModelPatchRaw(layers=layers)


def _convert_bfl_layer_to_diffusers_layers(
    bfl_name: str, weights: dict[str, torch.Tensor]
) -> dict[str, dict[str, torch.Tensor]]:
    """Convert a BFL-style layer to one or more diffusers-style layers.

    For merged QKV layers, this splits them into separate Q, K, V LoRAs.

    Returns:
        Dict mapping diffusers layer names to their weights.
    """
    result: dict[str, dict[str, torch.Tensor]] = {}

    # Double blocks mapping
    double_match = re.match(r"double_blocks\.(\d+)\.(.+)", bfl_name)
    if double_match:
        block_idx = double_match.group(1)
        sublayer = double_match.group(2)

        # Handle merged QKV - split into separate Q, K, V
        if sublayer == "img_attn.qkv":
            _split_qkv_to_separate(
                weights, f"transformer_blocks.{block_idx}.attn",
                ["to_q", "to_k", "to_v"], result
            )
            return result
        elif sublayer == "txt_attn.qkv":
            _split_qkv_to_separate(
                weights, f"transformer_blocks.{block_idx}.attn",
                ["add_q_proj", "add_k_proj", "add_v_proj"], result
            )
            return result

        # Simple 1:1 mappings
        mapping = {
            "img_attn.proj": f"transformer_blocks.{block_idx}.attn.to_out.0",
            "txt_attn.proj": f"transformer_blocks.{block_idx}.attn.to_add_out",
            "img_mlp.0": f"transformer_blocks.{block_idx}.ff.linear_in",
            "img_mlp.2": f"transformer_blocks.{block_idx}.ff.linear_out",
            "txt_mlp.0": f"transformer_blocks.{block_idx}.ff_context.linear_in",
            "txt_mlp.2": f"transformer_blocks.{block_idx}.ff_context.linear_out",
            "img_mod.lin": f"transformer_blocks.{block_idx}.norm1.linear",
            "txt_mod.lin": f"transformer_blocks.{block_idx}.norm1_context.linear",
        }
        if sublayer in mapping:
            result[mapping[sublayer]] = weights
        return result

    # Single blocks mapping
    single_match = re.match(r"single_blocks\.(\d+)\.(.+)", bfl_name)
    if single_match:
        block_idx = single_match.group(1)
        sublayer = single_match.group(2)

        # Handle linear1 (merged QKV + MLP) - maps to attn.to_qkv_mlp_proj in Flux 2
        if sublayer == "linear1":
            # In Flux 2, single blocks have a merged to_qkv_mlp_proj layer
            result[f"single_transformer_blocks.{block_idx}.attn.to_qkv_mlp_proj"] = weights
            return result

        # Simple 1:1 mappings
        mapping = {
            "linear2": f"single_transformer_blocks.{block_idx}.attn.to_out",
            "modulation.lin": f"single_transformer_blocks.{block_idx}.norm.linear",
        }
        if sublayer in mapping:
            result[mapping[sublayer]] = weights
        return result

    return result


def _split_qkv_to_separate(
    weights: dict[str, torch.Tensor],
    attn_prefix: str,
    layer_names: list[str],
    result: dict[str, dict[str, torch.Tensor]],
) -> None:
    """Split merged QKV LoRA weights into separate Q, K, V LoRAs.

    The lora_up weight has shape [3*hidden, rank] and needs to be split into 3 parts.
    The lora_down weight is shared across all 3.
    """
    lora_down = weights.get("lora_down.weight")
    lora_up = weights.get("lora_up.weight")

    if lora_down is None or lora_up is None:
        return

    # Split lora_up into 3 equal parts along dim 0
    hidden_size = lora_up.shape[0] // 3
    up_q = lora_up[:hidden_size]
    up_k = lora_up[hidden_size:2*hidden_size]
    up_v = lora_up[2*hidden_size:]

    # Create separate LoRA layers with shared lora_down
    for name, up_weight in zip(layer_names, [up_q, up_k, up_v]):
        layer_weights = {
            "lora_down.weight": lora_down,  # Shared
            "lora_up.weight": up_weight,
        }
        if "alpha" in weights:
            layer_weights["alpha"] = weights["alpha"]
        result[f"{attn_prefix}.{name}"] = layer_weights


def _split_linear1_to_separate(
    weights: dict[str, torch.Tensor],
    block_prefix: str,
    result: dict[str, dict[str, torch.Tensor]],
) -> None:
    """Split merged linear1 (Q, K, V, proj_mlp) LoRA weights into separate layers.

    For single transformer blocks, linear1 contains Q, K, V, and proj_mlp merged together.
    The lora_up weight has shape [hidden + hidden + hidden + mlp_hidden, rank].
    """
    lora_down = weights.get("lora_down.weight")
    lora_up = weights.get("lora_up.weight")

    if lora_down is None or lora_up is None:
        return

    # For single blocks, we have Q, K, V (each hidden_size) + proj_mlp (4*hidden_size)
    # Total = 7 * hidden_size
    # But we don't know the exact split without more info, so we'll try a common split
    # Flux 2 Klein 9B: hidden=4096, so Q,K,V are 4096 each, proj_mlp might be different

    # For now, let's just apply the merged weight to the combined layer if it exists
    # Check if the model has a combined linear1 layer
    # If not, we need to figure out the split ratios

    # Try to infer the split from the shape
    total_out = lora_up.shape[0]

    # Common Flux hidden sizes: 3072 (Flux 1 dev), 4096 (Flux 2 Klein)
    # For Klein 9B, hidden_size = 4096, mlp_ratio = 4
    # Q, K, V each = 4096, proj_mlp = 4096 * 4 = 16384
    # Total = 3*4096 + 16384 = 12288 + 16384 = 28672

    # Try Klein 9B dimensions first
    hidden_size = 4096
    mlp_hidden = hidden_size * 4  # 16384 for Klein

    if total_out == 3 * hidden_size + mlp_hidden:  # 28672
        up_q = lora_up[:hidden_size]
        up_k = lora_up[hidden_size:2*hidden_size]
        up_v = lora_up[2*hidden_size:3*hidden_size]
        up_mlp = lora_up[3*hidden_size:]

        for name, up_weight in [
            ("attn.to_q", up_q),
            ("attn.to_k", up_k),
            ("attn.to_v", up_v),
            ("proj_mlp", up_mlp),
        ]:
            layer_weights = {
                "lora_down.weight": lora_down,
                "lora_up.weight": up_weight,
            }
            if "alpha" in weights:
                layer_weights["alpha"] = weights["alpha"]
            result[f"{block_prefix}.{name}"] = layer_weights
    else:
        # Unknown dimensions, skip this layer
        pass


