#!/usr/bin/env python3
"""
Tactic Detection Script for Report AI Intelligence Flywheel

Detects marketing tactics from CSV filenames and headers using pattern matching.
Returns structured tactic information for context assembly.

Usage:
    python detect_tactics.py --file performance_data.csv
    python detect_tactics.py --files "file1.csv,file2.csv"
    python detect_tactics.py --directory ./campaign_data/
"""

import argparse
import csv
import json
import os
import re
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple


@dataclass
class DetectedTactic:
    """Represents a detected tactic with confidence scoring."""
    filename: str
    tactic_type: str
    platform: str
    confidence: float
    match_method: str
    detected_headers: List[str]
    suggested_table_type: str


# Platform patterns for filename matching
PLATFORM_PATTERNS = {
    r'programmatic|dsp|madhive|ttd|trade.?desk': ('programmatic', 'Programmatic Display'),
    r'ctv|connected.?tv|ott|streaming': ('ctv', 'CTV/OTT'),
    r'facebook|fb|meta': ('facebook', 'Facebook/Meta'),
    r'instagram|ig': ('instagram', 'Instagram'),
    r'linkedin|li': ('linkedin', 'LinkedIn'),
    r'tiktok|tt': ('tiktok', 'TikTok'),
    r'google|gdn|sem|search': ('google', 'Google Ads'),
    r'bing|microsoft': ('bing', 'Microsoft Ads'),
    r'display|banner': ('display', 'Display'),
    r'native': ('native', 'Native'),
    r'video': ('video', 'Video'),
    r'audio|spotify|pandora': ('audio', 'Audio'),
}

# Tactic type patterns
TACTIC_PATTERNS = {
    r'retarget|remarket|rtg': 'retargeting',
    r'prospect|awareness|acq': 'prospecting',
    r'brand|branding': 'brand',
    r'conversion|conv|lead.?gen': 'conversion',
    r'engag': 'engagement',
    r'traffic': 'traffic',
    r'blended|mixed': 'blended',
}

# Table type detection based on headers
TABLE_HEADERS = {
    'monthly_performance': {
        'required': ['impressions', 'clicks'],
        'optional': ['spend', 'conversions', 'ctr', 'cpm', 'cpc'],
    },
    'demographic': {
        'required': ['age', 'gender'],
        'optional': ['impressions', 'clicks', 'conversions'],
    },
    'creative': {
        'required': ['creative', 'ad'],
        'optional': ['impressions', 'clicks', 'ctr'],
    },
    'geographic': {
        'required': ['city', 'state', 'region', 'dma', 'geo'],
        'optional': ['impressions', 'clicks'],
    },
    'device': {
        'required': ['device', 'platform'],
        'optional': ['impressions', 'clicks'],
    },
    'daily_performance': {
        'required': ['date', 'day'],
        'optional': ['impressions', 'clicks', 'spend'],
    }
}


def normalize_text(text: str) -> str:
    """Normalize text for matching."""
    return re.sub(r'[^a-z0-9]', '', text.lower())


def extract_headers(filepath: str) -> List[str]:
    """Extract headers from a CSV file."""
    try:
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            sample = f.read(4096)
            f.seek(0)
            try:
                dialect = csv.Sniffer().sniff(sample)
            except csv.Error:
                dialect = csv.excel
            reader = csv.reader(f, dialect)
            headers = next(reader, [])
            return [h.strip().lower() for h in headers if h.strip()]
    except Exception as e:
        print(f"Warning: Could not read headers from {filepath}: {e}")
        return []


def detect_platform(filename: str) -> Tuple[Optional[str], Optional[str], float]:
    """Detect platform from filename patterns."""
    normalized = normalize_text(filename)
    for pattern, (code, name) in PLATFORM_PATTERNS.items():
        if re.search(pattern, normalized):
            return code, name, 0.9
    return None, None, 0.0


def detect_tactic_type(filename: str) -> Tuple[Optional[str], float]:
    """Detect tactic type from filename patterns."""
    normalized = normalize_text(filename)
    for pattern, tactic in TACTIC_PATTERNS.items():
        if re.search(pattern, normalized):
            return tactic, 0.85
    return None, 0.0


