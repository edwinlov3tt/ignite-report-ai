# Initialize Documentation Structure

Create the documentation folder structure for a new project.

## Steps

### 1. Create Directory Structure

```bash
mkdir -p .claude/docs/services
mkdir -p .claude/docs/components
```

### 2. Create CHANGELOG.md

Create `.claude/docs/CHANGELOG.md`:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

### Removed
-

---

<!--
## YYYY-MM-DD

### [Feature Name]
- Change description
- Another change
- ⚠️ BREAKING: Description of breaking change

### [Another Feature]
- Change description
-->

## Format Guide

- **Added**: New features or functionality
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes
- **Removed**: Removed features or functionality
- **Security**: Security-related changes
- **Deprecated**: Features marked for future removal
```

### 3. Create KNOWN_ISSUES.md

Create `.claude/docs/KNOWN_ISSUES.md`:

```markdown
# Known Issues

Track bugs, edge cases, and technical debt. This is the goldmine for developer handoffs.

## Active Issues

<!-- Add issues here using the template below -->

---

## Resolved Issues

<!-- Move resolved issues here with resolution notes -->

---

## Severity Guide

| Level | Description | Response Time |
|-------|-------------|---------------|
| 🔴 **CRITICAL** | System unusable, data loss risk, security vulnerability | Fix immediately |
| 🟠 **HIGH** | Major feature broken, no workaround available | Fix this sprint |
| 🟡 **MEDIUM** | Feature impaired but workaround exists | Fix when possible |
| 🟢 **LOW** | Minor inconvenience, cosmetic issues | Fix eventually |

## Issue Template

\`\`\`markdown
### [SEVERITY] Brief Descriptive Title
- **Location**: \`path/to/file.ts\` - \`functionName()\`
- **Symptom**: What happens when this issue occurs
- **Root Cause**: Why it happens (or "Investigation needed")
- **Workaround**: Temporary fix (or "None")
- **Proper Fix**: What needs to be done to resolve permanently
- **Reproduction**: Steps to trigger (optional)
- **Added**: YYYY-MM-DD
\`\`\`

## Resolution Template

When resolving an issue, move it to Resolved Issues:

\`\`\`markdown
### [RESOLVED] Issue Title
- **Location**: \`path/to/file.ts\`
- **Resolution**: How it was fixed
- **Commit/PR**: [reference]
- **Resolved**: YYYY-MM-DD
\`\`\`
```

### 4. Create DECISIONS.md

Create `.claude/docs/DECISIONS.md`:

```markdown
# Architectural Decisions

Record of significant technical decisions and their context. This helps future developers understand *why* things were built a certain way.

---

## Decisions

<!-- Add decisions here using the template below -->

---

## When to Record

✅ **Record when:**
- Choosing between technologies or frameworks
- Designing data models or API structures
- Setting up deployment or infrastructure
- Establishing patterns that will be repeated
- Making tradeoffs that won't be obvious later

❌ **Don't record:**
- Obvious industry-standard choices
- Temporary implementations
- Personal style preferences

---

## Decision Template

\`\`\`markdown
## [Title - What Was Decided]
- **Date**: YYYY-MM-DD
- **Status**: Proposed | Accepted | Deprecated | Superseded by [X]

### Context
What situation or problem required this decision? What constraints existed?
What were we trying to achieve?

### Decision
What was chosen and the primary reason why. (1-3 sentences)

### Alternatives Considered
1. **[Option A]**: Brief description
   - Pros: [benefits]
   - Cons: [drawbacks]
   - Rejected because: [reason]

2. **[Option B]**: Brief description
   - Pros: [benefits]
   - Cons: [drawbacks]
   - Rejected because: [reason]

### Consequences
- **Positive**: What we gain from this decision
- **Negative**: What we give up or must handle as a result
- **Neutral**: Other implications worth noting

### Notes
Any additional context, links to discussions, or related decisions.
\`\`\`
```

### 5. Create ARCHITECTURE.md

Create `.claude/docs/ARCHITECTURE.md`:

```markdown
# Architecture Overview

System design and technical reference for this project.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | | |
| Backend | | |
| Database | | |
| Auth | | |
| Hosting | | |
| CI/CD | | |

---

## Directory Structure

\`\`\`
project/
├── src/                # Source code
├── public/             # Static assets
├── .claude/            # Claude Code configuration
│   └── docs/           # Project documentation
└── ...
\`\`\`

---

## Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| | | |

---

## Data Flow

[Describe or diagram the main data flows in the application]

---

## External Services

| Service | Purpose | Docs |
|---------|---------|------|
| | | |

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| | | |

---

## Deployment

### Production
[Deployment process and configuration]

### Staging
[Staging environment details if applicable]

---

## Security Considerations

- **Authentication**: [Method used]
- **Authorization**: [How permissions work]
- **Secrets**: [How secrets are managed]

---

## Performance

- **Caching**: [Caching strategy]
- **Optimization**: [Key optimizations]
```

### 6. Verify Structure

```bash
ls -la .claude/docs/
```

Expected output:
```
.claude/docs/
├── ARCHITECTURE.md
├── CHANGELOG.md
├── DECISIONS.md
├── KNOWN_ISSUES.md
├── components/
└── services/
```

---

## Output

```markdown
## Documentation Structure Initialized

Created:
- ✅ `.claude/docs/CHANGELOG.md`
- ✅ `.claude/docs/KNOWN_ISSUES.md`
- ✅ `.claude/docs/DECISIONS.md`
- ✅ `.claude/docs/ARCHITECTURE.md`
- ✅ `.claude/docs/services/` (directory)
- ✅ `.claude/docs/components/` (directory)

**Next steps:**
1. Run `/audit` to analyze the project and populate documentation
2. Or manually fill in the templates with project-specific information
```
