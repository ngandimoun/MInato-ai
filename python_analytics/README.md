# Minato AI Python Analytics Engine

## Overview

The Minato AI Python Analytics Engine provides advanced statistical analysis, machine learning, and data science capabilities for the insights platform. It executes Python scripts via subprocess integration to perform complex analytics operations that go beyond basic JavaScript calculations.

## Features

- **Statistical Analysis**: Descriptive statistics, correlation analysis, hypothesis testing
- **Financial Analytics**: Revenue/expense analysis, trend detection, forecasting
- **Machine Learning**: Clustering, regression, anomaly detection
- **Time Series Analysis**: Seasonal decomposition, forecasting, trend analysis
- **Custom Analytics**: Support for custom Python scripts and analysis workflows

## System Requirements

### Python Environment
- Python 3.8 or higher
- pip package manager
- Virtual environment (recommended)

### Required Python Packages
```
pandas>=1.3.0
numpy>=1.21.0
scipy>=1.7.0
scikit-learn>=1.0.0
matplotlib>=3.4.0
seaborn>=0.11.0
plotly>=5.0.0
statsmodels>=0.12.0
```

## Installation & Setup

### 1. Create Python Virtual Environment

```bash
# Navigate to project root
cd /path/to/minatoai

# Create virtual environment
python -m venv python_analytics_env

# Activate virtual environment
# On Windows:
python_analytics_env\Scripts\activate
# On macOS/Linux:
source python_analytics_env/bin/activate
```

### 2. Install Dependencies

```bash
# Install required packages
pip install -r python_analytics/requirements.txt

# Verify installation
python -c "import pandas, numpy, scipy, sklearn; print('All packages installed successfully')"
```

### 3. Configure Environment Variables

Add to your `.env.local` file:

```env
# Python Analytics Configuration
PYTHON_PATH=python_analytics_env/bin/python  # Adjust path for your system
PYTHON_ANALYTICS_ENABLED=true
ANALYTICS_DATA_DIR=python_analytics/data
ANALYTICS_OUTPUT_DIR=python_analytics/output
```

### 4. Test Installation

```bash
# Test the analytics engine
npm run test:python-analytics
```

## Directory Structure

```
python_analytics/
├── README.md                      # This file
├── requirements.txt               # Python dependencies
├── statistical_analysis.py        # Statistical analysis script
├── financial_analytics.py         # Financial analysis script
├── regression_analysis.py         # Regression modeling script
├── clustering_analysis.py         # Clustering analysis script
├── timeseries_analysis.py         # Time series analysis script
├── anomaly_detection.py          # Anomaly detection script
├── data/                          # Input data directory
│   └── .gitkeep
├── output/                        # Analysis output directory
│   └── .gitkeep
└── custom_scripts/                # Custom user scripts
    └── .gitkeep
```

## Usage Examples

### 1. Statistical Analysis

```typescript
import { PythonAnalyticsEngine } from '@/lib/services/PythonAnalyticsEngine';

const analytics = new PythonAnalyticsEngine();

// Analyze numerical data
const data = [
  { revenue: 1000, expenses: 800, date: '2024-01-01' },
  { revenue: 1200, expenses: 900, date: '2024-01-02' },
  // ... more data
];

const result = await analytics.executeStatisticalAnalysis(
  data,
  ['revenue', 'expenses']
);

console.log(result.insights);
// Output: ["Analyzed 2 numeric variables", "Dataset contains 2 rows", ...]
```

### 2. Financial Analytics

```typescript
// Analyze financial transactions
const financialData = [
  { amount: 1000, date: '2024-01-01', category: 'revenue', vendor: 'Client A' },
  { amount: 500, date: '2024-01-02', category: 'expense', vendor: 'Supplier B' },
  // ... more transactions
];

const result = await analytics.executeFinancialAnalytics(financialData);

console.log(result.results);
// Output: { total_amount: 500, average_transaction: 750, ... }
```

### 3. Regression Analysis

```typescript
// Perform regression analysis
const salesData = [
  { marketing_spend: 1000, revenue: 5000, quarter: 1 },
  { marketing_spend: 1500, revenue: 7500, quarter: 2 },
  // ... more data
];

const result = await analytics.executeRegressionAnalysis(
  salesData,
  'revenue',           // target variable
  ['marketing_spend'], // feature variables
  'linear'            // model type
);

console.log(result.results.r_squared); // R-squared value
```

### 4. Custom Analysis

