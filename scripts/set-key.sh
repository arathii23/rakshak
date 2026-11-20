#!/usr/bin/env bash
# Saves your Sarvam API key to .env (git-ignored). The key is typed hidden and never printed.
set -euo pipefail
cd "$(dirname "$0")/.."
printf "Paste your Sarvam API key ONCE (hidden), then press Enter: "
IFS= read -rs KEY
echo
# Trim leading/trailing whitespace and carriage returns.
KEY="${KEY#"${KEY%%[![:space:]]*}"}"; KEY="${KEY%"${KEY##*[![:space:]]}"}"; KEY="${KEY//$'\r'/}"
if [ -z "$KEY" ]; then echo "No key entered. Nothing saved."; exit 1; fi
if [[ "$KEY" =~ [[:space:]] ]]; then
  echo "That looks like more than one value (it has a space inside). It may have been pasted twice. Nothing saved. Run this script again and paste once."
  exit 1
fi
umask 077
printf 'SARVAM_API_KEY=%s\n' "$KEY" > .env
KEYLEN=${#KEY}
unset KEY
chmod 600 .env
echo "Saved to .env (git-ignored, owner-only). Key length: ${KEYLEN} characters. The key was not printed or logged."
