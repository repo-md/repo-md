#!/bin/bash

# Build script for creating an npm-ready distribution package

echo "=== RepoMD NPM Package Builder ==="

# Run pre-publish checks if not skipped
if [ "$1" != "--skip-checks" ]; then
  echo "Running pre-publish checks..."
  npm run prepublish-checks
  
  # Check if prepublish checks were successful
  if [ $? -ne 0 ]; then
    echo "Error: Pre-publish checks failed."
    echo "To skip checks and continue anyway, run: npm run build-npm -- --skip-checks"
    exit 1
  fi
else
  echo "Skipping pre-publish checks..."
  echo "Running only typecheck (required)..."
  npm run typecheck
  
  if [ $? -ne 0 ]; then
    echo "Error: Typecheck failed. This cannot be skipped."
    exit 1
  fi
fi

# Check npm login status
echo "Checking npm login status..."
npm whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Warning: You're not logged in to npm. You'll need to run 'npm login' before publishing."
  echo "Continuing with build process..."
fi

# Show current versions
ROOT_VERSION=$(node -p "require('./package.json').version")
NPM_VERSION=$(node -p "require('./npm/package.json').version")

echo "Current versions:"
echo "  Root package.json: $ROOT_VERSION"
echo "  npm/package.json: $NPM_VERSION"

if [ "$ROOT_VERSION" != "$NPM_VERSION" ]; then
  echo "Warning: Version mismatch between package.json files. Consider running one of:"
  echo "  npm run version-bump-patch"
  echo "  npm run version-bump-minor"
  echo "  npm run version-bump-major"
fi

# Run the build
echo "Building RepoMD package (library and CLI)..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Error: Build failed. Exiting."
  exit 1
fi

# List the contents that will be published
echo "Package contents:"
find dist -type f | sort

# Check for duplicates in the npm pack output
echo "\nChecking for potential issues in the package..."
cd dist && npm pack --dry-run | grep -i readme

if [ $? -eq 0 ]; then
  echo "\n⚠️  Warning: Multiple README files detected in the package."
  echo "This could mean the README is being included twice in different locations."
  echo "Check package.json 'files' field and the copy-to-dist.js script."
else
  echo "\n✅ No duplicate README files detected in the package."
fi
cd ..

echo ""
echo "Done! The dist folder is now ready for npm distribution."
echo ""
echo "To publish to npm:"
echo "  cd dist"
echo "  npm publish [--tag beta] # Use --tag for pre-releases"
echo ""
echo "Or run:"
echo "  npm run publish-npm"
echo ""
echo "To preview package contents without publishing:"
echo "  npm run preview-npm"
echo ""

exit 0