#!/usr/bin/env bash
# Rocket Atlas — one-shot setup for macOS:
#   1. pushes the project to a new GitHub repo (rocket-atlas) on your account
#   2. installs dependencies and serves it at http://localhost:3000
set -e
cd "$(dirname "$0")"
REPO_NAME="rocket-atlas"

say() { printf "\n\033[1;33m▸ %s\033[0m\n" "$1"; }

# --- tools -------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then say "Installing Node.js…"; brew install node
  else echo "Node.js is required: install it from https://nodejs.org and re-run."; exit 1; fi
fi
if ! command -v gh >/dev/null 2>&1 && command -v brew >/dev/null 2>&1; then
  say "Installing the GitHub CLI…"; brew install gh
fi

# --- GitHub ------------------------------------------------------------------
if command -v gh >/dev/null 2>&1; then
  if ! gh auth status >/dev/null 2>&1; then
    say "Sign in to GitHub (a browser window will open)…"
    gh auth login --hostname github.com --git-protocol https --web
  fi
  gh auth setup-git >/dev/null 2>&1 || true

  if [ ! -d .git ]; then
    git init -q -b main 2>/dev/null || { git init -q; git checkout -q -b main; }
  fi
  if [ -z "$(git config user.email)" ]; then
    LOGIN=$(gh api user --jq .login); ID=$(gh api user --jq .id)
    git config user.name "$LOGIN"
    git config user.email "${ID}+${LOGIN}@users.noreply.github.com"
  fi
  git add -A
  git diff --cached --quiet || git commit -qm "Rocket Atlas: interactive 3D rocket exhibit (Next.js + Three.js)"

  if git remote get-url origin >/dev/null 2>&1; then
    say "Pushing to GitHub…"; git push -u origin main
  elif gh repo view "$REPO_NAME" >/dev/null 2>&1; then
    say "Repo $REPO_NAME already exists — pushing to it…"
    git remote add origin "$(gh repo view "$REPO_NAME" --json url --jq .url).git"
    git push -u origin main
  else
    say "Creating github.com/$(gh api user --jq .login)/$REPO_NAME and pushing…"
    gh repo create "$REPO_NAME" --public --source=. --remote=origin --push \
      --description "Interactive 3D rocket exhibit — Mercury-Redstone, Gemini-Titan II and Saturn V at true scale, with an AI guide."
  fi
  say "On GitHub: $(gh repo view --json url --jq .url)"
else
  echo "GitHub CLI not available (no Homebrew) — skipping the GitHub step. Install gh from https://cli.github.com and re-run."
fi

# --- localhost ---------------------------------------------------------------
say "Installing dependencies…"
npm install --no-fund --no-audit
say "Starting Rocket Atlas at http://localhost:3000  (Ctrl+C to stop)"
( sleep 6 && open "http://localhost:3000" ) &
npm run dev
