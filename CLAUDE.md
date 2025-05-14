# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Build library: `npm run build`
- Build CLI: `npm run build:cli`
- Build demo: `npm run build:demo`
- Typecheck: `npm run typecheck`

DONT RUN DEMOS, the user will test it. you can test builds .

## Code Style Guidelines

- **TypeScript**: Use strict typing with proper interfaces and types
- **Imports**: Group and order by: built-in modules, external modules, internal modules
- **Formatting**: 2-space indentation, semi-colons required, single quotes preferred
- **React Components**: Use functional components with TypeScript interfaces for props
- **Error Handling**: Use try/catch blocks with specific error messages, but only when necessary, if error is handled in a function above, or has no risk of crashing, dont trycatch uselessly.
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces/components
- **Comments**: DO NOT use JSDoc for exported functions, simple one-line comment for readability, minimal inline comments
- **Exports**: Prefer named exports, use default exports for React components
