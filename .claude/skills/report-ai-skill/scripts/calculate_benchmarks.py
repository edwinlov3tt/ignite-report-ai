#!/usr/bin/env python3
"""
Benchmark Calculator for Report AI Intelligence Flywheel

Calculates benchmark ranges from historical data and compares metrics.

Usage:
    python calculate_benchmarks.py calculate --data metrics.csv --output benchmarks.json
    python calculate_benchmarks.py compare --metric cpm --value 8.50 --platform facebook
"""

import argparse
import csv
import json
import math
import os
import statistics
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime


@dataclass
class BenchmarkRange:
    metric: str
    platform: str
    industry: str
    tactic: str
    p25: float
    p50: float
    p75: float
    mean: float
    sample_size: int
    confidence: float
    last_updated: str


@dataclass
class BenchmarkComparison:
    metric: str
    actual_value: float
    benchmark_median: float
    benchmark_low: float
    benchmark_high: float
    percentile: float
    status: str
    deviation_percent: float
    interpretation: str


METRIC_CONFIG = {
    'cpm': {'direction': 'lower_better', 'unit': '$'},
    'cpc': {'direction': 'lower_better', 'unit': '$'},
    'cpa': {'direction': 'lower_better', 'unit': '$'},
    'ctr': {'direction': 'higher_better', 'unit': '%'},
    'conversion_rate': {'direction': 'higher_better', 'unit': '%'},
    'roas': {'direction': 'higher_better', 'unit': 'x'},
    'viewability': {'direction': 'higher_better', 'unit': '%'},
    'completion_rate': {'direction': 'higher_better', 'unit': '%'},
}


def calculate_confidence(sample_size: int) -> float:
    if sample_size < 5:
        return 0.3
    return min(0.95, 0.3 + 0.15 * math.log10(sample_size))


def calculate_benchmark(values: List[float], metric: str, platform: str, industry: str, tactic: str) -> BenchmarkRange:
    sorted_values = sorted(values)
    n = len(sorted_values)
    
    p25 = sorted_values[int(n * 0.25)] if n > 3 else sorted_values[0]
    p50 = statistics.median(values)
    p75 = sorted_values[int(n * 0.75)] if n > 3 else sorted_values[-1]
    
    return BenchmarkRange(
        metric=metric,
        platform=platform,
        industry=industry,
        tactic=tactic,
        p25=round(p25, 4),
        p50=round(p50, 4),
        p75=round(p75, 4),
        mean=round(statistics.mean(values), 4),
        sample_size=n,
        confidence=round(calculate_confidence(n), 2),
        last_updated=datetime.now().isoformat()
    )


def compare_to_benchmark(metric: str, value: float, benchmark: BenchmarkRange) -> BenchmarkComparison:
    config = METRIC_CONFIG.get(metric, {'direction': 'lower_better', 'unit': ''})
    
    # Calculate percentile
    if value <= benchmark.p25:
        percentile = 25 * (value / benchmark.p25) if benchmark.p25 > 0 else 0
    elif value <= benchmark.p50:
        percentile = 25 + 25 * ((value - benchmark.p25) / (benchmark.p50 - benchmark.p25)) if benchmark.p50 != benchmark.p25 else 37.5
    elif value <= benchmark.p75:
        percentile = 50 + 25 * ((value - benchmark.p50) / (benchmark.p75 - benchmark.p50)) if benchmark.p75 != benchmark.p50 else 62.5
    else:
        percentile = min(100, 75 + 25 * ((value - benchmark.p75) / (benchmark.p75 - benchmark.p50)) if benchmark.p75 != benchmark.p50 else 87.5)
    
    percentile = max(0, min(100, percentile))
    deviation = ((value - benchmark.p50) / benchmark.p50 * 100) if benchmark.p50 != 0 else 0
    
    # Determine status
    if config['direction'] == 'higher_better':
        status = 'excellent' if percentile >= 75 else 'good' if percentile >= 50 else 'average' if percentile >= 25 else 'poor'
    else:
        status = 'excellent' if percentile <= 25 else 'good' if percentile <= 50 else 'average' if percentile <= 75 else 'poor'
    
    direction_word = "above" if deviation > 0 else "below"
    interpretation = f"{metric.upper()} of {value}{config['unit']} is {abs(deviation):.1f}% {direction_word} the median benchmark of {benchmark.p50}{config['unit']}. Performance: {status}."
    
    return BenchmarkComparison(
        metric=metric,
        actual_value=value,
        benchmark_median=benchmark.p50,
        benchmark_low=benchmark.p25,
        benchmark_high=benchmark.p75,
        percentile=round(percentile, 1),
        status=status,
        deviation_percent=round(deviation, 1),
        interpretation=interpretation
    )


