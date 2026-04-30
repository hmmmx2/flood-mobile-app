#!/usr/bin/env bash
# EAS Build hook — runs before npm install and before expo prebuild.
# Removes any stale android/ or ios/ directories so expo prebuild always
# generates a completely fresh native project (including gradle-wrapper.jar).
set -euo pipefail
echo "Cleaning stale native directories before prebuild..."
rm -rf android ios
echo "Done. expo prebuild will generate a fresh android/ on this build."
