#!/bin/bash

# Build script for creating an npm-ready distribution package

echo "Building RepoMD package (library and CLI)..."

# Use the improved build command that includes cleaning, building lib and CLI
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Error: Build failed. Exiting."
  exit 1
fi

echo "Done! The dist folder is now ready for npm distribution."
echo ""
echo "To publish to npm, run:"
echo "  cd dist"
echo "  npm publish"
echo ""

exit 0