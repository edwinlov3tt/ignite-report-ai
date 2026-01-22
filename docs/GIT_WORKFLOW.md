# Git Workflow Guidelines

This document establishes the git workflow and branching strategy for the Report.AI project.

## Branch Structure

### Main Branches
- **`main`** - Production-ready code, deployed to production
- **`develop`** - Integration branch for features (optional, for larger teams)

### Feature Branches
- **`feature/<feature-name>`** - New features
- **`fix/<issue-name>`** - Bug fixes
- **`hotfix/<issue-name>`** - Urgent production fixes
- **`chore/<task-name>`** - Maintenance tasks (deps, configs, etc.)

## Workflow Rules

### 1. Branch Creation
```bash
# Always branch from main for new features
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 2. Regular Commits
- Make atomic commits with clear messages
- Use conventional commit format when possible:
  - `feat:` New feature
  - `fix:` Bug fix
  - `docs:` Documentation changes
  - `style:` Code style changes (formatting, etc.)
  - `refactor:` Code refactoring
  - `test:` Test additions or changes
  - `chore:` Maintenance tasks

### 3. Commit Message Format
```
<type>: <subject>

<body>

<footer>
```

Example:
```
feat: add research session management to Schema Curator

- Implement session storage and retrieval
- Add UI for loading previous sessions
- Ground AI research in available metrics

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 4. Keep Branches Up to Date
```bash
# Regularly sync with main
git checkout main
git pull origin main
git checkout feature/your-feature
git merge main  # or rebase if preferred
```

### 5. Before Creating PR
```bash
# Ensure your branch is up to date
git checkout main
git pull origin main
git checkout feature/your-feature
git merge main

# Run tests
npm test

# Check for linting issues
npm run lint

# Build to ensure no errors
npm run build
```

### 6. Pull Request Process
1. Create PR with clear description
2. Reference any related issues
3. Ensure CI passes
4. Request review from team members
5. Address review feedback
6. Squash and merge when approved

## Best Practices

### Do's ✅
- Keep commits focused and atomic
- Write meaningful commit messages
- Test locally before pushing
- Keep branches short-lived
- Delete branches after merging
- Use `.gitignore` properly
- Commit `.env.example` but never `.env`

### Don'ts ❌
- Don't commit directly to main
- Don't commit sensitive data (keys, passwords)
- Don't commit large binary files
- Don't commit `node_modules/` or build artifacts
- Don't force push to shared branches
- Don't merge without testing

## Common Commands

### View Status
```bash
git status                    # Check working directory status
git log --oneline -10         # View recent commits
git branch -a                 # List all branches
```

### Stash Changes
```bash
git stash                     # Save current changes
git stash pop                 # Apply stashed changes
git stash list                # View all stashes
```

### Undo Changes
```bash
git reset HEAD~1              # Undo last commit (keep changes)
git reset --hard HEAD~1       # Undo last commit (discard changes)
git checkout -- file.txt      # Discard changes to specific file
```

### Clean Up
```bash
git clean -fd                 # Remove untracked files
git branch -d feature/done    # Delete local branch
git push origin --delete feature/done  # Delete remote branch
```

## Environment Files

### What to Commit
- ✅ `.env.example` - Template with all variables documented
- ✅ `.env.development.example` - Development-specific template
- ✅ `.env.test` - Test environment (no secrets)

### What NOT to Commit
- ❌ `.env` - Local environment variables
- ❌ `.env.local` - Local overrides
- ❌ `.env.production` - Production secrets

## Migration Management

When adding database migrations:
1. Create migration file in `workers/migrations/`
2. Use sequential numbering (e.g., `012_your_migration.sql`)
3. Document the migration purpose
4. Test locally before committing
5. Note in PR if manual migration run is needed

## CI/CD Integration

Before merging to main, ensure:
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Documentation is updated
- [ ] Environment variables are documented in `.env.example`

## Emergency Procedures

### Hotfix Process
```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue

# 2. Make fix and test thoroughly
# 3. Create PR directly to main
# 4. After merge, sync other branches
```

### Rollback Deployment
```bash
# Find the last good commit
git log --oneline

# Revert to previous version
git revert HEAD
# or
git reset --hard <commit-hash>
```

## Team Conventions

1. **PR Reviews**: At least one approval required
2. **Branch Protection**: Main branch protected
3. **Squash Merging**: Keep history clean
4. **Issue Tracking**: Link PRs to issues
5. **Documentation**: Update docs with code

---

*Last Updated: 2025-01-22*
*For questions, contact the development team*