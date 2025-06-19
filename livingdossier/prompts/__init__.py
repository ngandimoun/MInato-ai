"""Prompt management system for Living Dossier agents."""

from .gemini_prompt import get_gemini_system_prompt
from .agent_builder_prompt import get_agent_builder_prompt
from .prompt import get_system_prompt

__all__ = [
    'get_gemini_system_prompt',
    'get_agent_builder_prompt', 
    'get_system_prompt'
] 