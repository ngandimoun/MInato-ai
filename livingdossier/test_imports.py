import sys
import os

# Add the current directory to the Python path
sys.path.append('.')

print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")

# Test imports from different modules
try:
    from backend.agentpress.xml_tool_parser import parse_xml_tool_calls
    print("✓ Successfully imported parse_xml_tool_calls from backend.agentpress.xml_tool_parser")
except Exception as e:
    print(f"✗ Error importing from backend.agentpress.xml_tool_parser: {e}")

try:
    from prompts.agent_builder_prompt import get_agent_builder_prompt
    print("✓ Successfully imported get_agent_builder_prompt from prompts.agent_builder_prompt")
except Exception as e:
    print(f"✗ Error importing from prompts.agent_builder_prompt: {e}")

# Test importing other modules directly
try:
    import fastapi
    print(f"✓ Successfully imported fastapi (version: {fastapi.__version__})")
except Exception as e:
    print(f"✗ Error importing fastapi: {e}")

try:
    import uvicorn
    print(f"✓ Successfully imported uvicorn (version: {uvicorn.__version__})")
except Exception as e:
    print(f"✗ Error importing uvicorn: {e}")

try:
    import streamlit
    print(f"✓ Successfully imported streamlit (version: {streamlit.__version__})")
except Exception as e:
    print(f"✗ Error importing streamlit: {e}")

try:
    import pandas
    print(f"✓ Successfully imported pandas (version: {pandas.__version__})")
except Exception as e:
    print(f"✗ Error importing pandas: {e}")

try:
    import numpy
    print(f"✓ Successfully imported numpy (version: {numpy.__version__})")
except Exception as e:
    print(f"✗ Error importing numpy: {e}")

try:
    import plotly
    print(f"✓ Successfully imported plotly (version: {plotly.__version__})")
except Exception as e:
    print(f"✗ Error importing plotly: {e}")

try:
    import matplotlib
    print(f"✓ Successfully imported matplotlib (version: {matplotlib.__version__})")
except Exception as e:
    print(f"✗ Error importing matplotlib: {e}")

print("\nAll import tests completed.") 