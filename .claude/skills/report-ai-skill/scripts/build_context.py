#!/usr/bin/env python3
"""
Context Builder for Report AI Intelligence Flywheel

Assembles relevant context for AI analysis based on platform, industry, and tactic.
Implements token budgeting and layered context loading for efficient prompt construction.

Usage:
    python build_context.py --platform facebook --industry automotive --tactic retargeting
    python build_context.py --platform facebook google --industry automotive --output xml
"""

import argparse
import json
import os
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Optional, Any
from datetime import datetime


@dataclass
class ContextLayer:
    """A single layer of context."""
    name: str
    content: str
    token_estimate: int
    cache_eligible: bool
    cache_ttl: str
    priority: int


@dataclass
class AssembledContext:
    """Complete assembled context for AI analysis."""
    layers: List[ContextLayer]
    total_tokens: int
    platforms: List[str]
    industries: List[str]
    tactics: List[str]
    cache_config: Dict[str, Any]
    xml_prompt: str


# Platform knowledge base
PLATFORM_KNOWLEDGE = {
    'facebook': {
        'name': 'Facebook/Meta',
        'quirks': [
            'Learning phase requires 50 conversions per week per ad set',
            'iOS 14.5+ tracking limitations affect conversion attribution',
            'Frequency above 3x in 7 days indicates audience saturation',
            'Advantage+ campaigns may override manual targeting',
        ],
        'primary_kpis': {
            'awareness': ['cpm', 'reach', 'frequency', 'video_views'],
            'traffic': ['cpc', 'ctr', 'landing_page_views'],
            'conversions': ['cpa', 'roas', 'conversion_rate'],
        },
        'warning_thresholds': {
            'frequency_7d': {'warning': 3, 'critical': 5},
            'ctr': {'warning': 0.8, 'critical': 0.5},
            'cpm': {'warning': 20, 'critical': 30},
        },
    },
    'google': {
        'name': 'Google Ads',
        'quirks': [
            'Quality Score heavily impacts actual CPC and position',
            'Smart Bidding needs 15-30 conversions per month minimum',
            'Display metrics should be analyzed separately from Search',
        ],
        'primary_kpis': {
            'search': ['cpc', 'ctr', 'conversion_rate', 'quality_score'],
            'display': ['cpm', 'viewable_impressions', 'ctr'],
            'video': ['cpv', 'view_rate', 'watch_time'],
        },
        'warning_thresholds': {
            'quality_score': {'warning': 5, 'critical': 3},
            'impression_share': {'warning': 50, 'critical': 30},
        },
    },
    'programmatic': {
        'name': 'Programmatic Display',
        'quirks': [
            'Viewability standards: 50% in view for 1 second',
            'Brand safety filters can limit scale',
            'Frequency caps work at DSP level only',
        ],
        'primary_kpis': {
            'display': ['cpm', 'viewability_rate', 'ctr'],
            'video': ['cpcv', 'completion_rate', 'viewability'],
            'ctv': ['completion_rate', 'cpm', 'reach'],
        },
        'warning_thresholds': {
            'viewability': {'warning': 60, 'critical': 50},
            'completion_rate': {'warning': 70, 'critical': 60},
        },
    },
}

# Industry benchmarks
INDUSTRY_BENCHMARKS = {
    'automotive': {
        'name': 'Automotive',
        'seasonality': 'Q4 highest (year-end sales), Q1 lowest',
        'benchmarks': {
            'facebook': {'retargeting': {'cpm': 12.50, 'ctr': 1.8, 'cpa': 45.00}},
            'google': {'search': {'cpc': 2.50, 'ctr': 4.5, 'conversion_rate': 6.0}},
        },
        'insights': ['Model launch periods see 2-3x higher CPMs', 'Local DMA targeting outperforms broad geo'],
    },
    'healthcare': {
        'name': 'Healthcare',
        'seasonality': 'Q1 highest (new year resolutions), Q4 pre-enrollment',
        'benchmarks': {
            'facebook': {'retargeting': {'cpm': 18.00, 'ctr': 1.2, 'cpa': 120.00}},
            'google': {'search': {'cpc': 4.50, 'ctr': 3.5, 'conversion_rate': 4.0}},
        },
        'insights': ['HIPAA compliance limits targeting', 'Trust messaging crucial'],
    },
    'ecommerce': {
        'name': 'E-commerce',
        'seasonality': 'Q4 highest (holiday), Prime Day/BFCM spikes',
        'benchmarks': {
            'facebook': {'retargeting': {'cpm': 15.00, 'ctr': 2.5, 'roas': 4.0}},
            'google': {'shopping': {'cpc': 0.80, 'ctr': 1.5, 'roas': 5.0}},
        },
        'insights': ['ROAS varies by price point', 'Cart abandonment retargeting highest performer'],
    },
}

