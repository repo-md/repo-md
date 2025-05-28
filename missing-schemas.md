# Missing Schemas in RepoMD Library

The following public API methods do not have corresponding schemas defined in the `schemas.js` file:

## Similarity Methods
- `getPostsEmbeddings`: Fetches a map of post hash to embedding vectors
  - Parameters: None
  - Location: `/src/lib/posts/similarity.js` (line 56)

- `getPostsSimilarity`: Gets pre-computed similarity data
  - Parameters: None
  - Location: `/src/lib/posts/similarity.js` (line 42)

- `getTopSimilarPostsHashes`: Gets pre-computed similar post hashes
  - Parameters: None
  - Location: `/src/lib/posts/similarity.js` (line 171)

- `getSimilarPostsSlugBySlug`: Gets similar post slugs by slug
  - Parameters:
    - `slug`: string (required) - The slug to find similar posts for
    - `limit`: number (optional, default: 10) - Maximum number of similar slugs to return
  - Location: `/src/lib/posts/similarity.js` (line 319)

## File Methods
- `getGraph`: Gets the dependency graph data
  - Parameters:
    - `useCache`: boolean (optional, default: true) - Whether to use cached data
  - Location: `/src/lib/files/index.js` (line 62)

## URL Methods
- `getR2Url`: Gets R2 URL for a path
  - Parameters:
    - `path`: string (optional, default: "") - Path to append to the URL
  - Location: `/src/lib/RepoMd.js` (line 339)

- `getR2ProjectUrl`: Gets R2 project URL for a path
  - Parameters:
    - `path`: string (optional, default: "") - Path to append to the URL
  - Location: `/src/lib/RepoMd.js` (line 343)

- `getR2SharedFolderUrl`: Gets R2 shared folder URL for a path
  - Parameters:
    - `path`: string (optional, default: "") - Path to append to the URL
  - Location: `/src/lib/RepoMd.js` (line 347)

- `getR2RevUrl`: Gets R2 revision URL for a path
  - Parameters:
    - `path`: string (optional, default: "") - Path to append to the URL
  - Location: `/src/lib/RepoMd.js` (line 351)

- `createViteProxy`: Creates a Vite proxy configuration
  - Parameters:
    - `folder`: string (optional, default: "_repo") - The folder to use for the proxy
  - Location: `/src/lib/RepoMd.js` (line 355)

- `getSqliteUrl`: Gets URL for SQLite database
  - Parameters: None
  - Location: `/src/lib/RepoMd.js` (line 373)

## API Methods
- `fetchPublicApi`: Fetches data from the public API
  - Parameters:
    - `path`: string (optional, default: "/") - API path
  - Location: `/src/lib/RepoMd.js` (line 360)

- `fetchProjectDetails`: Fetches project details
  - Parameters: None
  - Location: `/src/lib/RepoMd.js` (line 364)

- `getActiveProjectRev`: Gets active project revision
  - Parameters:
    - `forceRefresh`: boolean (optional, default: false) - Whether to force refresh
    - `skipDetails`: boolean (optional, default: false) - Whether to skip fetching project details as fallback
  - Location: `/src/lib/core/api.js` (line 173)

## Media Methods
- `getMediaItems`: Gets all media items
  - Parameters:
    - `useCache`: boolean (optional, default: true) - Whether to use cached data
  - Location: `/src/lib/RepoMd.js` (line 404)

- `handleCloudflareRequest`: Handles Cloudflare request for media
  - Parameters:
    - `request`: object (required) - The Cloudflare request object
  - Location: `/src/lib/RepoMd.js` (line 408)

## Utility Methods
- `getClientStats`: Gets client statistics
  - Parameters: None
  - Location: `/src/lib/RepoMd.js` (line 378)

- `sortPostsByDate`: Sorts posts by date
  - Parameters:
    - `posts`: array (required) - The posts to sort
  - Location: `/src/lib/RepoMd.js` (line 433)