/**
 * Post search functionality using MiniSearch for full-text search
 */

import MiniSearch from "minisearch";

export function createPostSearch({ getAllPosts, debug = false }) {
  let miniSearchInstance = null;
  let indexedData = null;

  const initializeIndex = async (posts) => {
    if (!posts || posts.length === 0) {
      if (debug) {
        console.log("🔍 No posts available for search indexing");
      }
      return null;
    }

    const searchableFields = [
      "title",
      "content",
      "excerpt",
      "tags",
      "plain",
      //    "hash",
    ];
    const storableFields = ["slug", "title", "excerpt", "date", "hash", "path"];

    miniSearchInstance = new MiniSearch({
      fields: searchableFields,
      storeFields: storableFields,
      searchOptions: {
        boost: { slug: 3, title: 3, excerpt: 2, plain: 2 }, // Weight title more heavily, plain text highly
        fuzzy: 0.2,
        prefix: true,
      },
    });

    const documentsToIndex = posts.map((post) => ({
      id: post.hash || post.slug,
      title: post.title || "",
      content: post.content || "",
      excerpt: post.excerpt || "",
      tags: Array.isArray(post.tags) ? post.tags.join(" ") : post.tags || "",
      plain: post.plain || "",
      slug: post.slug,
      date: post.date,
      hash: post.hash,
      path: post.path,
    }));

    miniSearchInstance.addAll(documentsToIndex);
    indexedData = posts;

    if (debug) {
      console.log(`🔍 Indexed ${documentsToIndex.length} posts for search`);
    }

    return miniSearchInstance;
  };

  const searchPosts = async ({ text, props = {}, mode = "memory" }) => {
    if (text === undefined || text === null) {
      throw new Error(
        "Search text is required and cannot be undefined or null"
      );
    }

    if (typeof text !== "string") {
      throw new Error(`Search text must be a string, received: ${typeof text}`);
    }

    if (text.trim().length === 0) {
      throw new Error("Search text cannot be empty or contain only whitespace");
    }

    if (mode !== "memory") {
      throw new Error(
        `Search mode '${mode}' is not yet supported. Currently only 'memory' mode is available.`
      );
    }

    try {
      // Get all posts if we haven't indexed them yet or if forced refresh
      if (!miniSearchInstance || !indexedData) {
        const posts = await getAllPosts(true);
        await initializeIndex(posts);
      }

      if (!miniSearchInstance) {
        if (debug) {
          console.warn("🔍 Search index could not be initialized");
        }
        return [];
      }

      // Merge default options with provided props
      const searchOptions = {
        limit: 20,
        fuzzy: 0.2,
        prefix: true,
        boost: { title: 3, excerpt: 2 },
        ...props,
      };

      const results = miniSearchInstance.search(text, searchOptions);

      if (debug) {
        console.log(`🔍 Found ${results.length} results for query: "${text}"`);
      }

      // Return enhanced results with original post data
      return results.map((result) => ({
        ...result,
        post: indexedData.find(
          (post) =>
            (post.hash && post.hash === result.id) ||
            (post.slug && post.slug === result.id)
        ),
      }));
    } catch (error) {
      if (debug) {
        console.error("🔍 Search error:", error);
      }
      throw new Error(`Search failed: ${error.message}`);
    }
  };

  const searchAutocomplete = async (term, limit = 10) => {
    if (!term || typeof term !== 'string') {
      return [];
    }

    if (term.trim().length === 0) {
      return [];
    }

    try {
      // Get all posts if we haven't indexed them yet
      if (!miniSearchInstance || !indexedData) {
        const posts = await getAllPosts(true);
        await initializeIndex(posts);
      }

      if (!miniSearchInstance) {
        return [];
      }

      // Perform a search to get terms
      const searchOptions = {
        limit: Math.min(limit, 20), // Limit results to reduce processing
        fuzzy: 0.1, // Less fuzzy for autocomplete
        prefix: true,
        boost: { slug: 3, title: 3, excerpt: 2, plain: 2 },
      };

      const results = miniSearchInstance.search(term, searchOptions);

      // Extract all unique terms that start with the input term
      const allTerms = new Set();
      
      for (const result of results) {
        if (result.terms && Array.isArray(result.terms)) {
          for (const resultTerm of result.terms) {
            // Only include terms that start with the input term (case insensitive)
            if (resultTerm.toLowerCase().startsWith(term.toLowerCase())) {
              allTerms.add(resultTerm);
            }
          }
        }
      }

      // Convert to array, sort by length (shorter first), and limit results
      const termsList = Array.from(allTerms)
        .sort((a, b) => {
          // Prioritize exact matches and shorter terms
          if (a.toLowerCase() === term.toLowerCase()) return -1;
          if (b.toLowerCase() === term.toLowerCase()) return 1;
          return a.length - b.length;
        })
        .slice(0, limit);

      if (debug) {
        console.log(`🔍 Found ${termsList.length} autocomplete suggestions for "${term}"`);
      }

      return termsList;

    } catch (error) {
      if (debug) {
        console.error('🔍 Autocomplete error:', error);
      }
      return [];
    }
  };

  const refreshIndex = async () => {
    const posts = await getAllPosts(true, true); // Force refresh
    return await initializeIndex(posts);
  };

  return {
    searchPosts,
    searchAutocomplete,
    refreshIndex,
  };
}
