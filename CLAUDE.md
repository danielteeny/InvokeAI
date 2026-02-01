# InvokeAI Development - Claude Code Instructions

## Resume Command

When user types "resume", do the following:

### 1. Start InvokeAI
```bash
cd /Users/danielteeny/Downloads/InvokeAI/InvokeAI
source .venv/bin/activate
invokeai-web
```
Run this in the background so the user can continue chatting.

### 2. Provide Access URL
- **Local UI**: http://127.0.0.1:9090

### 3. Check for Updates
```bash
git fetch upstream
git log HEAD..upstream/main --oneline | head -5
```
If there are upstream updates, ask if user wants to merge them.

### 4. Suggest What to Work On

Check these areas for potential improvements:

- **Open Issues**: `gh issue list --repo danielteeny/InvokeAI`
- **Upstream PRs**: Check https://github.com/invoke-ai/InvokeAI/pulls for interesting features
- **Recent Changes**: `git log --oneline -10` to see what was recently worked on

Common areas of interest:
- UI/UX improvements (vertical layouts, mobile optimization)
- LoRA management features
- Gallery and image viewer enhancements
- Performance optimizations

## Key Paths

- **Project Root**: `/Users/danielteeny/Downloads/InvokeAI/InvokeAI`
- **Virtual Environment**: `.venv/`
- **Frontend Code**: `invokeai/frontend/web/src/`
- **Backend Code**: `invokeai/app/` and `invokeai/backend/`
- **Workflows**: `.github/workflows/`

## Development Commands

```bash
# Frontend
cd invokeai/frontend/web
pnpm dev          # Dev server (binds to Tailscale IP)
pnpm build        # Build for production
pnpm lint         # Run all linters
pnpm lint:tsc     # TypeScript check only

# Git
git fetch upstream                    # Fetch upstream changes
git merge upstream/main               # Merge upstream
git push                              # Push to origin (triggers Docker build)
```

## Deployment

- **Docker Registry**: ghcr.io/danielteeny/invokeai:personal-dev
- **Auto-build**: Pushes to `personal/dev` trigger Docker builds
- **Auto-sync**: Daily at midnight UTC, syncs from upstream InvokeAI

## Recent Work

- Arrow key navigation fix for image viewer (allows navigation when viewer panel is focused)
- Vertical layout support for mobile/tablet
- LoRA tooltip, drag-to-reorder, and sort features
- CI/CD Docker workflow setup