def load_csv(filepath: str) -> List[Dict[str, Any]]:
    data = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            processed = {}
            for key, value in row.items():
                key = key.strip().lower().replace(' ', '_')
                try:
                    processed[key] = float(value)
                except (ValueError, TypeError):
                    processed[key] = value
            data.append(processed)
    return data


def calculate_benchmarks_from_data(data: List[Dict], group_by: List[str] = ['platform', 'industry', 'tactic']) -> Dict[str, BenchmarkRange]:
    groups: Dict[str, List[Dict]] = {}
    
    for row in data:
        key = "|".join(f"{dim}:{str(row.get(dim, 'all')).lower()}" for dim in group_by)
        if key not in groups:
            groups[key] = []
        groups[key].append(row)
    
    benchmarks = {}
    for group_key, group_data in groups.items():
        dims = dict(part.split(':') for part in group_key.split('|'))
        
        if group_data:
            numeric_cols = [k for k, v in group_data[0].items() if isinstance(v, (int, float)) and k not in group_by]
            
            for metric in numeric_cols:
                values = [row[metric] for row in group_data if metric in row and row[metric] is not None]
                
                if len(values) >= 3:
                    benchmark = calculate_benchmark(
                        values, metric,
                        dims.get('platform', 'all'),
                        dims.get('industry', 'all'),
                        dims.get('tactic', 'all')
                    )
                    benchmarks[f"{metric}|{group_key}"] = benchmark
    
    return benchmarks


def save_benchmarks(benchmarks: Dict[str, BenchmarkRange], filepath: str) -> None:
    with open(filepath, 'w') as f:
        json.dump({k: asdict(v) for k, v in benchmarks.items()}, f, indent=2)


def load_benchmarks(filepath: str) -> Dict[str, BenchmarkRange]:
    with open(filepath, 'r') as f:
        return {k: BenchmarkRange(**v) for k, v in json.load(f).items()}


def main():
    parser = argparse.ArgumentParser(description='Calculate and compare benchmarks')
    subparsers = parser.add_subparsers(dest='command')
    
    calc_parser = subparsers.add_parser('calculate', help='Calculate benchmarks from data')
    calc_parser.add_argument('--data', '-d', required=True, help='CSV data file')
    calc_parser.add_argument('--output', '-o', required=True, help='Output JSON file')
    calc_parser.add_argument('--group-by', '-g', default='platform,industry,tactic')
    
    comp_parser = subparsers.add_parser('compare', help='Compare value to benchmark')
    comp_parser.add_argument('--metric', '-m', required=True, help='Metric name')
    comp_parser.add_argument('--value', '-v', required=True, type=float, help='Value to compare')
    comp_parser.add_argument('--platform', '-p', default='all')
    comp_parser.add_argument('--industry', '-i', default='all')
    comp_parser.add_argument('--tactic', '-t', default='all')
    comp_parser.add_argument('--benchmarks', '-b', help='Benchmarks JSON file')
    
    args = parser.parse_args()
    
    if args.command == 'calculate':
        print(f"Loading data from {args.data}...")
        data = load_csv(args.data)
        print(f"Loaded {len(data)} records")
        
        group_by = [g.strip() for g in args.group_by.split(',')]
        benchmarks = calculate_benchmarks_from_data(data, group_by)
        print(f"Calculated {len(benchmarks)} benchmarks")
        
        save_benchmarks(benchmarks, args.output)
        print(f"Saved to {args.output}")
    
    elif args.command == 'compare':
        if args.benchmarks and os.path.exists(args.benchmarks):
            benchmarks = load_benchmarks(args.benchmarks)
            key = f"{args.metric}|platform:{args.platform}|industry:{args.industry}|tactic:{args.tactic}"
            benchmark = benchmarks.get(key)
        else:
            # Create default benchmark
            benchmark = BenchmarkRange(
                metric=args.metric, platform=args.platform, industry=args.industry, tactic=args.tactic,
                p25=args.value * 0.7, p50=args.value, p75=args.value * 1.3, mean=args.value,
                sample_size=50, confidence=0.8, last_updated=datetime.now().isoformat()
            )
            print("Warning: Using estimated benchmarks")
        
        if benchmark:
            result = compare_to_benchmark(args.metric, args.value, benchmark)
            print(json.dumps(asdict(result), indent=2))
        else:
            print(f"No benchmark found for {args.metric}")
    
    else:
        parser.print_help()
    
    return 0


if __name__ == '__main__':
    exit(main())
