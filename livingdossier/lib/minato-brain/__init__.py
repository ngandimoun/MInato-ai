"""
Minato Brain - The core intelligence engine for Living Dossier
"""

# Import key components for easier access
try:
    from .ExecutionEngine import executeTask, executePlaybook, executeZeroShotTask, generateDynamicTask
    from .PlaybookGenerator import analyzeQuery, generatePlaybook, fillTaskParameters
    from .SynthesisEngine import synthesizeResults
    from .index import generateDossier, analyzeAndRefineQuery, getDossierStatus

    # Export the main functions
    __all__ = [
        'executeTask',
        'executePlaybook',
        'executeZeroShotTask',
        'generateDynamicTask',
        'analyzeQuery',
        'generatePlaybook',
        'fillTaskParameters',
        'synthesizeResults',
        'generateDossier',
        'analyzeAndRefineQuery',
        'getDossierStatus'
    ]
except ImportError as e:
    print(f"Warning: Some imports failed in minato-brain package: {e}")
    __all__ = [] 