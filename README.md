<a href="https://repo.md"> 
<img src="./src/logo.svg" style="height:200px;" />
</a>

<!--
![npm bundle size](https://img.shields.io/bundlephobia/min/repo-md)
 -->

![npm](https://img.shields.io/npm/v/repo-md)
![npm bundle size ](https://img.shields.io/bundlephobia/minzip/repo-md?label=bundle%20size%20%28main%29)
[![Documentation](https://img.shields.io/badge/docs-repo.md-blue)](https://repo.md/docs)
![JavaScript](https://img.shields.io/badge/JavaScript-%23F7DF1E.svg?style=flat&logo=javascript&logoColor=black)
![Markdown](https://img.shields.io/badge/Markdown-%23000000.svg?style=flat&logo=markdown&logoColor=white)

# Repo.md 💙 JS

A lightweight JavaScript client library for fetching and working with content stored in the [repo.md](https://repo.md) API. The library provides easy access to posts, media, and other content stored in your [repo.md](https://repo.md) projects.

> **Note:** This is an early preview release of our JavaScript SDK. API routes and method names might change as we extend functionalities. We look forward to seeing developers play with it!

## Playground

Test the API in the repo.md API playground: https://playground.repo.md/

## Installation

### NPM

```bash
npm i repo-md
```

---

Use in your favourite frameworks

![React](https://img.shields.io/badge/React-%2320232A.svg?style=flat&logo=react&logoColor=%2361DAFB)
![Vue.js](https://img.shields.io/badge/Vue.js-%2335495E.svg?style=flat&logo=vuedotjs&logoColor=%234FC08D)
![Remix](https://img.shields.io/badge/Remix-%23000.svg?style=flat&logo=remix&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-%232C2052.svg?style=flat&logo=astro&logoColor=white)
![WordPress](https://img.shields.io/badge/WordPress-%23117AC9.svg?style=flat&logo=WordPress&logoColor=white)

---

Deploy apps on the edge:

![Cloudflare](https://img.shields.io/badge/Cloudflare-%23F38020.svg?style=flat&logo=Cloudflare&logoColor=white)
![Fly.io](https://img.shields.io/badge/Fly.io-%238b5cf6.svg?style=flat&logo=fly&logoColor=white)

### CDN (Browser)

You can also include repo-md directly in your HTML via CDN:

```html
<!-- From unpkg (recommended) -->
<script src="https://unpkg.com/repo-md"></script>

<!-- Or from jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/repo-md"></script>

<!-- Minified versions for production -->
<script src="https://unpkg.com/repo-md/repo-md.min.umd.cjs"></script>
<script src="https://cdn.jsdelivr.net/npm/repo-md/repo-md.min.umd.cjs"></script>
```

When loaded via CDN, the library is available as a global variable `RepoMD`:

```html
<script>
  const repo = new RepoMD.RepoMD({
    orgSlug: "iplanwebsites",
    projectSlug: "port1g",
    projectId: "680e97604a0559a192640d2c",
  });

  // Use repo client methods
  repo.getAllPosts().then((posts) => {
    console.log(posts);
  });
</script>
```

### UMD Module in Node.js

If you need to use the UMD module in a Node.js project that doesn't support ES modules:

```javascript
// Using require with the UMD build
const RepoMD = require("repo-md/min").RepoMD;

// Initialize the client
const repo = new RepoMD({
  orgSlug: "iplanwebsites",
  projectSlug: "port1g",
  projectId: "680e97604a0559a192640d2c",
});

// Use client methods
repo.getAllPosts().then((posts) => {
  console.log(posts);
});
```

# Docs

All details on endpoints can be found here:

https://repo.md/docs

# Contributing

We welcome contributions to improve the [repo.md](https://repo.md) client library! If you'd like to contribute, please feel free to submit a pull request. Whether it's fixing bugs, improving documentation, or adding new features, your help is appreciated.

### Developing the Demo

The repo includes a demo application built with React that showcases the library's capabilities.

To run the demo locally:

```bash
npm run dev:demo
```

This will start the demo on http://localhost:5174.

## Roadmap

Here are some planned improvements for future releases:

- Implement more API endpoints
- Better validation and logging with configurable debug levels
- Improved TypeScript types
- Enhanced playground demo
- Python SDK
- Command line tools
- And more...

We're constantly working to improve the library based on developer feedback.

## License

MIT
