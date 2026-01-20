# Agent Configuration Reference

This document provides templates and guidance for creating specialized AI agents in the Report AI Intelligence Flywheel system.

## Agent Types Overview

| Type | Purpose | Key Focus |
|------|---------|-----------|
| Platform Expert | Platform-specific analysis | Quirks, KPIs, optimization |
| Industry Expert | Vertical benchmarks | Seasonality, norms |
| Tactic Expert | Campaign type optimization | Retargeting, prospecting |
| Orchestrator | Report synthesis | Prioritization, narrative |

## Platform Expert Template

```yaml
agent_type: platform
name: {platform_name}

expertise:
  - Platform-specific quirks
  - KPI interpretation
  - Optimization strategies

output_sections:
  - platform_health_check
  - platform_specific_insights
  - platform_optimizations
  - platform_warnings
```

## Industry Expert Template

```yaml
agent_type: industry
name: {industry_name}

expertise:
  - Industry benchmarks
  - Seasonality patterns
  - Competitive landscape

output_sections:
  - benchmark_comparison
  - industry_insights
  - seasonal_considerations
  - competitive_positioning
```

## Tactic Expert Template

```yaml
agent_type: tactic
name: {tactic_name}

expertise:
  - Tactic-specific KPIs
  - Optimization levers
  - Warning indicators

output_sections:
  - tactic_performance
  - kpi_analysis
  - optimization_opportunities
  - tactic_recommendations
```

## Agent Communication Protocol

### Input Format
```xml
<agent_input>
  <campaign_context>...</campaign_context>
  <expertise_context>...</expertise_context>
  <performance_data>...</performance_data>
  <analysis_request>...</analysis_request>
</agent_input>
```

### Output Format
```xml
<agent_output agent="{name}" type="{type}">
  <insights>
    <insight category="{cat}">
      <observation>...</observation>
      <evidence>...</evidence>
      <impact>...</impact>
    </insight>
  </insights>
  <recommendations>
    <recommendation priority="{high|medium|low}">
      <action>...</action>
      <expected_impact>...</expected_impact>
    </recommendation>
  </recommendations>
  <warnings>
    <warning severity="{critical|warning|info}">...</warning>
  </warnings>
</agent_output>
```

## Creating New Agents

```bash
# Platform expert
python scripts/create_agent.py --type platform --name tiktok

# Industry expert
python scripts/create_agent.py --type industry --name healthcare

# Tactic expert
python scripts/create_agent.py --type tactic --name prospecting

# With Cloudflare Worker
python scripts/create_agent.py --type platform --name linkedin --format cloudflare
```
