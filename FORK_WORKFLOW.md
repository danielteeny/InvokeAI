# Fork Workflow Guide

This guide explains how to manage your InvokeAI fork, contribute features upstream, and stay synchronized with official updates.

## Branch Structure

Your fork has three main branches:

- **`main`** - Kept in sync with official InvokeAI (upstream). Don't work directly here.
- **`feature/vertical-monitor`** - Clean branch with ONLY vertical monitor changes for PR submission.
- **`personal/dev`** - Your daily-use branch with ALL your custom features combined.

## Common Workflows

### Working on Your Personal Features

This is what you'll do most often - just work on your personal branch:

```bash
# Switch to your personal development branch
git checkout personal/dev

# Make your changes, then commit
git add .
git commit -m "Add model organization feature"

# Push to your fork
git push origin personal/dev
```

### Syncing with InvokeAI Updates

When InvokeAI releases updates, merge them into your branches:

```bash
# Fetch latest changes from upstream
git fetch upstream

# Update your main branch
git checkout main
git merge upstream/main
git push origin main

# Merge updates into your personal branch
git checkout personal/dev
git merge main
git push origin personal/dev
```

If there are conflicts, git will tell you. Usually conflicts are rare and easy to fix.

### Creating a New Feature for PR

When you want to contribute a new feature:

```bash
# Make sure main is up-to-date first
git checkout main
git pull upstream main

# Create a new clean branch for your feature
git checkout -b feature/model-organization

# Make ONLY the changes for this specific feature
# Then commit and push
git add .
git commit -m "Add model organization feature"
git push -u origin feature/model-organization
```

Then create the PR on GitHub from this branch.

### Keeping Personal Features After PR Merge

After your PR is merged into upstream:

```bash
# Sync main with upstream (which now has your feature)
git checkout main
git pull upstream main

# Merge into personal/dev (git will skip duplicate changes)
git checkout personal/dev
git merge main
```

Your personal branch automatically stays up-to-date!

## Current Status

- **Upstream**: https://github.com/invoke-ai/InvokeAI
- **Your Fork**: https://github.com/danielteeny/InvokeAI

### Current Branches

- `main` - Clean, synced with upstream (NO custom changes)
- `feature/vertical-monitor` - Has your 6 vertical monitor commits, ready for PR
- `personal/dev` - Has your 6 vertical monitor commits, use for daily development

## Next Steps

1. **Submit PR**: Go to GitHub and create a Pull Request from `feature/vertical-monitor` to `invoke-ai/InvokeAI:main`
2. **Switch to personal/dev**: Use `git checkout personal/dev` for daily work
3. **Add new features**: Work on `personal/dev` for model organization and other features
4. **Stay updated**: Run sync commands weekly to get latest InvokeAI updates

## Helpful Commands

```bash
# See which branch you're on
git branch

# Switch branches
git checkout personal/dev

# See what's changed
git status

# See commit history
git log --oneline -10

# Undo uncommitted changes
git checkout .

# See all your branches
git branch -a
```

## Tips

- **NEVER commit directly to `main`** - It should always stay clean and match upstream
- Always work on `personal/dev` for daily use
- Only create `feature/` branches when preparing a PR (branch from clean `main`)
- Sync with upstream regularly (weekly) to avoid large merge conflicts
- If you mess up, don't worry - your commits are safe. Ask Claude for help!

## Important Rules

1. **`main` branch is sacred** - Only used for syncing with upstream, never commit your own work here
2. **Work on `personal/dev`** - This is your workspace for all custom features
3. **Create `feature/` branches from `main`** - When contributing, branch from clean `main` and cherry-pick specific commits
