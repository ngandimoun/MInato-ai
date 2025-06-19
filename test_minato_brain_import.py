"""
Test script to verify the minato_brain package can be imported
"""

import sys
print("Python version:", sys.version)

# Try to import the package
try:
    print("\nImporting the package...")
    from livingdossier.lib import minato_brain
    print("✅ Successfully imported minato_brain package")
    
    # Try to use a function from the package
    print("\nTrying to use a function...")
    result = minato_brain.analyzeQuery("Test query")
    print(f"✅ Function call successful: {result}")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Other error: {e}")

print("\nTest completed") 