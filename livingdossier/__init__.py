"""
Living Dossier - A dynamic, interactive system for creating comprehensive research dossiers.

This package provides the core functionality for the Living Dossier system,
including semantic analysis, task planning, execution, and synthesis.
"""

import os
import sys

# Add the parent directory to sys.path to allow imports from the root project
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Version information
__version__ = "0.1.0"

__author__ = "Team Minato" 