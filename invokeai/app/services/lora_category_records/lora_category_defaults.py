"""Default LoRA categories shared across the application."""

from typing import List, TypedDict


class LoraCategoryDefault(TypedDict):
    """Type definition for default LoRA category data."""

    id: str
    name: str
    color: str
    sort_order: int


# Default LoRA categories - these are always available and merged with custom categories
# Colors optimized for dark UI readability
DEFAULT_LORA_CATEGORIES: List[LoraCategoryDefault] = [
    {"id": "style", "name": "Style", "color": "#AB47BC", "sort_order": 0},  # Purple
    {"id": "character", "name": "Character", "color": "#81C784", "sort_order": 1},  # Green
    {"id": "concept", "name": "Concept", "color": "#42A5F5", "sort_order": 2},  # Blue
    {"id": "pose", "name": "Pose", "color": "#FF7043", "sort_order": 3},  # Orange
    {"id": "clothing", "name": "Clothing", "color": "#F06292", "sort_order": 4},  # Pink
    {"id": "background", "name": "Background", "color": "#26A69A", "sort_order": 5},  # Teal
    {"id": "quality", "name": "Quality/Enhancement", "color": "#FFEE58", "sort_order": 6},  # Yellow
]
