#!/usr/bin/env python3
import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_file', required=True)
    parser.add_argument('--analysis_id', required=True)
    args = parser.parse_args()
    
    # Load financial data
    with open(args.data_file, 'r') as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    
    # Basic financial metrics
    results = {
        "total_transactions": len(df),
        "date_range": {
            "start": df['date'].min() if 'date' in df.columns else None,
            "end": df['date'].max() if 'date' in df.columns else None
        }
    }
    
    # Revenue and expense analysis
    if 'amount' in df.columns:
        results["total_amount"] = float(df['amount'].sum())
        results["average_transaction"] = float(df['amount'].mean())
        results["largest_transaction"] = float(df['amount'].max())
        results["smallest_transaction"] = float(df['amount'].min())
    
    # Category analysis
    if 'category' in df.columns:
        category_summary = df.groupby('category')['amount'].agg(['sum', 'count', 'mean']).to_dict()
        results["by_category"] = category_summary
    
    # Monthly trends
    if 'date' in df.columns and 'amount' in df.columns:
        df['date'] = pd.to_datetime(df['date'])
        monthly = df.groupby(df['date'].dt.to_period('M'))['amount'].sum()
        results["monthly_trends"] = {
            "periods": [str(p) for p in monthly.index],
            "amounts": monthly.values.tolist()
        }
    
    # Output
    output = {
        "analysis_type": "financial",
        "results": results,
        "insights": [
            f"Processed {len(df)} financial transactions",
            f"Total value: {results.get('total_amount', 0):,.2f}",
            "Financial analysis completed"
        ],
        "recommendations": [
            "Review largest transactions for accuracy",
            "Monitor monthly spending trends",
            "Consider category-based budgeting"
        ]
    }
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()