```typescript
// Execute custom Python script
const customScript = `
import pandas as pd
import numpy as np
import json
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_file', required=True)
    parser.add_argument('--analysis_id', required=True)
    args = parser.parse_args()
    
    # Load and process data
    with open(args.data_file, 'r') as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    
    # Custom analysis logic here
    result = {
        "custom_metric": df['revenue'].sum(),
        "insights": ["Custom analysis completed"]
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
`;

const result = await analytics.executeCustomAnalysis({
  analysisType: 'statistical',
  data: salesData,
  pythonScript: customScript
});
```

## API Reference

### PythonAnalyticsEngine

#### Methods

##### `executeStatisticalAnalysis(data, columns)`
Performs descriptive statistical analysis on numerical columns.

**Parameters:**
- `data: any[]` - Array of data objects
- `columns: string[]` - Names of columns to analyze

**Returns:** `Promise<AnalyticsResult>`

##### `executeFinancialAnalytics(data)`
Analyzes financial transaction data for insights and trends.

**Parameters:**
- `data: any[]` - Array of financial transaction objects

**Returns:** `Promise<AnalyticsResult>`

##### `executeRegressionAnalysis(data, target, features, modelType)`
Performs regression analysis to find relationships between variables.

**Parameters:**
- `data: any[]` - Training data
- `target: string` - Target variable name
- `features: string[]` - Feature variable names
- `modelType: 'linear' | 'polynomial' | 'logistic'` - Type of regression model

**Returns:** `Promise<AnalyticsResult>`

##### `executeClusteringAnalysis(data, features, method, nClusters)`
Groups data points into clusters based on similarity.

**Parameters:**
- `data: any[]` - Data to cluster
- `features: string[]` - Features to use for clustering
- `method: 'kmeans' | 'hierarchical' | 'dbscan'` - Clustering algorithm
- `nClusters?: number` - Number of clusters (auto-detected if not provided)

**Returns:** `Promise<AnalyticsResult>`

##### `executeTimeSeriesAnalysis(data, dateColumn, valueColumn, forecastPeriods)`
Analyzes time series data for trends, seasonality, and forecasting.

**Parameters:**
- `data: any[]` - Time series data
- `dateColumn: string` - Name of date column
- `valueColumn: string` - Name of value column
- `forecastPeriods: number` - Number of periods to forecast

**Returns:** `Promise<AnalyticsResult>`

##### `executeAnomalyDetection(data, features, method)`
Detects anomalies and outliers in the data.

**Parameters:**
- `data: any[]` - Data to analyze
- `features: string[]` - Features to use for anomaly detection
- `method: 'isolation_forest' | 'one_class_svm' | 'local_outlier_factor'` - Detection method

**Returns:** `Promise<AnalyticsResult>`

##### `executeCustomAnalysis(request)`
Executes a custom Python script for specialized analysis.

**Parameters:**
- `request: PythonAnalyticsRequest` - Custom analysis request object

**Returns:** `Promise<AnalyticsResult>`

### Response Types

#### `AnalyticsResult`
```typescript
interface AnalyticsResult {
  success: boolean;
  analysisId: string;
  results: any;
  charts?: any[];
  insights?: string[];
  recommendations?: string[];
  statistics?: Record<string, number>;
  error?: string;
  executionTime?: number;
}
```

## Python Script Development

### Script Requirements

1. **Command Line Arguments**: Scripts must accept `--data_file` and `--analysis_id` parameters
2. **JSON Output**: Results must be printed as JSON to stdout
3. **Error Handling**: Errors should be handled gracefully with meaningful messages
4. **Data Format**: Input data is provided as JSON file

### Script Template

```python
#!/usr/bin/env python3
import sys
import json
import pandas as pd
import numpy as np
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_file', required=True)
    parser.add_argument('--analysis_id', required=True)
    # Add custom parameters as needed
    parser.add_argument('--custom_param', default='default_value')
    args = parser.parse_args()
    
    try:
        # Load data
        with open(args.data_file, 'r') as f:
            data = json.load(f)
        
        df = pd.DataFrame(data)
        
        # Perform analysis
        results = {
            "analysis_type": "custom",
            "results": {
                # Your analysis results here
            },
            "insights": [
                # List of insight strings
            ],
            "recommendations": [
                # List of recommendation strings
            ]
        }
        
        # Output results
        print(json.dumps(results))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "analysis_type": "custom"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Integration with Frontend

### Using Interactive Chart Renderer

```typescript
// Display analytics results with charts
import { InteractiveChartRenderer } from '@/components/insights/interactive-chart-renderer';

function AnalyticsResultsComponent({ analyticsResult }: { analyticsResult: AnalyticsResult }) {
  return (
    <div>
      {analyticsResult.charts?.map((chart, index) => (
        <InteractiveChartRenderer
          key={index}
          chartConfig={chart}
          showInsights={true}
          allowFullscreen={true}
        />
      ))}
    </div>
  );
}
```

### Integration in Batch Analysis

The Python analytics engine is automatically integrated into the batch analysis workflow:

```typescript
// In app/api/insights/batch-analyze/route.ts
const pythonAnalytics = await pythonEngine.executeFinancialAnalytics(financialData);

// Results are included in the API response
return NextResponse.json({
  success: true,
  insights: {
    // ... other insights
    python_analytics: pythonAnalytics
  }
});
```

## Troubleshooting

### Common Issues

#### 1. Python Not Found
```
Error: Failed to start Python process: spawn python3 ENOENT
```

**Solution:**
- Verify Python is installed and in PATH
- Check PYTHON_PATH environment variable
- Use full path to Python executable

#### 2. Missing Dependencies
```
ModuleNotFoundError: No module named 'pandas'
```

**Solution:**
- Activate virtual environment
- Install missing packages: `pip install pandas`
- Verify requirements.txt is complete

#### 3. Script Execution Timeout
```
Error: Python script failed with code null
```

**Solution:**
- Check if script is hanging on input
- Verify data file exists and is readable
- Add timeout handling in TypeScript code

#### 4. Data Format Issues
```
Error: No JSON output found from Python script
```

**Solution:**
- Ensure script prints JSON to stdout
- Check for print statements that interfere with JSON output
- Validate JSON format with online validator

### Debugging

#### Enable Debug Logging

Add to `.env.local`:
```env
DEBUG_PYTHON_ANALYTICS=true
LOG_LEVEL=debug
```

#### Manual Script Testing

```bash
# Test script manually
cd python_analytics
python statistical_analysis.py \
  --data_file data/test_data.json \
  --columns revenue,expenses \
  --analysis_id test_123
```

#### Check Data Files

```bash
# Verify data file format
cat python_analytics/data/data_<analysis_id>.json | python -m json.tool
```

## Performance Optimization

### 1. Data Preprocessing
- Filter data before sending to Python
- Use appropriate data types
- Remove unnecessary columns

### 2. Caching
- Cache analysis results for repeated queries
- Store intermediate calculations
- Use Redis for shared cache across instances

### 3. Parallel Processing
- Process multiple datasets concurrently
- Use Python multiprocessing for large datasets
- Implement queue system for batch jobs

### 4. Memory Management
- Stream large datasets instead of loading entirely
- Clean up temporary files
- Monitor memory usage in production

## Security Considerations

### 1. Script Execution
- Validate all input parameters
- Sanitize file paths
- Use subprocess timeout limits
- Restrict script execution permissions

### 2. Data Protection
- Encrypt sensitive data files
- Use temporary directories with proper permissions
- Clean up data files after processing
- Implement access logging

### 3. Error Handling
- Don't expose internal paths in error messages
- Log security events
- Implement rate limiting for API calls
- Validate script outputs before processing

## Monitoring & Logging

### Metrics to Track
- Script execution time
- Success/failure rates
- Memory usage
- Data processing volume
- Error frequencies

### Log Levels
- `INFO`: Normal operation events
- `WARN`: Performance issues, timeouts
- `ERROR`: Script failures, data errors
- `DEBUG`: Detailed execution information

### Health Checks
```typescript
// Add health check endpoint
app.get('/api/health/python-analytics', async (req, res) => {
  try {
    const engine = new PythonAnalyticsEngine();
    const testResult = await engine.executeStatisticalAnalysis(
      [{ test: 1 }],
      ['test']
    );
    res.json({ status: 'healthy', execution_time: testResult.executionTime });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

## Contributing

### Adding New Analysis Types

1. Create Python script in `python_analytics/`
2. Add method to `PythonAnalyticsEngine` class
3. Update TypeScript interfaces
4. Add tests and documentation
5. Update requirements.txt if needed

### Code Style

- Follow PEP 8 for Python code
- Use TypeScript strict mode
- Add JSDoc comments for public methods
- Include error handling and logging

### Testing

```bash
# Run Python analytics tests
npm run test:python-analytics

# Test specific analysis type
npm run test:python-analytics -- --analysis-type=statistical
```

## Support

For issues and questions:
1. Check troubleshooting section above
2. Review logs for error details
3. Test scripts manually for debugging
4. Create issue with minimal reproduction case

## License

This module is part of the Minato AI project and follows the same license terms.