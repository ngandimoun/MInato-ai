"""
Test script to verify the fixes in the minato-brain modules
"""

import sys
import os

print("Python version:", sys.version)
print("Current directory:", os.getcwd())

print("\nChecking ExecutionEngine.ts...")
try:
    # Check if the file exists
    engine_path = os.path.join('livingdossier', 'lib', 'minato-brain', 'ExecutionEngine.ts')
    if os.path.exists(engine_path):
        print(f"✅ File exists: {engine_path}")
        # Read the first few lines
        with open(engine_path, 'r') as f:
            first_lines = [f.readline() for _ in range(5)]
        print("First 5 lines:")
        for line in first_lines:
            print(f"  {line.strip()}")
    else:
        print(f"❌ File not found: {engine_path}")
except Exception as e:
    print(f"Error checking ExecutionEngine.ts: {e}")

print("\nChecking index.ts...")
try:
    # Check if the file exists
    index_path = os.path.join('livingdossier', 'lib', 'minato-brain', 'index.ts')
    if os.path.exists(index_path):
        print(f"✅ File exists: {index_path}")
        # Read the first few lines
        with open(index_path, 'r') as f:
            first_lines = [f.readline() for _ in range(5)]
        print("First 5 lines:")
        for line in first_lines:
            print(f"  {line.strip()}")
    else:
        print(f"❌ File not found: {index_path}")
except Exception as e:
    print(f"Error checking index.ts: {e}")

print("\nTest completed") 