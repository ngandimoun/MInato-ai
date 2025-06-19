"""
Core libraries for the Living Dossier system.
"""

# Make the minato_brain package importable
try:
    from . import minato_brain
except ImportError as e:
    print(f"Warning: Could not import minato_brain: {e}")

__all__ = ['minato_brain'] 