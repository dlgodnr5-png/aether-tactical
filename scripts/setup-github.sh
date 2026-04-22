#!/usr/bin/env bash
# One-shot GitHub setup + Vercel git integration.
#
# Run this AFTER: `gh auth login` (interactive, 30 seconds in browser).
#
# What it does:
#  1. Creates a public GitHub repo `aether-tactical` under your account
#  2. Adds it as origin remote and pushes master
#  3. Links this Vercel project to the GitHub repo (future pushes auto-deploy)
#
# Requirements:
#   - gh CLI (already installed via winget)
#   - vercel CLI (already installed)
#   - User authenticated: run `gh auth login` once if not

set -euo pipefail

REPO_NAME="${REPO_NAME:-aether-tactical}"
REPO_VISIBILITY="${REPO_VISIBILITY:-public}"  # change to "private" if desired

cd "$(dirname "$0")/.."

# Prefer the full path on Windows if gh not in PATH
GH_BIN=gh
if ! command -v gh &>/dev/null; then
  if [ -x "/c/Program Files/GitHub CLI/gh.exe" ]; then
    GH_BIN="/c/Program Files/GitHub CLI/gh.exe"
  else
    echo "✗ gh CLI not found. Install via: winget install GitHub.cli" >&2
    exit 1
  fi
fi

echo "→ Checking gh auth status..."
if ! "$GH_BIN" auth status &>/dev/null; then
  echo "✗ Not authenticated. Run: $GH_BIN auth login" >&2
  echo "  Then re-run this script." >&2
  exit 1
fi

OWNER=$("$GH_BIN" api user --jq .login)
echo "→ Authenticated as: $OWNER"

# 1. Create repo if missing
if "$GH_BIN" repo view "$OWNER/$REPO_NAME" &>/dev/null; then
  echo "→ Repo $OWNER/$REPO_NAME already exists, skipping creation"
else
  echo "→ Creating $REPO_VISIBILITY repo $OWNER/$REPO_NAME..."
  "$GH_BIN" repo create "$REPO_NAME" --"$REPO_VISIBILITY" \
    --description "Aether Tactical — Next.js 3D tactical flight sim" \
    --confirm 2>/dev/null || \
    "$GH_BIN" repo create "$REPO_NAME" --"$REPO_VISIBILITY" \
      --description "Aether Tactical — Next.js 3D tactical flight sim"
fi

# 2. Add remote + push
REMOTE_URL="https://github.com/$OWNER/$REPO_NAME.git"
if git remote get-url origin &>/dev/null; then
  CURRENT_URL=$(git remote get-url origin)
  if [ "$CURRENT_URL" != "$REMOTE_URL" ]; then
    echo "→ Updating origin: $CURRENT_URL → $REMOTE_URL"
    git remote set-url origin "$REMOTE_URL"
  else
    echo "→ Origin already set: $REMOTE_URL"
  fi
else
  echo "→ Adding origin: $REMOTE_URL"
  git remote add origin "$REMOTE_URL"
fi

echo "→ Pushing master to origin..."
git push -u origin master

# 3. Link Vercel to GitHub repo
echo "→ Linking Vercel project to GitHub..."
if vercel git connect "$REMOTE_URL" --yes 2>&1 | tail -5; then
  echo "✓ Vercel will auto-deploy on every push to master"
else
  echo "⚠ Vercel git connect failed. Manual step:"
  echo "  Visit https://vercel.com/dlgodnr5s-projects/aether-tactical/settings/git"
  echo "  → 'Connect Git Repository' → select $OWNER/$REPO_NAME"
fi

echo ""
echo "✅ Done. Next pushes auto-deploy to https://aether-tactical.vercel.app"
