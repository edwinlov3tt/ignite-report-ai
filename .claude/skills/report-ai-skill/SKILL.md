---
name: report-ai-agent-builder
description: Create and orchestrate specialized AI reporting agents for marketing campaign analysis. Use when generating multi-agent Cloudflare Workers for campaign reports, creating platform/industry/tactic expert agents, detecting tactics from CSV files, building context assemblies, validating reports against guidelines, or calculating benchmarks. This skill provides the Intelligence Flywheel architecture for self-improving marketing analytics.
---

# Report AI Agent Builder

This skill enables creation and orchestration of specialized AI agents for marketing campaign analysis and reporting. It implements the Intelligence Flywheel architecture where every report makes the system smarter.

## Quick Start

When tasked with creating reporting agents or building the multi-agent system:

1. **Detect tactics** from uploaded CSV files:
   ```bash
   python scripts/detect_tactics.py --file campaign_data.csv
   ```

2. **Build context** for agent analysis:
   ```bash
   python scripts/build_context.py --platform facebook --industry automotive --tactic retargeting --output xml
   ```

3. **Create new agents** for specific expertise:
   ```bash
   python scripts/create_agent.py --type platform --name tiktok --format cloudflare
   ```

4. **Validate reports** against quality guidelines:
   ```bash
   python scripts/validate_report.py --report output.md
   ```

5. **Calculate benchmarks** from historical data:
   ```bash
   python scripts/calculate_benchmarks.py calculate --data metrics.csv --output benchmarks.json
   ```

## Multi-Agent Architecture

The system uses specialized expert agents that work together:

| Agent Type | Purpose | When to Create |
|------------|---------|----------------|
| **Platform Expert** | Facebook, Google, Programmatic quirks | New advertising platform support |
| **Industry Expert** | Automotive, Healthcare benchmarks | New vertical onboarding |
| **Tactic Expert** | Retargeting, Prospecting optimization | New campaign type support |
| **Orchestrator** | Synthesizes all expert outputs | Final report generation |

## Creating Cloudflare Workers

To generate a complete multi-agent Cloudflare Worker:

```bash
# Generate all agent files
python scripts/create_agent.py --type platform --name facebook --format cloudflare
python scripts/create_agent.py --type industry --name automotive --format cloudflare  
python scripts/create_agent.py --type tactic --name retargeting --format cloudflare
python scripts/create_agent.py --type orchestrator --name report --format cloudflare
```

Each command generates:
- `{name}_system_prompt.txt` - Agent's system prompt
- `{name}_context_loader.py` - Python context loader class
- `{name}_validator.py` - Output validation rules
- `{name}_worker.ts` - Cloudflare Worker TypeScript
- `{name}_config.json` - Agent configuration

## Context Assembly

The context builder implements layered prompt caching:

| Layer | Content | Cache TTL | Tokens |
|-------|---------|-----------|--------|
| 1 | System prompt | 1 hour | ~4K |
| 2 | Platform expertise | 5 min | ~3K |
| 3 | Industry benchmarks | 5 min | ~1.5K |
| 4 | Tactic guidance | 5 min | ~2K |
| 5 | Campaign data | Never | Variable |

Generate XML context for a specific analysis:

```bash
python scripts/build_context.py \
  --platform facebook google \
  --industry automotive \
  --tactic retargeting prospecting \
  --output xml
```

## Report Validation

All generated reports must pass validation:

```bash
python scripts/validate_report.py --report campaign_report.md --strict
```

Validation checks:
- Required sections (Executive Summary, Key Metrics, Recommendations)
- Quantified claims (minimum 3 numeric references)
- Benchmark comparisons cited
- Recommendations include expected impact
- Warnings include severity levels

See `references/output-guidelines.md` for detailed formatting rules.

## Available Scripts

| Script | Purpose |
|--------|---------|
| `detect_tactics.py` | Identify tactics from CSV filenames and headers |
| `build_context.py` | Assemble layered context for AI analysis |
| `create_agent.py` | Generate new agent configurations and Workers |
| `validate_report.py` | Validate reports against quality guidelines |
| `calculate_benchmarks.py` | Calculate and compare benchmark metrics |

## Reference Documentation

For detailed implementation guidance, consult:

- `references/agents.md` - Agent configuration templates and protocols
- `references/platforms.md` - Platform-specific knowledge base
- `references/industries.md` - Industry benchmarks and context
- `references/tactics.md` - Tactic optimization guidelines
- `references/output-guidelines.md` - Report formatting rules
- `references/cloudflare-integration.md` - Worker deployment guide

## Report Templates

Templates for consistent output formatting:

- `assets/report_templates/executive_report.md` - Executive summary format
- `assets/report_templates/detailed_analysis.md` - Full analysis format
- `assets/output_schemas/agent_response.json` - Structured output schema

## Best Practices

### DO:
- Always run `detect_tactics.py` before building context
- Use layered context loading to minimize token usage
- Validate all reports before delivery
- Compare metrics to industry benchmarks
- Include expected impact with recommendations

### DON'T:
- Combine metrics across different tactics
- Skip validation on generated reports
- Use generic benchmarks when specific ones exist
- Create agents without testing output validation
- Deploy Workers without proper error handling

## Example Workflow

Complete workflow for creating a new platform expert:

```bash
# 1. Create the agent
python scripts/create_agent.py --type platform --name tiktok --format cloudflare

# 2. Test context loading
python scripts/build_context.py --platform tiktok --output summary

# 3. Validate sample output
echo "# Test Report\n## Executive Summary\nTikTok CPM of $8.50 is 15% below benchmark..." | \
  python scripts/validate_report.py --stdin

# 4. Deploy to Cloudflare
# Use generated tiktok_worker.ts with wrangler
```
