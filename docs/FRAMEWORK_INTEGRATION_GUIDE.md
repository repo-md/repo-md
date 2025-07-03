# RepoMD Framework Integration Guide

This guide provides a comprehensive overview of integrating RepoMD with popular web frameworks.

## Integration Approaches

RepoMD offers two main approaches for framework integration:

### 1. Direct Integration (Recommended for Most Use Cases)

Use the framework-specific helper functions that accept a project ID directly. This is the simplest and most straightforward approach.

**Pros:**
- One-line setup
- No need to manage RepoMD instances
- Automatic configuration
- Perfect for proxy-only needs

**Cons:**
- Limited to proxy functionality
- Can't access other RepoMD features
- Less control over configuration

### 2. Instance-based Integration (Advanced Use Cases)

Create a RepoMD instance and use its methods. This gives you full control and access to all RepoMD features.

**Pros:**
- Full access to RepoMD API (posts, media, search, etc.)
- Share instance across your application
- Fine-grained configuration control
- Better for complex applications

**Cons:**
- Requires instance management
- More setup code
- Need to understand RepoMD API

## Framework-Specific Examples

### Vite/Vue

#### Direct Integration
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { viteRepoMdProxy } from 'repo-md';

export default defineConfig({
  server: {
    proxy: viteRepoMdProxy('your-project-id')
  }
});
```

#### Instance-based Integration
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ 
  projectId: 'your-project-id',
  debug: true // Enable debug logging
});

export default defineConfig({
  server: {
    proxy: repo.createViteProxy()
  }
});

// Now you can also use repo for data fetching
// const posts = await repo.getAllPosts();
```

### Next.js Middleware

#### Direct Integration
```typescript
// middleware.ts
import { nextRepoMdMiddleware } from 'repo-md';

// Returns both middleware and config
export const { middleware, config } = nextRepoMdMiddleware('your-project-id');
```

#### Instance-based Integration
```typescript
// middleware.ts
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ 
  projectId: 'your-project-id',
  debug: process.env.NODE_ENV === 'development'
});

// Returns both middleware and config automatically
export const { middleware, config } = repo.createNextMiddleware();
```

### Next.js Config (Rewrites)

#### Direct Integration
```javascript
// next.config.js
import { nextRepoMdConfig } from 'repo-md';

export default {
  ...nextRepoMdConfig('your-project-id'),
  // your other config...
};
```

#### Instance-based Integration
```javascript
// next.config.js
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ projectId: 'your-project-id' });

export default {
  ...repo.createNextConfig(),
  // your other config...
};
```

### Remix

#### Direct Integration
```typescript
// app/routes/$.tsx
import { remixRepoMdLoader } from 'repo-md';

export const loader = remixRepoMdLoader('your-project-id');
```

#### Instance-based Integration
```typescript
// app/routes/$.tsx
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ projectId: 'your-project-id' });
export const loader = repo.createRemixLoader();
```

### Cloudflare Workers

#### Direct Integration
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

#### Instance-based Integration
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

// With custom 404 handling
const customHandler = repo.createCloudflareHandler({ returnNull: true });

export default {
  async fetch(request, env, ctx) {
    const response = await customHandler(request);
    if (response) return response;
    
    // Handle non-media requests
    return new Response('Custom 404', { status: 404 });
  }
};
```

## API Consistency

All RepoMD instance methods follow a consistent pattern - they return everything you need, no manual configuration required:

```javascript
// Vite - returns complete proxy config
const proxyConfig = repo.createViteProxy();

// Next.js Middleware - returns both middleware and config
const { middleware, config } = repo.createNextMiddleware();

// Next.js Config - returns complete rewrites config
const nextConfig = repo.createNextConfig();

// Remix - returns complete loader function
const loader = repo.createRemixLoader();

// Cloudflare Workers - returns complete request handler
const handler = repo.createCloudflareHandler();
```

This design ensures:
- ✅ No manual path configuration
- ✅ No hardcoding URLs or patterns
- ✅ Consistent experience across frameworks
- ✅ Everything "just works"

## Advanced Patterns

### Shared Instance Pattern

Create a single RepoMD instance to use across your application:

```javascript
// lib/repo.js
import { RepoMD } from 'repo-md';

// Create and export a singleton instance
export const repo = new RepoMD({ 
  projectId: process.env.REPO_MD_PROJECT_ID || 'your-project-id',
  debug: process.env.NODE_ENV === 'development',
  rev: 'latest', // or specific revision
  revCacheExpirySeconds: 300 // 5 minutes
});
```

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { repo } from './lib/repo.js';

export default defineConfig({
  server: {
    proxy: repo.createViteProxy()
  }
});
```