# Tactic guidance
TACTIC_GUIDANCE = {
    'retargeting': {
        'name': 'Retargeting/Remarketing',
        'key_metrics': ['cpa', 'roas', 'conversion_rate', 'frequency'],
        'optimization_focus': [
            'Frequency capping critical - diminishing returns above 3-5x/week',
            'Segment by recency (1-7 days vs 8-30 days)',
            'Dynamic creative outperforms static for product retargeting',
        ],
        'warning_signs': ['frequency > 5x/week', 'declining CTR trend', 'increasing CPA'],
    },
    'prospecting': {
        'name': 'Prospecting/Awareness',
        'key_metrics': ['cpm', 'reach', 'frequency', 'new_user_rate'],
        'optimization_focus': [
            'Broad targeting often outperforms narrow interest',
            'Focus on efficient CPM over immediate conversions',
            'Lookalike audiences from best customers work well',
        ],
        'warning_signs': ['CPM above benchmark', 'reach plateauing', 'high frequency quickly'],
    },
    'brand': {
        'name': 'Brand Awareness',
        'key_metrics': ['reach', 'frequency', 'cpm', 'video_views'],
        'optimization_focus': [
            'Optimize for reach at controlled frequency (2-3x/week)',
            'Video completion matters more than clicks',
            'Measure with brand lift studies when possible',
        ],
        'warning_signs': ['frequency too high', 'poor video completion', 'low-quality placements'],
    },
}


def estimate_tokens(text: str) -> int:
    """Rough token estimation."""
    return len(text) // 4


def build_system_prompt() -> ContextLayer:
    """Build the static system prompt layer."""
    content = """<system_prompt>
<role>Expert digital marketing analyst specializing in multi-channel campaign optimization.</role>

<analysis_framework>
For each tactic analyzed:
1. Compare metrics to provided industry benchmarks
2. Identify specific optimization opportunities with quantified impact
3. Flag warning indicators based on platform thresholds
4. Provide prioritized recommendations with expected outcomes
</analysis_framework>

<output_requirements>
- Ground ALL insights in provided data - never invent metrics
- Reference specific benchmarks when making comparisons
- Never combine metrics across different tactics
- Each recommendation must specify expected impact
- Flag warnings prominently with severity level
</output_requirements>

<formatting_rules>
- Executive Summary: 2-3 sentences maximum
- Metrics: Always include comparison to benchmark
- Recommendations: Priority (High/Medium/Low) + Expected Impact
- Warnings: Severity (Critical/Warning/Info) + Recommended Action
</formatting_rules>
</system_prompt>"""
    
    return ContextLayer(
        name="system_prompt",
        content=content,
        token_estimate=estimate_tokens(content),
        cache_eligible=True,
        cache_ttl="1h",
        priority=1
    )


def build_platform_context(platforms: List[str]) -> ContextLayer:
    """Build platform expertise context layer."""
    parts = []
    for platform in platforms:
        if platform in PLATFORM_KNOWLEDGE:
            pk = PLATFORM_KNOWLEDGE[platform]
            quirks = '\n'.join(f'- {q}' for q in pk['quirks'])
            parts.append(f"""
<platform name="{pk['name']}" code="{platform}">
<quirks>
{quirks}
</quirks>
<primary_kpis>{json.dumps(pk['primary_kpis'], indent=2)}</primary_kpis>
<warning_thresholds>{json.dumps(pk['warning_thresholds'], indent=2)}</warning_thresholds>
</platform>""")
    
    content = "<platform_expertise>" + "".join(parts) + "\n</platform_expertise>"
    return ContextLayer(
        name="platform_expertise",
        content=content,
        token_estimate=estimate_tokens(content),
        cache_eligible=True,
        cache_ttl="5m",
        priority=2
    )


def build_industry_context(industries: List[str]) -> ContextLayer:
    """Build industry benchmark context layer."""
    parts = []
    for industry in industries:
        if industry in INDUSTRY_BENCHMARKS:
            ib = INDUSTRY_BENCHMARKS[industry]
            insights = '\n'.join(f'- {i}' for i in ib['insights'])
            parts.append(f"""
<industry name="{ib['name']}" code="{industry}">
<seasonality>{ib['seasonality']}</seasonality>
<benchmarks>{json.dumps(ib['benchmarks'], indent=2)}</benchmarks>
<insights>
{insights}
</insights>
</industry>""")
    
    content = "<industry_context>" + "".join(parts) + "\n</industry_context>"
    return ContextLayer(
        name="industry_benchmarks",
        content=content,
        token_estimate=estimate_tokens(content),
        cache_eligible=True,
        cache_ttl="5m",
        priority=3
    )


