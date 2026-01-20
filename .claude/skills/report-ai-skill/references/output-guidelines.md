# Report Output Guidelines

## Required Sections

Every report MUST include these sections:

### 1. Executive Summary
- **Length**: 2-3 sentences maximum
- **Content**: Overall performance assessment and single most important insight
- **Example**: "Campaign delivered strong performance with CPM 15% below benchmark. Retargeting drove 80% of conversions at efficient $42 CPA. Primary opportunity is increasing prospecting budget to fuel the retargeting funnel."

### 2. Key Metrics Overview
- **Format**: Table with metrics, values, benchmarks, and status
- **Required columns**: Metric, Actual, Benchmark, vs Benchmark, Status

```markdown
| Metric | Actual | Benchmark | vs Benchmark | Status |
|--------|--------|-----------|--------------|--------|
| CPM | $8.50 | $10.00 | -15% | ✓ Good |
| CTR | 1.2% | 1.5% | -20% | ⚠ Below |
| CPA | $42 | $50 | -16% | ✓ Good |
```

### 3. Recommendations
- **Format**: Prioritized list with expected impact
- **Required elements**: Priority level, action, expected impact, effort
- **Maximum**: 10 recommendations

```markdown
#### High Priority
1. **Increase retargeting frequency cap from 3 to 5**
   - Expected Impact: +15% conversions
   - Effort: Low
   - Timeline: Immediate

#### Medium Priority
2. **Test lookalike audience expansion**
   - Expected Impact: +20% reach
   - Effort: Medium
   - Timeline: Next week
```

## Optional Sections

### Warnings & Flags
- **Format**: Severity level + message + recommended action
- **Severity levels**: Critical, Warning, Info

```markdown
⚠️ **WARNING**: Frequency exceeds 5x on Facebook retargeting
- Current: 6.2x weekly
- Threshold: 5.0x
- Action: Reduce frequency cap or expand audience
```

### Platform Analysis
- One subsection per platform
- Include platform-specific insights and quirks

### Tactic Analysis
- One subsection per tactic type
- Never combine metrics across tactics

## Formatting Rules

### DO:
- Ground all insights in actual data
- Include specific numbers with comparisons
- Cite benchmark sources
- Use consistent formatting throughout
- Include severity levels on warnings

### DON'T:
- Make claims without data support
- Combine metrics across different tactics
- Exceed executive summary length
- Include more than 10 recommendations
- Use vague terms like "good" without numbers

## Quality Checklist

Before delivering any report, verify:

- [ ] Executive summary is 2-3 sentences
- [ ] All metrics compared to benchmarks
- [ ] Recommendations have expected impact
- [ ] Warnings have severity levels
- [ ] No tactics combined in aggregations
- [ ] At least 3 quantified claims
- [ ] Word count under 3,000

## Validation

Run the validator before delivery:

```bash
python scripts/validate_report.py --report output.md --strict
```

Quality score must be ≥80 for delivery.