```javascript
// pages/blog.js
import { repo } from '../lib/repo.js';

export async function getStaticProps() {
  const posts = await repo.getAllPosts();
  const recentPosts = await repo.getRecentPosts(5);
  
  return {
    props: { 
      posts,
      recentPosts
    },
    revalidate: 3600 // Revalidate every hour
  };
}
```

### Configuration Options

All integration methods support these options:

```javascript
// Direct integration with options
viteRepoMdProxy({
  projectId: 'your-project-id',     // Required (unless using env vars)
  mediaUrlPrefix: '/_custom/media/', // Default: '/_repo/medias/'
  r2Url: 'https://custom-cdn.com',  // Default: 'https://static.repo.md'
  debug: true                        // Default: false
});

// Instance with full configuration
const repo = new RepoMD({
  projectId: 'your-project-id',
  projectSlug: 'my-project',         // Optional
  rev: 'latest',                     // Default: 'latest'
  secret: 'api-secret',              // Optional API secret
  debug: true,                       // Enable debug logging
  strategy: 'auto',                  // 'auto' | 'browser' | 'server'
  revCacheExpirySeconds: 300         // Cache revision for 5 minutes
});
```

### Environment Variables

All integrations automatically check for these environment variables:

- `REPO_MD_PROJECT_ID` - Universal
- `NEXT_PUBLIC_REPO_MD_PROJECT_ID` - Next.js public
- `VITE_REPO_MD_PROJECT_ID` - Vite
- `REACT_APP_REPO_MD_PROJECT_ID` - Create React App

```javascript
// No project ID needed if env var is set
viteRepoMdProxy() 

// Or use with process.env
viteRepoMdProxy(process.env.MY_CUSTOM_PROJECT_ID)
```

## Choosing the Right Approach

### Use Direct Integration When:
- ✅ You only need media proxying
- ✅ You want the simplest setup
- ✅ You're prototyping or getting started
- ✅ Your project ID is in environment variables
- ✅ You don't need other RepoMD features

### Use Instance-based Integration When:
- ✅ You need to fetch posts, media, or use search
- ✅ You want to share configuration across files
- ✅ You need custom caching or debug settings
- ✅ You're building a content-heavy application
- ✅ You need fine-grained control over the API

## Migration Guide

### From Legacy to Direct Integration

```javascript
// Old way (legacy)
import { createViteProxy } from 'repo-md/frameworkSnippets';
const proxy = createViteProxy('project-id', '_repo');

// New way (direct)
import { viteRepoMdProxy } from 'repo-md';
const proxy = viteRepoMdProxy('project-id');
```

### From Direct to Instance-based

```javascript
// Before (direct)
import { viteRepoMdProxy } from 'repo-md';
export default {
  server: {
    proxy: viteRepoMdProxy('project-id')
  }
};

// After (instance-based)
import { RepoMD } from 'repo-md';
const repo = new RepoMD({ projectId: 'project-id' });

export default {
  server: {
    proxy: repo.createViteProxy()
  }
};

// Now you can also do:
const posts = await repo.getAllPosts();
const media = await repo.getAllMedia();
```

## Troubleshooting

### Common Issues

1. **Missing Project ID Error**
   ```
   🚨 RepoMD Project ID Missing!
   ```
   Solution: Either pass the project ID directly or set an environment variable.

2. **404 Errors for Media**
   - Check that your media URL prefix matches your routes
   - Verify the project ID is correct
   - Enable debug mode to see request details

3. **TypeScript Errors**
   ```typescript
   // Ensure you have proper types
   import type { RepoMD } from 'repo-md';
   ```

### Debug Mode

Enable debug logging to troubleshoot issues:

```javascript
// Direct integration
viteRepoMdProxy({ projectId: 'id', debug: true });

// Instance-based
const repo = new RepoMD({ projectId: 'id', debug: true });
```

## Best Practices

1. **Use Environment Variables**: Store your project ID in environment variables for security and flexibility.

2. **Cache the Instance**: If using instance-based integration, create it once and reuse it.

3. **Error Handling**: Always handle errors when fetching data:
   ```javascript
   try {
     const posts = await repo.getAllPosts();
   } catch (error) {
     console.error('Failed to fetch posts:', error);
     // Handle error appropriately
   }
   ```

4. **Optimize Media Loading**: Use appropriate cache headers (handled automatically by the proxy).

5. **Monitor Performance**: Enable debug mode in development to monitor API calls and caching.

## Further Resources

- [RepoMD Documentation](https://repo.md/docs)
- [API Reference](https://repo.md/docs/api)
- [Example Projects](https://github.com/repo-md/examples)