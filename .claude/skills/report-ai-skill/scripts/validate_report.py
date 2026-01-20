#!/usr/bin/env python3
"""
Report Validator for Report AI Intelligence Flywheel

Validates generated reports against quality guidelines and formatting rules.

Usage:
    python validate_report.py --report output.md
    python validate_report.py --report output.md --strict
    cat report.md | python validate_report.py --stdin
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Any
from enum import Enum


class Severity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationIssue:
    severity: Severity
    category: str
    message: str
    suggestion: str = ""


@dataclass
class ValidationResult:
    is_valid: bool
    quality_score: float
    issues: List[ValidationIssue] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)


REQUIRED_SECTIONS = ["executive summary", "key metrics", "recommendations"]
QUALITY_RULES = {
    "executive_summary_max_sentences": 3,
    "min_quantified_claims": 3,
    "max_report_length_words": 3000,
    "min_report_length_words": 100
}


def count_words(text: str) -> int:
    return len(text.split())


def count_sentences(text: str) -> int:
    return len([s for s in re.split(r'[.!?]+', text) if s.strip()])


def find_section(content: str, section_name: str) -> bool:
    pattern = rf'^#+\s*{re.escape(section_name)}'
    return bool(re.search(pattern, content, re.IGNORECASE | re.MULTILINE))


def check_required_sections(content: str) -> List[ValidationIssue]:
    issues = []
    for section in REQUIRED_SECTIONS:
        if not find_section(content, section) and section.lower() not in content.lower():
            issues.append(ValidationIssue(
                Severity.ERROR, "structure",
                f"Missing required section: {section}",
                f"Add a '{section.title()}' section"
            ))
    return issues


def check_quantification(content: str) -> List[ValidationIssue]:
    issues = []
    numbers = re.findall(r'\d+\.?\d*%?', content)
    metric_numbers = [n for n in numbers if not re.match(r'^20\d{2}$', n)]
    
    if len(metric_numbers) < QUALITY_RULES["min_quantified_claims"]:
        issues.append(ValidationIssue(
            Severity.WARNING, "quantification",
            f"Only {len(metric_numbers)} quantified claims (minimum {QUALITY_RULES['min_quantified_claims']})",
            "Add specific metrics and numbers"
        ))
    return issues


def check_recommendations(content: str) -> List[ValidationIssue]:
    issues = []
    if re.search(r'recommend|suggest|should|consider', content.lower()):
        if not re.search(r'impact|result|improve|increase|decrease|save|reduce', content.lower()):
            issues.append(ValidationIssue(
                Severity.WARNING, "recommendations",
                "Recommendations lack expected impact",
                "Add expected impact to recommendations"
            ))
    
    rec_items = re.findall(r'(?:^[-*•]|\d+\.)\s+.+', content, re.MULTILINE)
    if len(rec_items) > 10:
        issues.append(ValidationIssue(
            Severity.WARNING, "recommendations",
            f"{len(rec_items)} recommendations (maximum 10)",
            "Prioritize and reduce recommendations"
        ))
    return issues


def check_benchmarks(content: str) -> List[ValidationIssue]:
    issues = []
    comparison_words = ['above', 'below', 'higher', 'lower', 'better', 'worse']
    for word in comparison_words:
        if word in content.lower():
            if 'benchmark' not in content.lower() and 'industry' not in content.lower():
                issues.append(ValidationIssue(
                    Severity.WARNING, "benchmarks",
                    "Comparisons made without benchmark reference",
                    "Include specific benchmark values"
                ))
                break
    return issues


def check_warnings_format(content: str) -> List[ValidationIssue]:
    issues = []
    if re.search(r'warning|alert|critical|issue|problem', content.lower()):
        if not re.search(r'critical|high|medium|low|urgent', content.lower()):
            issues.append(ValidationIssue(
                Severity.INFO, "warnings",
                "Warnings found without severity levels",
                "Add severity level to warnings"
            ))
    return issues


def check_length(content: str) -> List[ValidationIssue]:
    issues = []
    word_count = count_words(content)
    
    if word_count < QUALITY_RULES["min_report_length_words"]:
        issues.append(ValidationIssue(
            Severity.WARNING, "length",
            f"Report too short ({word_count} words)",
            "Add more analysis detail"
        ))
    elif word_count > QUALITY_RULES["max_report_length_words"]:
        issues.append(ValidationIssue(
            Severity.WARNING, "length",
            f"Report too long ({word_count} words)",
            "Condense to key insights"
        ))
    return issues


def validate_report(content: str) -> ValidationResult:
    """Run all validation checks on a report."""
    issues = []
    issues.extend(check_required_sections(content))
    issues.extend(check_quantification(content))
    issues.extend(check_recommendations(content))
    issues.extend(check_benchmarks(content))
    issues.extend(check_warnings_format(content))
    issues.extend(check_length(content))
    
    score = 100.0
    for issue in issues:
        if issue.severity == Severity.ERROR:
            score -= 20
        elif issue.severity == Severity.WARNING:
            score -= 10
        else:
            score -= 2
    
    score = max(0, min(100, score))
    is_valid = not any(i.severity == Severity.ERROR for i in issues)
    
    return ValidationResult(
        is_valid=is_valid,
        quality_score=score,
        issues=issues,
        metrics={
            "word_count": count_words(content),
            "error_count": len([i for i in issues if i.severity == Severity.ERROR]),
            "warning_count": len([i for i in issues if i.severity == Severity.WARNING]),
        }
    )


def format_result(result: ValidationResult, format: str = "text") -> str:
    if format == "json":
        return json.dumps({
            "valid": result.is_valid,
            "quality_score": result.quality_score,
            "issues": [{"severity": i.severity.value, "category": i.category, "message": i.message, "suggestion": i.suggestion} for i in result.issues],
            "metrics": result.metrics
        }, indent=2)
    
    lines = ["=" * 50, "REPORT VALIDATION RESULTS", "=" * 50, ""]
    lines.append(f"Status: {'✓ VALID' if result.is_valid else '✗ INVALID'}")
    lines.append(f"Quality Score: {result.quality_score:.1f}/100")
    lines.append(f"Word Count: {result.metrics['word_count']}")
    lines.append("")
    
    if result.issues:
        lines.append("Issues Found:")
        lines.append("-" * 40)
        for issue in sorted(result.issues, key=lambda x: x.severity.value):
            icon = {"error": "✗", "warning": "⚠", "info": "ℹ"}[issue.severity.value]
            lines.append(f"{icon} [{issue.severity.value.upper()}] {issue.message}")
            if issue.suggestion:
                lines.append(f"  → {issue.suggestion}")
    else:
        lines.append("No issues found!")
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description='Validate Report AI reports')
    parser.add_argument('--report', '-r', help='Report file to validate')
    parser.add_argument('--stdin', action='store_true', help='Read from stdin')
    parser.add_argument('--format', '-f', default='text', choices=['text', 'json'])
    parser.add_argument('--strict', action='store_true', help='Treat warnings as errors')
    
    args = parser.parse_args()
    
    if args.stdin:
        content = sys.stdin.read()
    elif args.report:
        with open(args.report, 'r') as f:
            content = f.read()
    else:
        parser.error("Must specify --report or --stdin")
        return 1
    
    result = validate_report(content)
    
    if args.strict:
        result.is_valid = result.is_valid and result.metrics["warning_count"] == 0
    
    print(format_result(result, args.format))
    return 0 if result.is_valid else 1


if __name__ == '__main__':
    exit(main())
