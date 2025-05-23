# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Build library: `npm run build`
- Build CLI: `npm run build:cli`
- Build demo: `npm run build:demo`
- Development: `npm run dev`
- Demo development: `npm run dev:demo`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm run test` (runs lint and typecheck)

## Code Style Guidelines

- **TypeScript**: Use strict typing with proper interfaces and types
- **Imports**: Group and order by: built-in modules, external modules, internal modules
- **Formatting**: 2-space indentation, semi-colons required, single quotes preferred
- **React Components**: Use functional components with TypeScript interfaces for props
- **Error Handling**: Use try/catch blocks with specific error messages
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces/components
- **Comments**: Use JSDoc for exported functions, minimal inline comments
- **Exports**: Prefer named exports, use default exports for React components