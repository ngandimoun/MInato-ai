'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Download, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PyodideInstance {
  runPython: (code: string) => any;
  loadPackage: (packages: string[]) => Promise<void>;
  globals: any;
}

declare global {
  interface Window {
    loadPyodide: () => Promise<PyodideInstance>;
  }
}

interface PythonSandboxProps {
  data?: any[];
  onResult?: (result: any) => void;
  className?: string;
}

export function PythonSandbox({ data = [], onResult, className }: PythonSandboxProps) {
  const [pyodide, setPyodide] = useState<PyodideInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState(getDefaultAnalysisCode());
  const outputRef = useRef<HTMLDivElement>(null);

  // Initialize Pyodide
  useEffect(() => {
    let mounted = true;

    async function initPyodide() {
      setLoading(true);
      try {
        // Load Pyodide script
        if (!window.loadPyodide) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
          script.onload = () => initPyodide();
          document.head.appendChild(script);
          return;
        }

        const pyodideInstance = await window.loadPyodide();
        
        // Load essential packages
        await pyodideInstance.loadPackage(['pandas', 'numpy', 'matplotlib']);
        
        if (mounted) {
          setPyodide(pyodideInstance);
          toast({
            title: "Python Ready!",
            description: "Pyodide loaded with pandas, numpy, and matplotlib",
          });
        }
      } catch (err: any) {
        console.error('Failed to load Pyodide:', err);
        if (mounted) {
          setError(`Failed to initialize Python: ${err.message}`);
          toast({
            title: "Python Failed to Load",
            description: "Using JavaScript fallback for analysis",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initPyodide();

    return () => {
      mounted = false;
    };
  }, []);

  // Update data in Python environment when data changes
  useEffect(() => {
    if (pyodide && data.length > 0) {
      try {
        pyodide.globals.set('input_data', data);
        setOutput(prev => prev + '\n📊 Data loaded into Python environment\n');
      } catch (err: any) {
        console.error('Failed to set data:', err);
      }
    }
  }, [pyodide, data]);

  const runPythonCode = async () => {
    if (!pyodide) {
      toast({
        title: "Python Not Ready",
        description: "Please wait for Python to initialize",
        variant: "destructive",
      });
      return;
    }

    setRunning(true);
    setError('');
    setOutput('');

    try {
      // Capture stdout
      pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
      `);

      // Set up data
      if (data.length > 0) {
        pyodide.globals.set('input_data', data);
      }

      // Run user code
      const result = pyodide.runPython(code);

      // Get stdout
      const stdout = pyodide.runPython('sys.stdout.getvalue()');
      
      // Reset stdout
      pyodide.runPython(`
sys.stdout = sys.__stdout__
      `);

      const output = stdout || (result !== undefined ? String(result) : '');
      setOutput(output);

      // Try to parse as JSON for structured results
      let parsedResult;
      try {
        parsedResult = JSON.parse(output);
      } catch {
        parsedResult = { output, raw: result };
      }

      onResult?.(parsedResult);

      toast({
        title: "Code Executed Successfully",
        description: `Generated ${output.length} characters of output`,
      });

    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error occurred';
      setError(errorMsg);
      toast({
        title: "Execution Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const stopExecution = () => {
    // Note: Pyodide doesn't support stopping execution mid-way
    setRunning(false);
    toast({
      title: "Execution Stopped",
      description: "Note: Python code may continue running in background",
      variant: "destructive",
    });
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    toast({
      title: "Copied to Clipboard",
      description: "Output copied successfully",
    });
  };

  const downloadOutput = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'python_output.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadTemplate = (template: string) => {
    switch (template) {
      case 'basic':
        setCode(getDefaultAnalysisCode());
        break;
      case 'visualization':
        setCode(getVisualizationCode());
        break;
      case 'statistics':
        setCode(getStatisticsCode());
        break;
      case 'ml':
        setCode(getMachineLearningCode());
        break;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🐍 Python Sandbox
                {loading && <Badge variant="secondary">Loading...</Badge>}
                {pyodide && <Badge variant="default">Ready</Badge>}
                {!pyodide && !loading && <Badge variant="destructive">Unavailable</Badge>}
              </CardTitle>
              <CardDescription>
                Run Python code with pandas, numpy, and matplotlib in your browser
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={runPythonCode}
                disabled={!pyodide || running || loading}
                size="sm"
              >
                <Play className="w-4 h-4 mr-2" />
                Run
              </Button>
              {running && (
                <Button onClick={stopExecution} variant="destructive" size="sm">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTemplate('basic')}
            >
              Basic Analysis
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTemplate('visualization')}
            >
              Visualization
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTemplate('statistics')}
            >
              Statistics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTemplate('ml')}
            >
              Machine Learning
            </Button>
          </div>

          {/* Code Editor */}
          <div>
            <label className="text-sm font-medium mb-2 block">Python Code:</label>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your Python code here..."
              className="font-mono text-sm min-h-[300px]"
              disabled={running}
            />
          </div>

          {/* Output */}
          {(output || error) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Output:</label>
                <div className="flex gap-2">
                  <Button onClick={copyOutput} variant="outline" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button onClick={downloadOutput} variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div
                ref={outputRef}
                className={`p-3 rounded-md border font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-auto ${
                  error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200'
                }`}
              >
                {error || output || 'No output'}
              </div>
            </div>
          )}

          {/* Data Info */}
          {data.length > 0 && (
            <div className="text-sm text-gray-600">
              📊 {data.length} records available in <code>input_data</code> variable
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Template code functions
function getDefaultAnalysisCode(): string {
  return `import pandas as pd
import numpy as np
import json

# Your data is available in 'input_data' variable
if 'input_data' in globals():
    df = pd.DataFrame(input_data)
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print("\\nFirst 5 rows:")
    print(df.head())
    print("\\nData types:")
    print(df.dtypes)
    print("\\nBasic statistics:")
    print(df.describe())
else:
    print("No data available. Load some data first!")
    df = pd.DataFrame()

# Example analysis
if not df.empty:
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        print(f"\\nNumeric columns: {list(numeric_cols)}")
        print("Correlation matrix:")
        print(df[numeric_cols].corr())
`;
}

function getVisualizationCode(): string {
  return `import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json
from io import StringIO
import base64

# Create DataFrame from input data
if 'input_data' in globals():
    df = pd.DataFrame(input_data)
    
    # Create visualizations
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    fig.suptitle('Data Analysis Visualizations')
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    if len(numeric_cols) >= 1:
        # Histogram of first numeric column
        df[numeric_cols[0]].hist(ax=axes[0,0], bins=20)
        axes[0,0].set_title(f'Distribution of {numeric_cols[0]}')
        
        if len(numeric_cols) >= 2:
            # Scatter plot of first two numeric columns
            axes[0,1].scatter(df[numeric_cols[0]], df[numeric_cols[1]])
            axes[0,1].set_xlabel(numeric_cols[0])
            axes[0,1].set_ylabel(numeric_cols[1])
            axes[0,1].set_title(f'{numeric_cols[0]} vs {numeric_cols[1]}')
    
    # Box plot of all numeric columns
    if len(numeric_cols) > 0:
        df[numeric_cols].boxplot(ax=axes[1,0])
        axes[1,0].set_title('Box Plot of Numeric Variables')
        axes[1,0].tick_params(axis='x', rotation=45)
    
    # Categorical data analysis
    categorical_cols = df.select_dtypes(include=['object']).columns
    if len(categorical_cols) > 0:
        col = categorical_cols[0]
        value_counts = df[col].value_counts().head(10)
        value_counts.plot(kind='bar', ax=axes[1,1])
        axes[1,1].set_title(f'Top 10 values in {col}')
        axes[1,1].tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    plt.show()
    
    print("Visualizations created successfully!")
    print(f"Analyzed {len(df)} rows with {len(df.columns)} columns")
else:
    print("No data available for visualization!")
`;
}

function getStatisticsCode(): string {
  return `import pandas as pd
import numpy as np
from scipy import stats
import json

# Statistical analysis
if 'input_data' in globals():
    df = pd.DataFrame(input_data)
    
    results = {
        "dataset_info": {
            "rows": len(df),
            "columns": len(df.columns),
            "memory_usage": df.memory_usage(deep=True).sum()
        },
        "numeric_analysis": {},
        "categorical_analysis": {},
        "correlations": {},
        "outliers": {}
    }
    
    # Numeric columns analysis
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) > 0:
            results["numeric_analysis"][col] = {
                "count": int(len(series)),
                "mean": float(series.mean()),
                "median": float(series.median()),
                "std": float(series.std()),
                "min": float(series.min()),
                "max": float(series.max()),
                "skewness": float(stats.skew(series)),
                "kurtosis": float(stats.kurtosis(series)),
                "q25": float(series.quantile(0.25)),
                "q75": float(series.quantile(0.75))
            }
            
            # Outlier detection using IQR
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            outliers = series[(series < Q1 - 1.5 * IQR) | (series > Q3 + 1.5 * IQR)]
            results["outliers"][col] = {
                "count": len(outliers),
                "percentage": float(len(outliers) / len(series) * 100),
                "values": outliers.tolist()[:10]  # First 10 outliers
            }
    
    # Categorical analysis
    categorical_cols = df.select_dtypes(include=['object']).columns
    for col in categorical_cols:
        series = df[col].dropna()
        value_counts = series.value_counts()
        results["categorical_analysis"][col] = {
            "unique_count": int(series.nunique()),
            "most_frequent": str(value_counts.index[0]) if len(value_counts) > 0 else None,
            "most_frequent_count": int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
            "entropy": float(stats.entropy(value_counts.values)),
            "top_5": dict(value_counts.head().to_dict())
        }
    
    # Correlation analysis
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr()
        results["correlations"]["matrix"] = corr_matrix.to_dict()
        
        # Find strong correlations
        strong_corr = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i+1, len(corr_matrix.columns)):
                corr_val = corr_matrix.iloc[i, j]
                if abs(corr_val) > 0.7:
                    strong_corr.append({
                        "var1": corr_matrix.columns[i],
                        "var2": corr_matrix.columns[j],
                        "correlation": float(corr_val)
                    })
        results["correlations"]["strong_correlations"] = strong_corr
    
    print(json.dumps(results, indent=2))
else:
    print("No data available for statistical analysis!")
`;
}

function getMachineLearningCode(): string {
  return `import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, mean_squared_error, r2_score
import json

# Machine Learning Analysis
if 'input_data' in globals():
    df = pd.DataFrame(input_data)
    
    print("🤖 Starting Machine Learning Analysis...")
    print(f"Dataset: {df.shape[0]} rows, {df.shape[1]} columns")
    
    # Prepare data
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    categorical_cols = df.select_dtypes(include=['object']).columns
    
    if len(numeric_cols) == 0:
        print("❌ No numeric columns found for ML analysis")
    else:
        # Feature engineering
        X = df[numeric_cols].copy()
        
        # Handle missing values
        X = X.fillna(X.mean())
        
        print(f"✅ Features prepared: {list(X.columns)}")
        
        # If we have a target variable (last numeric column)
        if len(numeric_cols) > 1:
            target_col = numeric_cols[-1]
            y = X[target_col]
            X = X.drop(columns=[target_col])
            
            print(f"🎯 Target variable: {target_col}")
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Determine if classification or regression
            if y.nunique() < 10 and y.dtype in ['int64', 'object']:
                # Classification
                print("📊 Running Classification Analysis...")
                model = RandomForestClassifier(n_estimators=100, random_state=42)
                model.fit(X_train_scaled, y_train)
                
                y_pred = model.predict(X_test_scaled)
                
                print("\\n📈 Classification Results:")
                print(classification_report(y_test, y_pred))
                
                # Feature importance
                importance = dict(zip(X.columns, model.feature_importances_))
                sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
                
                print("\\n🔍 Feature Importance:")
                for feature, imp in sorted_importance:
                    print(f"  {feature}: {imp:.4f}")
                    
            else:
                # Regression
                print("📊 Running Regression Analysis...")
                model = RandomForestRegressor(n_estimators=100, random_state=42)
                model.fit(X_train_scaled, y_train)
                
                y_pred = model.predict(X_test_scaled)
                
                mse = mean_squared_error(y_test, y_pred)
                r2 = r2_score(y_test, y_pred)
                
                print(f"\\n📈 Regression Results:")
                print(f"  Mean Squared Error: {mse:.4f}")
                print(f"  R² Score: {r2:.4f}")
                print(f"  RMSE: {np.sqrt(mse):.4f}")
                
                # Feature importance
                importance = dict(zip(X.columns, model.feature_importances_))
                sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
                
                print("\\n🔍 Feature Importance:")
                for feature, imp in sorted_importance:
                    print(f"  {feature}: {imp:.4f}")
        else:
            # Unsupervised learning - clustering
            print("📊 Running Unsupervised Analysis (Clustering)...")
            from sklearn.cluster import KMeans
            from sklearn.decomposition import PCA
            
            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Optimal number of clusters using elbow method
            inertias = []
            K_range = range(1, min(11, len(X)))
            for k in K_range:
                kmeans = KMeans(n_clusters=k, random_state=42)
                kmeans.fit(X_scaled)
                inertias.append(kmeans.inertia_)
            
            # Use 3 clusters as default
            optimal_k = 3
            kmeans = KMeans(n_clusters=optimal_k, random_state=42)
            clusters = kmeans.fit_predict(X_scaled)
            
            print(f"\\n🎯 K-Means Clustering (k={optimal_k}):")
            unique, counts = np.unique(clusters, return_counts=True)
            for cluster, count in zip(unique, counts):
                print(f"  Cluster {cluster}: {count} points ({count/len(clusters)*100:.1f}%)")
            
            # PCA for dimensionality reduction
            if X.shape[1] > 2:
                pca = PCA(n_components=2)
                X_pca = pca.fit_transform(X_scaled)
                
                print(f"\\n🔍 PCA Analysis:")
                print(f"  Explained variance ratio: {pca.explained_variance_ratio_}")
                print(f"  Total variance explained: {sum(pca.explained_variance_ratio_):.3f}")
    
    print("\\n✅ Machine Learning analysis complete!")
else:
    print("❌ No data available for ML analysis!")
`;
} 