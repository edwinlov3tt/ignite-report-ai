#!/usr/bin/env python3
"""
Report AI Skill Initialization Script

Sets up the Report AI Intelligence Flywheel skill for use in Claude Code.
Creates necessary directories, validates configuration, and initializes
the knowledge base with default data.

Usage:
    python init_skill.py
    python init_skill.py --with-examples
    python init_skill.py --verify-only
"""

import argparse
import json
import os
import sys
from pathlib import Path


SKILL_DIR = Path(__file__).parent.parent
REQUIRED_DIRS = [
    'scripts',
    'references',
    'assets/report_templates',
    'assets/output_schemas'
]

REQUIRED_FILES = [
    'SKILL.md',
    'scripts/detect_tactics.py',
    'scripts/build_context.py',
    'scripts/create_agent.py',
    'scripts/validate_report.py',
    'scripts/calculate_benchmarks.py',
    'references/agents.md',
    'references/cloudflare-integration.md'
]


def check_structure() -> tuple[bool, list[str]]:
    """Check that the skill directory structure is correct."""
    issues = []
    
    # Check directories
    for dir_path in REQUIRED_DIRS:
        full_path = SKILL_DIR / dir_path
        if not full_path.exists():
            issues.append(f"Missing directory: {dir_path}")
    
    # Check files
    for file_path in REQUIRED_FILES:
        full_path = SKILL_DIR / file_path
        if not full_path.exists():
            issues.append(f"Missing file: {file_path}")
    
    return len(issues) == 0, issues


def verify_scripts() -> tuple[bool, list[str]]:
    """Verify that Python scripts are syntactically correct."""
    issues = []
    
    script_dir = SKILL_DIR / 'scripts'
    if not script_dir.exists():
        return False, ["Scripts directory not found"]
    
    for script_file in script_dir.glob('*.py'):
        try:
            with open(script_file, 'r') as f:
                code = f.read()
            compile(code, script_file, 'exec')
        except SyntaxError as e:
            issues.append(f"Syntax error in {script_file.name}: {e}")
    
    return len(issues) == 0, issues


def create_example_data():
    """Create example data files for testing."""
    examples_dir = SKILL_DIR / 'examples'
    examples_dir.mkdir(exist_ok=True)
    
    # Example campaign data
    campaign_data = {
        "company": {
            "name": "Example Auto Dealer",
            "industry": "automotive",
            "size": "medium"
        },
        "date_range": {
            "start": "2024-01-01",
            "end": "2024-01-31"
        },
        "platforms": ["facebook"],
        "tactics": ["retargeting"]
    }
    
    with open(examples_dir / 'example_campaign.json', 'w') as f:
        json.dump(campaign_data, f, indent=2)
    
    # Example CSV data
    csv_data = """date,impressions,clicks,spend,conversions
2024-01-01,15000,180,125.50,12
2024-01-02,16500,195,138.25,15
2024-01-03,14200,168,118.00,10
2024-01-04,17800,212,145.75,18
2024-01-05,15600,185,128.50,14
2024-01-06,12000,142,98.00,8
2024-01-07,11500,136,94.25,7
"""
    
    with open(examples_dir / 'example_performance.csv', 'w') as f:
        f.write(csv_data)
    
    # Example benchmarks
    benchmarks = {
        "cpm|platform:facebook|industry:automotive|tactic:retargeting": {
            "metric": "cpm",
            "platform": "facebook",
            "industry": "automotive",
            "tactic": "retargeting",
            "p25": 8.50,
            "p50": 12.50,
            "p75": 16.00,
            "mean": 12.30,
            "std_dev": 3.20,
            "sample_size": 150,
            "confidence": 0.92,
            "quarter": "Q1-2024"
        },
        "ctr|platform:facebook|industry:automotive|tactic:retargeting": {
            "metric": "ctr",
            "platform": "facebook",
            "industry": "automotive",
            "tactic": "retargeting",
            "p25": 1.2,
            "p50": 1.8,
            "p75": 2.4,
            "mean": 1.85,
            "std_dev": 0.55,
            "sample_size": 150,
            "confidence": 0.92,
            "quarter": "Q1-2024"
        }
    }
    
    with open(examples_dir / 'example_benchmarks.json', 'w') as f:
        json.dump(benchmarks, f, indent=2)
    
    print(f"Created example files in {examples_dir}")


def print_status(check_name: str, passed: bool, issues: list[str] = None):
    """Print status of a check."""
    status = "✓" if passed else "✗"
    color = "\033[92m" if passed else "\033[91m"
    reset = "\033[0m"
    
    print(f"{color}{status}{reset} {check_name}")
    
    if issues:
        for issue in issues:
            print(f"  └─ {issue}")


def main():
    parser = argparse.ArgumentParser(
        description='Initialize Report AI skill'
    )
    parser.add_argument('--with-examples', action='store_true',
                       help='Create example data files')
    parser.add_argument('--verify-only', action='store_true',
                       help='Only verify structure, dont create anything')
    
    args = parser.parse_args()
    
    print("=" * 50)
    print("Report AI Intelligence Flywheel - Skill Initialization")
    print("=" * 50)
    print()
    
    # Check structure
    structure_ok, structure_issues = check_structure()
    print_status("Directory structure", structure_ok, structure_issues)
    
    # Verify scripts
    scripts_ok, script_issues = verify_scripts()
    print_status("Python scripts syntax", scripts_ok, script_issues)
    
    # Check SKILL.md
    skill_md = SKILL_DIR / 'SKILL.md'
    if skill_md.exists():
        with open(skill_md, 'r') as f:
            content = f.read()
        has_frontmatter = content.startswith('---')
        has_name = 'name:' in content[:500]
        has_description = 'description:' in content[:500]
        skill_md_ok = has_frontmatter and has_name and has_description
        skill_md_issues = []
        if not has_frontmatter:
            skill_md_issues.append("Missing YAML frontmatter")
        if not has_name:
            skill_md_issues.append("Missing 'name' in frontmatter")
        if not has_description:
            skill_md_issues.append("Missing 'description' in frontmatter")
    else:
        skill_md_ok = False
        skill_md_issues = ["SKILL.md not found"]
    
    print_status("SKILL.md format", skill_md_ok, skill_md_issues)
    
    print()
    
    # Create examples if requested
    if args.with_examples and not args.verify_only:
        print("Creating example files...")
        create_example_data()
        print()
    
    # Summary
    all_ok = structure_ok and scripts_ok and skill_md_ok
    
    if all_ok:
        print("\033[92m✓ Skill is properly configured and ready to use!\033[0m")
        print()
        print("Quick start:")
        print("  1. Run: python scripts/detect_tactics.py --file your_data.csv")
        print("  2. Run: python scripts/build_context.py --platform facebook --industry automotive")
        print("  3. Run: python scripts/create_agent.py --type platform --name facebook")
        print()
        return 0
    else:
        print("\033[91m✗ Skill has issues that need to be resolved.\033[0m")
        return 1


if __name__ == '__main__':
    sys.exit(main())
