"""
Feature Flags System

Manages feature flags for the Living Dossier system to enable/disable
functionality and control feature rollouts.
"""

from .flags import FeatureFlagManager, get_flag_manager
from .api import router

__all__ = [
    'FeatureFlagManager',
    'get_flag_manager',
    'router'
] 