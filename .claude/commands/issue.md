# Log Issue

Log a bug or issue to KNOWN_ISSUES.md.

**Issue to log:** $ARGUMENTS

## Steps

### 1. Classify the Issue

Determine severity:
- 🔴 **CRITICAL**: System unusable, data loss risk, security vulnerability
- 🟠 **HIGH**: Major feature broken, no workaround available
- 🟡 **MEDIUM**: Feature impaired but workaround exists
- 🟢 **LOW**: Minor inconvenience, cosmetic issues

### 2. Gather Details

For the issue, determine:

1. **Title**: Brief, descriptive name
2. **Location**: File path and function/component where the issue occurs
3. **Symptom**: What happens when this issue occurs
4. **Root Cause**: Why it happens (or "Investigation needed")
5. **Workaround**: Any temporary fix (or "None")
6. **Proper Fix**: What needs to be done to resolve permanently
7. **Reproduction** (optional): Steps to trigger the issue

### 3. Add to KNOWN_ISSUES.md

Add under "Active Issues" in `.claude/docs/KNOWN_ISSUES.md`:

```markdown
### [SEVERITY] Brief Descriptive Title
- **Location**: `path/to/file.ts` - `functionName()`
- **Symptom**: What happens when this issue occurs
- **Root Cause**: Why it happens (or "Investigation needed")
- **Workaround**: Temporary fix (or "None")
- **Proper Fix**: What needs to be done to resolve permanently
- **Reproduction**: Steps to trigger (if applicable)
- **Added**: YYYY-MM-DD
```

### 4. Confirm

## Output

```markdown
## Issue Logged

**Severity**: [CRITICAL/HIGH/MEDIUM/LOW]
**Title**: [Issue title]
**Location**: `[file path]`

### Summary
[1-2 sentence description of the issue]

Added to `.claude/docs/KNOWN_ISSUES.md`

[If CRITICAL or HIGH:]
⚠️ **This is a high-priority issue.** Consider addressing it before continuing with other work.
```
