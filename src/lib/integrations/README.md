# RepoMD Framework Integrations

Super simple integrations for RepoMD across all major frameworks. One line integration!

## 🚀 Quick Start

### Vite/Vue

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { viteRepoMdProxy } from 'repo-md';

export default defineConfig({
  server: {
    proxy: viteRepoMdProxy('your-project-id') // That's it! 🎉
  }
});
```

### Next.js (Middleware)

```typescript
// middleware.ts
import { nextRepoMdMiddleware } from 'repo-md';

// The function returns both middleware and config
const repoMd = nextRepoMdMiddleware('your-project-id');

export const middleware = repoMd.middleware;
export const config = repoMd.config;

// Or destructure directly:
// export const { middleware, config } = nextRepoMdMiddleware('your-project-id');
```

### Next.js (Config)

```javascript
// next.config.js
import { nextRepoMdConfig } from 'repo-md';

export default {
  ...nextRepoMdConfig('your-project-id'),
  // your other Next.js config...
};
```

### Remix

```typescript
// app/routes/$.tsx
import { remixRepoMdLoader } from 'repo-md';

export const loader = remixRepoMdLoader('your-project-id');
```

## 🔧 Configuration Options

### Using Environment Variables

You can also use environment variables for convenience:

```javascript
// With process.env
viteRepoMdProxy(process.env.MY_PROJECT_ID)

// Or let RepoMD read from standard env vars:
viteRepoMdProxy() // Reads from REPO_MD_PROJECT_ID, VITE_REPO_MD_PROJECT_ID, etc.
```

Supported environment variables:
- `REPO_MD_PROJECT_ID` - Universal
- `NEXT_PUBLIC_REPO_MD_PROJECT_ID` - Next.js
- `VITE_REPO_MD_PROJECT_ID` - Vite
- `REACT_APP_REPO_MD_PROJECT_ID` - Create React App

## 💡 Error Messages

If you forget to set the environment variable, RepoMD provides helpful error messages:

```
🚨 RepoMD Project ID Missing!

The REPO_MD_PROJECT_ID environment variable needs to be configured, or passed directly in your Next.js middleware config.

Option 1: Set an environment variable (recommended):
  REPO_MD_PROJECT_ID=your-project-id
  NEXT_PUBLIC_REPO_MD_PROJECT_ID=your-project-id
  VITE_REPO_MD_PROJECT_ID=your-project-id

Option 2: Pass it directly in your Next.js middleware config:
  nextRepoMdMiddleware({ projectId: 'your-project-id' })

Learn more: https://docs.repo.md/configuration
```

## 📚 Advanced Usage

### Custom Configuration

```javascript
import { viteRepoMdProxy } from 'repo-md';

// With options object
const proxy = viteRepoMdProxy({
  projectId: 'your-project-id',
  mediaUrlPrefix: '/_custom/media/', // Default: '/_repo/medias/'
  debug: true                        // Default: false
});
```

### Creating RepoMD Instance

```javascript
import { RepoMD } from 'repo-md';

// Standard approach
const repo = new RepoMD({ projectId: 'your-project-id' });

// With environment variable
const repo = new RepoMD({ projectId: process.env.MY_PROJECT_ID });

// Helper function from integrations
import { createRepoMd } from 'repo-md';
const repo = createRepoMd({ projectId: 'your-project-id' });
```

## 🔧 How It Works

The integration helpers:
1. **Auto-detect** your framework (Vite, Next.js, Remix, Vue, React)
2. **Read project ID** from environment variables
3. **Generate proper config** for your specific framework
4. **Handle all the boilerplate** - URLs, caching, headers, etc.

## 🎯 Benefits

- **Zero boilerplate** - One line integration
- **Framework agnostic** - Same API across all frameworks
- **Environment-based** - Configure once, use everywhere
- **Type-safe** - Full TypeScript support
- **Auto-detection** - Figures out your framework automatically
- **Backward compatible** - Works alongside existing RepoMD code

## 🤝 Compatibility

- **Vite** 3.x, 4.x, 5.x
- **Next.js** 13.x, 14.x, 15.x
- **Remix** 1.x, 2.x
- **Vue CLI** 4.x, 5.x
- **Create React App** 4.x, 5.x

## 🐛 Debugging

Enable debug mode to see what's happening:

```javascript
// Via environment
DEBUG=true

// Or in config
viteRepoMdProxy({ 
  projectId: 'your-id',
  debug: true 
});
```

## 📖 Examples

Check out the [examples folder](../../../examples) for complete integration examples with popular frameworks.