def detect_table_type(headers: List[str]) -> Tuple[Optional[str], float]:
    """Detect table type based on CSV headers."""
    if not headers:
        return None, 0.0
    
    normalized = set(normalize_text(h) for h in headers)
    best_match, best_score = None, 0.0
    
    for table_type, config in TABLE_HEADERS.items():
        required = set(normalize_text(h) for h in config['required'])
        optional = set(normalize_text(h) for h in config.get('optional', []))
        all_expected = required | optional
        
        required_matches = sum(1 for r in required if any(r in h for h in normalized))
        if required_matches == 0:
            continue
        
        matches = sum(1 for e in all_expected if any(e in h for h in normalized))
        score = matches / max(len(all_expected), len(normalized))
        
        if required_matches == len(required):
            score = min(score + 0.2, 1.0)
        
        if score > best_score and score >= 0.3:
            best_score = score
            best_match = table_type
    
    return best_match, best_score


def detect_tactic(filepath: str) -> DetectedTactic:
    """Detect tactic information from a single file."""
    filename = os.path.basename(filepath)
    headers = extract_headers(filepath)
    
    platform_code, platform_name, platform_conf = detect_platform(filename)
    tactic_type, tactic_conf = detect_tactic_type(filename)
    table_type, header_conf = detect_table_type(headers)
    
    confidences = [c for c in [platform_conf, tactic_conf, header_conf] if c > 0]
    overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    
    if platform_conf > 0 and tactic_conf > 0:
        match_method = 'filename'
    elif header_conf > 0:
        match_method = 'headers'
    else:
        match_method = 'pattern'
    
    return DetectedTactic(
        filename=filename,
        tactic_type=tactic_type or 'unknown',
        platform=platform_code or 'unknown',
        confidence=round(overall_confidence, 2),
        match_method=match_method,
        detected_headers=headers[:20],
        suggested_table_type=table_type or 'monthly_performance'
    )


def detect_tactics_batch(filepaths: List[str]) -> List[DetectedTactic]:
    """Detect tactics from multiple files."""
    results = []
    for filepath in filepaths:
        if os.path.exists(filepath) and filepath.endswith('.csv'):
            results.append(detect_tactic(filepath))
    return results


def scan_directory(directory: str) -> List[str]:
    """Scan directory for CSV files."""
    csv_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.csv'):
                csv_files.append(os.path.join(root, file))
    return csv_files


def main():
    parser = argparse.ArgumentParser(description='Detect marketing tactics from CSV files')
    parser.add_argument('--file', '-f', help='Single CSV file to analyze')
    parser.add_argument('--files', help='Comma-separated list of files')
    parser.add_argument('--directory', '-d', help='Directory to scan for CSVs')
    parser.add_argument('--output', '-o', default='json', choices=['json', 'table', 'minimal'])
    
    args = parser.parse_args()
    
    filepaths = []
    if args.file:
        filepaths.append(args.file)
    if args.files:
        filepaths.extend(args.files.split(','))
    if args.directory:
        filepaths.extend(scan_directory(args.directory))
    
    if not filepaths:
        print("Error: No files specified. Use --file, --files, or --directory")
        return 1
    
    results = detect_tactics_batch(filepaths)
    
    if args.output == 'json':
        output = {
            'detected_tactics': [asdict(r) for r in results],
            'summary': {
                'total_files': len(results),
                'platforms': list(set(r.platform for r in results if r.platform != 'unknown')),
                'tactic_types': list(set(r.tactic_type for r in results if r.tactic_type != 'unknown')),
                'avg_confidence': round(sum(r.confidence for r in results) / len(results), 2) if results else 0
            }
        }
        print(json.dumps(output, indent=2))
    elif args.output == 'table':
        print(f"{'Filename':<40} {'Platform':<15} {'Tactic':<15} {'Table Type':<20} {'Conf':<6}")
        print("-" * 96)
        for r in results:
            print(f"{r.filename[:39]:<40} {r.platform:<15} {r.tactic_type:<15} {r.suggested_table_type:<20} {r.confidence:<6}")
    elif args.output == 'minimal':
        for r in results:
            print(f"{r.filename}: {r.platform}/{r.tactic_type} ({r.confidence})")
    
    return 0


if __name__ == '__main__':
    exit(main())
