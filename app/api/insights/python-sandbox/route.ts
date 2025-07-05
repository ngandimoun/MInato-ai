import { NextRequest, NextResponse } from 'next/server';

/**
 * Python Sandbox API Route
 * Serves HTML with Pyodide for browser-based Python execution
 * Inspired by Julius.ai's approach to safe code execution
 */
export async function POST(request: NextRequest) {
  try {
    const { code, data = [], analysisType = 'comprehensive' } = await request.json();

    // Generate HTML with embedded Pyodide Python sandbox
    const sandboxHtml = generatePythonSandboxHtml(code, data, analysisType);

    return new NextResponse(sandboxHtml, {
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline';"
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: `Python sandbox error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Serve empty sandbox for testing
  const sandboxHtml = generatePythonSandboxHtml('print("Python sandbox ready!")', [], 'basic');
  
  return new NextResponse(sandboxHtml, {
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': 'SAMEORIGIN'
    }
  });
}

function generatePythonSandboxHtml(userCode: string, data: any[], analysisType: string): string {
  const dataJson = JSON.stringify(data);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Python Analytics Sandbox</title>
    <script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .status {
            padding: 15px 20px;
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 500;
        }
        .status.loading { background: #fef3c7; color: #92400e; }
        .status.ready { background: #d1fae5; color: #065f46; }
        .status.error { background: #fee2e2; color: #991b1b; }
        .content {
            padding: 20px;
        }
        .output {
            background: #1e293b;
            color: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', monospace;
            white-space: pre-wrap;
            min-height: 200px;
            overflow-y: auto;
            max-height: 400px;
        }
        .charts {
            margin-top: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }
        .chart {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        .chart-title {
            background: #f8fafc;
            padding: 10px 15px;
            font-weight: 600;
            border-bottom: 1px solid #e2e8f0;
        }
        .chart-content {
            padding: 15px;
            text-align: center;
        }
        .insights {
            margin-top: 20px;
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 15px;
        }
        .insight-item {
            margin: 8px 0;
            padding: 8px 12px;
            background: white;
            border-radius: 6px;
            border-left: 4px solid #0ea5e9;
        }
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐍 Python Analytics Sandbox</h1>
            <p>Secure browser-based Python execution with Pyodide</p>
        </div>
        
        <div id="status" class="status loading">
            <span class="spinner"></span>
            Initializing Python environment...
        </div>
        
        <div class="content">
            <div id="output" class="output">Waiting for Python to initialize...</div>
            <div id="charts" class="charts"></div>
            <div id="insights" class="insights" style="display: none;">
                <h3>📊 Analysis Insights</h3>
                <div id="insights-content"></div>
            </div>
        </div>
    </div>

    <script>
        let pyodide;
        const outputElement = document.getElementById('output');
        const statusElement = document.getElementById('status');
        const chartsElement = document.getElementById('charts');
        const insightsElement = document.getElementById('insights');
        const insightsContent = document.getElementById('insights-content');

        // Data from server
        const inputData = ${dataJson};
        const analysisType = '${analysisType}';

        function updateStatus(message, type = 'loading') {
            statusElement.className = \`status \${type}\`;
            statusElement.innerHTML = type === 'loading' 
                ? \`<span class="spinner"></span>\${message}\`
                : message;
        }

        function appendOutput(text) {
            outputElement.textContent += text + '\\n';
            outputElement.scrollTop = outputElement.scrollHeight;
        }

        function createChart(chartData) {
            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart';
            
            const title = document.createElement('div');
            title.className = 'chart-title';
            title.textContent = chartData.title || 'Chart';
            
            const content = document.createElement('div');
            content.className = 'chart-content';
            
            if (chartData.type === 'bar' || chartData.type === 'pie') {
                // Simple HTML charts for demo
                content.innerHTML = \`<p><strong>Chart Type:</strong> \${chartData.type}</p><pre>\${JSON.stringify(chartData.data, null, 2)}</pre>\`;
            } else {
                content.innerHTML = \`<pre>\${JSON.stringify(chartData, null, 2)}</pre>\`;
            }
            
            chartDiv.appendChild(title);
            chartDiv.appendChild(content);
            chartsElement.appendChild(chartDiv);
        }

        function displayInsights(insights) {
            if (insights && insights.length > 0) {
                insightsContent.innerHTML = '';
                insights.forEach(insight => {
                    const item = document.createElement('div');
                    item.className = 'insight-item';
                    item.textContent = insight;
                    insightsContent.appendChild(item);
                });
                insightsElement.style.display = 'block';
            }
        }

        async function initializePython() {
            try {
                updateStatus('Loading Pyodide...', 'loading');
                pyodide = await loadPyodide();
                
                updateStatus('Installing packages...', 'loading');
                await pyodide.loadPackage(['pandas', 'numpy', 'matplotlib', 'scipy']);
                
                updateStatus('Setting up environment...', 'loading');
                
                // Set up Python environment
                pyodide.globals.set('input_data', inputData);
                pyodide.globals.set('analysis_type', analysisType);
                
                // Capture output
                pyodide.runPython(\`
import sys
from io import StringIO
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Redirect stdout to capture prints
sys.stdout = StringIO()

# Global results object
results = {
    "output": "",
    "charts": [],
    "insights": [],
    "success": False,
    "error": None
}
                \`);
                
                updateStatus('✅ Python ready! Executing analysis...', 'ready');
                await executeAnalysis();
                
            } catch (error) {
                updateStatus(\`❌ Error: \${error.message}\`, 'error');
                appendOutput(\`Initialization error: \${error.message}\`);
            }
        }

        async function executeAnalysis() {
            try {
                const analysisCode = \`
# Execute user code
try:
    ${userCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')}
    
    # Capture any printed output
    results["output"] = sys.stdout.getvalue()
    results["success"] = True
    
    # If there's a DataFrame, do automatic analysis
    if 'df' in locals() and hasattr(df, 'shape'):
        results["insights"].append(f"Dataset contains {df.shape[0]} rows and {df.shape[1]} columns")
        
        # Numeric analysis
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            results["insights"].append(f"Found {len(numeric_cols)} numeric columns")
            
            # Generate simple chart data
            for col in numeric_cols[:3]:  # Limit to first 3 columns
                series = df[col].dropna()
                if len(series) > 0:
                    results["charts"].append({
                        "type": "bar",
                        "title": f"Statistics for {col}",
                        "data": {
                            "categories": ["Min", "Mean", "Max"],
                            "values": [float(series.min()), float(series.mean()), float(series.max())]
                        }
                    })
        
        # Categorical analysis
        categorical_cols = df.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            results["insights"].append(f"Found {len(categorical_cols)} categorical columns")
            
            for col in categorical_cols[:2]:  # Limit to first 2 columns
                value_counts = df[col].value_counts().head(5)
                if len(value_counts) > 0:
                    results["charts"].append({
                        "type": "pie",
                        "title": f"Distribution of {col}",
                        "data": value_counts.to_dict()
                    })

except Exception as e:
    results["error"] = str(e)
    results["output"] = sys.stdout.getvalue() + f"\\nError: {str(e)}"

# Output results as JSON
print("__RESULTS_START__")
print(json.dumps(results))
print("__RESULTS_END__")
                \`;

                pyodide.runPython(analysisCode);
                
                // Get the output
                const output = pyodide.runPython('sys.stdout.getvalue()');
                
                // Parse results
                const resultsMatch = output.match(/__RESULTS_START__\\n(.*)\\n__RESULTS_END__/s);
                if (resultsMatch) {
                    try {
                        const results = JSON.parse(resultsMatch[1]);
                        
                        // Display output
                        if (results.output) {
                            appendOutput(results.output);
                        }
                        
                        // Display charts
                        if (results.charts && results.charts.length > 0) {
                            results.charts.forEach(createChart);
                        }
                        
                        // Display insights
                        if (results.insights && results.insights.length > 0) {
                            displayInsights(results.insights);
                        }
                        
                        if (results.success) {
                            updateStatus('✅ Analysis completed successfully!', 'ready');
                        } else if (results.error) {
                            updateStatus(\`❌ Analysis error: \${results.error}\`, 'error');
                        }
                        
                    } catch (parseError) {
                        appendOutput('Error parsing results');
                        updateStatus('❌ Results parsing error', 'error');
                    }
                } else {
                    appendOutput(output);
                    updateStatus('✅ Code executed', 'ready');
                }
                
            } catch (error) {
                appendOutput(\`Execution error: \${error.message}\`);
                updateStatus(\`❌ Execution error: \${error.message}\`, 'error');
            }
        }

        // Initialize when page loads
        window.addEventListener('load', initializePython);
    </script>
</body>
</html>`;
} 