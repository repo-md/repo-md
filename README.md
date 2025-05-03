# Repo.md

A lightweight JavaScript client library for fetching and working with content stored in the repo.md API. The library provides easy access to posts, media, and other content stored in your repo.md projects.

## Installation

```bash
npm install repo-md
```

## Basic Usage

Import the RepoMD class and create a client instance:

```javascript
import RepoMD from "repo-md";

// Initialize the client
const repo = new RepoMD({
  orgSlug: "iplanwebsites",
  projectSlug: "port1g",
  projectId: "680e97604a0559a192640d2c",
  debug: true,
});

// Access content
const posts = await repo.getAllPosts();
const media = await repo.getAllMedia();
```

## Required Configuration

When initializing the RepoMD client, you need to provide the following parameters:

| Parameter     | Description            | Required |
| ------------- | ---------------------- | -------- |
| `orgSlug`     | Your organization slug | Yes      |
| `projectSlug` | Your project slug      | Yes      |
| `projectId`   | Your project ID        | Yes      |

## Optional Configuration

You can customize the client behavior with these additional parameters:

| Parameter | Description                                | Default    |
| --------- | ------------------------------------------ | ---------- |
| `rev`     | Specific revision ID to use                | `"latest"` |
| `debug`   | Enable debug logging                       | `false`    |
| `orgId`   | Optional organization ID                   | `null`     |
| `secret`  | Secret key for accessing protected content | `null`     |

## Working with Content

### Posts and Articles

```javascript
// Get all posts
const allPosts = await repo.getAllPosts();

// Get recent posts
const recentPosts = await repo.getRecentPosts(5); // Get 5 most recent posts

// Get a post by ID
const post = await repo.getPostById("post-id");

// Get a post by slug
const postBySlug = await repo.getPostBySlug("post-slug");

// Sort posts by date
const sortedPosts = repo.sortPostsByDate(posts);
```

### Working with Media

```javascript
// Get all media items
const allMedia = await repo.getAllMedia();

// Get formatted media items
const mediaItems = await repo.getMediaItems();

// Get a media URL
const mediaUrl = await repo.getR2MediaUrl("media-hash-filename.jpg");
```

### Project Information

```javascript
// Get project details
const projectDetails = await repo.fetchProjectDetails();

// Get release information
const releaseInfo = await repo.getReleaseInfo();
console.log(`Current release: ${releaseInfo.current}`);
console.log(`All releases:`, releaseInfo.all);

// Get active revision
const activeRev = await repo.getActiveProjectRev();
```

### Storage Access

```javascript
// Get the URL for the SQLite database
const sqliteUrl = await repo.getSqliteURL();

// Get a URL for a specific resource
const resourceUrl = await repo.getR2Url("/path/to/resource.json");

// Fetch JSON data from R2 storage
const jsonData = await repo.fetchR2Json("/custom-data.json");
```

## Using with Web Frameworks

RepoMD provides built-in configurations for common web frameworks to help with media proxying during development.

### Media Path

RepoMD uses the path `/_repo/medias` for media assets. You'll need to configure your development server to proxy these requests correctly.

### Vite Configuration

```javascript
import { defineConfig } from "vite";
import { frameworkSnippets } from "repo-md";

export default defineConfig({
  // Add the media proxy configuration
  server: {
    proxy: frameworkSnippets.ViteDevProxy,
  },
  // other Vite configurations...
});
```

### Vue Configuration

```javascript
// vue.config.js
const { frameworkSnippets } = require("repo-md");

module.exports = {
  ...frameworkSnippets.VueDevServer,
  // other Vue configurations...
};
```

### React Configuration

```javascript
// src/setupProxy.js
const { createProxyMiddleware } = require("http-proxy-middleware");
const { frameworkSnippets } = require("repo-md");

module.exports = function (app) {
  app.use(
    frameworkSnippets.MEDIA_PATH,
    createProxyMiddleware(frameworkSnippets.ReactDevProxy)
  );
};
```

## Advanced Usage

### Using with Cloudflare Workers

RepoMD includes a helper to handle media requests in Cloudflare Worker environments:

```javascript
// In your Cloudflare Worker
import RepoMD from "repo-md";

const repo = new RepoMD({
  orgSlug: "your-org-slug",
  projectSlug: "your-project",
  projectId: "your-project-id",
});

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Let RepoMD handle media requests
  const mediaResponse = await repo.handleCloudflareRequest(request);
  if (mediaResponse) {
    return mediaResponse;
  }

  // Continue with your normal request handling for non-media requests
  // ...
}
```

### Resolving Latest Revision

RepoMD automatically resolves the "latest" revision to the active revision ID when needed:

```javascript
// Initialize with "latest" revision (default)
const repo = new RepoMD({
  orgSlug: "your-org",
  projectSlug: "your-project",
  projectId: "your-project-id",
  rev: "latest", // This is the default
});

// The library will automatically resolve "latest" to the active revision ID
// when making requests that need a specific revision
const posts = await repo.getAllPosts();

// You can access the resolved revision ID
console.log(repo.activeRev); // The actual revision ID that was resolved
```

## Caching

RepoMD uses a quick-lru cache to store API responses for better performance. The cache is configured to store up to 1000 items with a TTL of 1 hour by default.

```javascript
// Get posts without using cache
const freshPosts = await repo.getAllPosts(false);

// Get media without using cache
const freshMedia = await repo.getAllMedia(false);
```

## Complete Example

```javascript
import RepoMD from "repo-md";

async function main() {
  // Initialize the client
  const repo = new RepoMD({
    orgSlug: "iplanwebsites",
    projectSlug: "port1g",
    projectId: "680e97604a0559a192640d2c",
    debug: true,
  });

  try {
    // Get all posts
    const posts = await repo.getAllPosts();
    console.log(`Found ${posts.length} posts`);

    // Get recent posts
    const recentPosts = await repo.getRecentPosts(3);
    console.log(
      "Recent posts:",
      recentPosts.map((p) => p.title)
    );

    // Get media
    const media = await repo.getAllMedia();
    console.log(`Found ${Object.keys(media).length} media items`);

    // Get project details
    const project = await repo.fetchProjectDetails();
    console.log("Project details:", project.name);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
```

## Error Handling

RepoMD includes built-in error handling with graceful fallbacks. By default, failed API calls will return `null` or an empty array/object depending on the expected return type.

For advanced error handling, you can wrap API calls in try/catch blocks:

```javascript
try {
  const posts = await repo.getAllPosts();
  // Process posts...
} catch (error) {
  console.error("Failed to fetch posts:", error);
  // Handle the error appropriately...
}
```

## License

MIT
