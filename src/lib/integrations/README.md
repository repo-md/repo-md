# RepoMD Framework Integrations

Super simple integrations for RepoMD across all major frameworks. One line integration!

## 🚀 Quick Start

There are two ways to integrate RepoMD with your framework:

1. **Direct Integration** - Pass the project ID directly (simplest)
2. **Instance-based Integration** - Use an existing RepoMD instance (more control)

### Vite/Vue

#### Option 1: Direct Integration (Recommended)
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

#### Option 2: Using RepoMD Instance
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ projectId: 'your-project-id' });

export default defineConfig({
  server: {
    proxy: repo.createViteProxy()
  }
});
```

### Next.js (Middleware)

#### Option 1: Direct Integration (Recommended)
```typescript
// middleware.ts
import { nextRepoMdMiddleware } from 'repo-md';

// The function returns both middleware and config
export const { middleware, config } = nextRepoMdMiddleware('your-project-id');
```

#### Option 2: Using RepoMD Instance
```typescript
// middleware.ts
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ projectId: 'your-project-id' });

// Returns both middleware and config - no manual setup needed!
export const { middleware, config } = repo.createNextMiddleware();
```

### Next.js (Config)

#### Option 1: Direct Integration (Recommended)
```javascript
// next.config.js
import { nextRepoMdConfig } from 'repo-md';

export default {
  ...nextRepoMdConfig('your-project-id'),
  // your other Next.js config...
};
```

#### Option 2: Using RepoMD Instance
```javascript
// next.config.js
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ projectId: 'your-project-id' });

export default {
  ...repo.createNextConfig(),
  // your other Next.js config...
};
```

### Remix

#### Option 1: Direct Integration (Recommended)
```typescript
// app/routes/$.tsx
import { remixRepoMdLoader } from 'repo-md';

export const loader = remixRepoMdLoader('your-project-id');
```

#### Option 2: Using RepoMD Instance
```typescript
// app/routes/$.tsx
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ projectId: 'your-project-id' });
export const loader = repo.createRemixLoader();
```

### Cloudflare Workers

#### Option 1: Direct Integration (Recommended)
```javascript
// worker.js
import { cloudflareRepoMdHandler } from 'repo-md';

const handler = cloudflareRepoMdHandler('your-project-id');

export default {
  async fetch(request, env, ctx) {
    return handler(request);
  }
};
```

#### Option 2: Using RepoMD Instance
```javascript
// worker.js
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ projectId: 'your-project-id' });
const handler = repo.createCloudflareHandler();

export default {
  async fetch(request, env, ctx) {
    return handler(request);
  }
};
```

## 🎯 When to Use Each Approach

### Use Direct Integration When:
- You just need the proxy functionality
- You want the simplest setup
- You don't need to access other RepoMD features
- You're getting started with RepoMD

### Use Instance-based Integration When:
- You need to access other RepoMD features (posts, media, search, etc.)
- You want to share the same instance across your app
- You need custom configuration (debug mode, caching, etc.)
- You're building a more complex integration

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

## 💡 Advanced Examples

### Sharing RepoMD Instance Across Your App

```javascript
// lib/repo.js - Create a shared instance
import { RepoMD } from 'repo-md';

export const repo = new RepoMD({ 
  projectId: 'your-project-id',
  debug: true // Enable debug logging
});
```

```javascript
// vite.config.js - Use the shared instance
import { defineConfig } from 'vite';
import { repo } from './lib/repo.js';

export default defineConfig({
  server: {
    proxy: repo.createViteProxy()
  }
});
```

```javascript
// pages/blog.js - Use the same instance for data fetching
import { repo } from '../lib/repo.js';

export async function getStaticProps() {
  const posts = await repo.getAllPosts();
  return {
    props: { posts }
  };
}
```

### Custom Media URL Prefix

```javascript
// Direct integration with custom prefix
viteRepoMdProxy({
  projectId: 'your-project-id',
  mediaUrlPrefix: '/_custom/media/' // Default: '/_repo/medias/'
})

// Instance-based with custom prefix
const repo = new RepoMD({ projectId: 'your-project-id' });
repo.createViteProxy('_custom') // Legacy API, sets prefix to '/_custom/medias/'
```

## 💡 Error Messages

If you forget to set the project ID, RepoMD provides helpful error messages:

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
- **Cloudflare Workers** (all versions)
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