def build_tactic_context(tactics: List[str]) -> ContextLayer:
    """Build tactic guidance context layer."""
    parts = []
    for tactic in tactics:
        if tactic in TACTIC_GUIDANCE:
            tg = TACTIC_GUIDANCE[tactic]
            optimization = '\n'.join(f'- {o}' for o in tg['optimization_focus'])
            warnings = '\n'.join(f'- {w}' for w in tg['warning_signs'])
            parts.append(f"""
<tactic name="{tg['name']}" code="{tactic}">
<key_metrics>{', '.join(tg['key_metrics'])}</key_metrics>
<optimization_focus>
{optimization}
</optimization_focus>
<warning_signs>
{warnings}
</warning_signs>
</tactic>""")
    
    content = "<tactic_guidance>" + "".join(parts) + "\n</tactic_guidance>"
    return ContextLayer(
        name="tactic_guidance",
        content=content,
        token_estimate=estimate_tokens(content),
        cache_eligible=True,
        cache_ttl="5m",
        priority=4
    )


def assemble_context(
    platforms: List[str],
    industries: List[str],
    tactics: List[str],
    company_info: Optional[Dict] = None,
    performance_data: Optional[str] = None
) -> AssembledContext:
    """Assemble complete context for AI analysis."""
    layers = [build_system_prompt()]
    
    if platforms:
        layers.append(build_platform_context(platforms))
    if industries:
        layers.append(build_industry_context(industries))
    if tactics:
        layers.append(build_tactic_context(tactics))
    
    if company_info:
        content = f"<company_context>{json.dumps(company_info)}</company_context>"
        layers.append(ContextLayer("company_context", content, estimate_tokens(content), False, "none", 5))
    
    if performance_data:
        content = f"<performance_data>\n{performance_data}\n</performance_data>"
        layers.append(ContextLayer("performance_data", content, estimate_tokens(content), False, "none", 6))
    
    layers.sort(key=lambda x: x.priority)
    total_tokens = sum(l.token_estimate for l in layers)
    
    cache_config = {
        "layers": [{"name": l.name, "cache_eligible": l.cache_eligible, "ttl": l.cache_ttl, "tokens": l.token_estimate} for l in layers],
        "total_cacheable_tokens": sum(l.token_estimate for l in layers if l.cache_eligible)
    }
    
    xml_prompt = "\n\n".join(l.content for l in layers)
    
    return AssembledContext(
        layers=layers,
        total_tokens=total_tokens,
        platforms=platforms,
        industries=industries,
        tactics=tactics,
        cache_config=cache_config,
        xml_prompt=xml_prompt
    )


def main():
    parser = argparse.ArgumentParser(description='Build context for Report AI analysis')
    parser.add_argument('--platform', '-p', action='append', default=[], help='Platform code')
    parser.add_argument('--industry', '-i', action='append', default=[], help='Industry code')
    parser.add_argument('--tactic', '-t', action='append', default=[], help='Tactic code')
    parser.add_argument('--output', '-o', default='json', choices=['json', 'xml', 'summary'])
    parser.add_argument('--output-file', help='Write output to file')
    
    args = parser.parse_args()
    
    platforms = args.platform or ['facebook']
    industries = args.industry or ['automotive']
    tactics = args.tactic or ['retargeting']
    
    context = assemble_context(platforms, industries, tactics)
    
    if args.output == 'json':
        result = json.dumps({
            'summary': {'total_tokens': context.total_tokens, 'platforms': context.platforms, 'industries': context.industries, 'tactics': context.tactics},
            'cache_config': context.cache_config,
            'layers': [{'name': l.name, 'tokens': l.token_estimate, 'cache_eligible': l.cache_eligible} for l in context.layers]
        }, indent=2)
    elif args.output == 'xml':
        result = context.xml_prompt
    else:
        result = f"Total Tokens: {context.total_tokens:,}\nPlatforms: {', '.join(context.platforms)}\nIndustries: {', '.join(context.industries)}\nTactics: {', '.join(context.tactics)}"
    
    if args.output_file:
        with open(args.output_file, 'w') as f:
            f.write(result)
        print(f"Output written to {args.output_file}")
    else:
        print(result)
    
    return 0


if __name__ == '__main__':
    exit(main())
