#!/usr/bin/env python3
import sys
import json
import pandas as pd
import numpy as np
from scipy import stats
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_file', required=True)
    parser.add_argument('--columns', required=True)
    parser.add_argument('--analysis_id', required=True)
    args = parser.parse_args()
    
    # Load data
    with open(args.data_file, 'r') as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    columns = args.columns.split(',')
    
    # Select numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    analysis_cols = [col for col in columns if col in numeric_cols]
    
    if not analysis_cols:
        print(json.dumps({
            "error": "No numeric columns found for analysis",
            "available_columns": list(df.columns),
            "numeric_columns": numeric_cols
        }))
        return
    
    results = {}
    
    # Descriptive statistics
    for col in analysis_cols:
        if col in df.columns:
            series = df[col].dropna()
            if len(series) > 0:
                results[col] = {
                    "mean": float(series.mean()),
                    "median": float(series.median()),
                    "std": float(series.std()),
                    "min": float(series.min()),
                    "max": float(series.max()),
                    "skewness": float(stats.skew(series)),
                    "kurtosis": float(stats.kurtosis(series)),
                    "count": int(series.count())
                }
    
    # Correlation matrix if multiple columns
    if len(analysis_cols) > 1:
        corr_data = df[analysis_cols].corr()
        results["correlation_matrix"] = {
            "values": corr_data.values.tolist(),
            "columns": corr_data.columns.tolist()
        }
    
    # Output results
    output = {
        "analysis_type": "statistical",
        "results": results,
        "insights": [
            f"Analyzed {len(analysis_cols)} numeric variables",
            f"Dataset contains {len(df)} rows",
            "Statistical summary completed successfully"
        ]
    }
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()
