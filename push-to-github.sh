#!/bin/bash
# SK AI - Push to GitHub and trigger Railway deployment
# Usage: GITHUB_TOKEN=your_token GITHUB_REPO=username/repo-name bash push-to-github.sh

set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN is required"
  echo "Usage: GITHUB_TOKEN=your_token GITHUB_REPO=username/repo-name bash push-to-github.sh"
  exit 1
fi

if [ -z "$GITHUB_REPO" ]; then
  echo "Error: GITHUB_REPO is required (format: username/repo-name)"
  exit 1
fi

REPO_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"

echo "Setting up git remote..."
git config user.email "sk-ai@deploy.bot"
git config user.name "SK AI Deploy Bot"

if git remote get-url origin &>/dev/null; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

echo "Adding all files..."
git add -A

git commit -m "feat: SK AI API server with vision, multilingual, emoji support" || echo "Nothing new to commit"

echo "Pushing to GitHub (main branch)..."
git push -u origin main --force

echo ""
echo "✅ Successfully pushed to GitHub!"
echo "🚂 Railway will automatically detect the push and deploy."
echo "📋 Railway Project ID: a405764b-2580-43ff-8d42-0e6e933a963a"
echo ""
echo "Track your deployment at: https://railway.app/project/a405764b-2580-43ff-8d42-0e6e933a963a"
