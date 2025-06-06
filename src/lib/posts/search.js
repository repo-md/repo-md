/**
 * Post search functionality with both memory-based and vector-based search
 */

import MiniSearch from "minisearch";
import { cosineSimilarity } from "../vector.js";
import { computeTextEmbedding, computeClipTextEmbedding, computeClipImageEmbedding } from "../inference.js";

export function createPostSearch({ getAllPosts, getPostsEmbeddings, getAllMedia, getMediaEmbeddings, debug = false }) {
  let miniSearchInstance = null;
  let indexedData = null;

  const initializeMemoryIndex = async (posts) => {
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
      console.log(`🔍 Indexed ${documentsToIndex.length} posts for memory search`);
    }

    return miniSearchInstance;
  };

  const searchPosts = async ({ text, image, props = {}, mode = "memory" }) => {
    if (!text && !image) {
      throw new Error(
        "Either text or image parameter is required for search"
      );
    }

    if (text && (typeof text !== "string" || text.trim().length === 0)) {
      throw new Error("Text parameter must be a non-empty string when provided");
    }

    if (image && (typeof image !== "string" || image.trim().length === 0)) {
      throw new Error("Image parameter must be a non-empty string when provided");
    }

    if (!['memory', 'vector', 'vector-text', 'vector-clip-text', 'vector-clip-image'].includes(mode)) {
      throw new Error(
        `Search mode '${mode}' is not supported. Available modes: memory, vector, vector-text, vector-clip-text, vector-clip-image`
      );
    }

    try {
      if (mode === "memory") {
        return await performMemorySearch(text, props);
      }
      return await performVectorSearch({ text, image, mode, props });
    } catch (error) {
      if (debug) {
        console.error("🔍 Search error:", error);
      }
      throw new Error(`Search failed: ${error.message}`);
    }
  };

  const performMemorySearch = async (text, props) => {
    // Get all posts if we haven't indexed them yet or if forced refresh
    if (!miniSearchInstance || !indexedData) {
      const posts = await getAllPosts(true);
      await initializeMemoryIndex(posts);
    }

    if (!miniSearchInstance) {
      if (debug) {
        console.warn("🔍 Memory search index could not be initialized");
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
      console.log(`🔍 Found ${results.length} memory search results for query: "${text}"`);
    }

    // Return enhanced results with original post data
    return results.map((result) => ({
      ...result,
      searchMode: 'memory',
      post: indexedData.find(
        (post) =>
          (post.hash && post.hash === result.id) ||
          (post.slug && post.slug === result.id)
      ),
    }));
  };

  const performVectorSearch = async ({ text, image, mode, props }) => {
    const { limit = 20, threshold = 0.1 } = props;
    let queryEmbedding;
    let searchType;

    try {
      // Compute query embedding based on mode
      if (mode === "vector" || mode === "vector-text") {
        if (!text) {
          throw new Error("Text is required for text-based vector search");
        }
        const embeddingResult = await computeTextEmbedding(text, null, debug);
        queryEmbedding = embeddingResult.embedding;
        searchType = 'text';
        if (debug) {
          console.log(`🔍 Computed text embedding for query: "${text}"`);
        }
      } else if (mode === "vector-clip-text") {
        if (!text) {
          throw new Error("Text is required for CLIP text-based vector search");
        }
        const embeddingResult = await computeClipTextEmbedding(text, debug);
        queryEmbedding = embeddingResult.embedding;
        searchType = 'clip-text';
        if (debug) {
          console.log(`🔍 Computed CLIP text embedding for query: "${text}"`);
        }
      } else if (mode === "vector-clip-image") {
        if (!image) {
          throw new Error("Image is required for CLIP image-based vector search");
        }
        const embeddingResult = await computeClipImageEmbedding(image, debug);
        queryEmbedding = embeddingResult.embedding;
        searchType = 'clip-image';
        if (debug) {
          console.log("🔍 Computed CLIP image embedding for search");
        }
      }

      if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
        throw new Error("Failed to compute valid query embedding");
      }

      // Get appropriate embeddings based on search type
      let embeddingsMap;
      let candidateData;
      
      if (searchType === 'clip-text' || searchType === 'clip-image') {
        // For CLIP searches, we can search both posts and media
        const [postsEmbeddings, mediaEmbeddings, posts, media] = await Promise.all([
          getPostsEmbeddings ? getPostsEmbeddings() : {},
          getMediaEmbeddings ? getMediaEmbeddings() : {},
          getAllPosts ? getAllPosts(true) : [],
          getAllMedia ? getAllMedia() : []
        ]);
        
        embeddingsMap = { ...postsEmbeddings, ...mediaEmbeddings };
        candidateData = [...posts.map(p => ({ ...p, type: 'post' })), ...media.map(m => ({ ...m, type: 'media' }))];
      } else {
        // For text searches, only search posts
        const [postsEmbeddings, posts] = await Promise.all([
          getPostsEmbeddings ? getPostsEmbeddings() : {},
          getAllPosts ? getAllPosts(true) : []
        ]);
        
        embeddingsMap = postsEmbeddings;
        candidateData = posts.map(p => ({ ...p, type: 'post' }));
      }

      if (!embeddingsMap || Object.keys(embeddingsMap).length === 0) {
        if (debug) {
          console.warn("🔍 No embeddings available for vector search");
        }
        return [];
      }

      // Calculate similarities
      const similarities = [];
      
      for (const [hash, embedding] of Object.entries(embeddingsMap)) {
        if (!embedding || !Array.isArray(embedding)) continue;
        
        const similarity = cosineSimilarity(queryEmbedding, embedding);
        
        if (similarity >= threshold) {
          const candidateItem = candidateData.find(item => item.hash === hash);
          if (candidateItem) {
            similarities.push({
              id: hash,
              hash,
              similarity,
              score: similarity,
              searchMode: mode,
              post: candidateItem.type === 'post' ? candidateItem : null,
              media: candidateItem.type === 'media' ? candidateItem : null,
              type: candidateItem.type
            });
          }
        }
      }

      // Sort by similarity (highest first) and limit results
      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      if (debug) {
        console.log(`🔍 Found ${results.length} vector search results using ${mode} (threshold: ${threshold})`);
      }

      return results;
      
    } catch (error) {
      if (debug) {
        console.error(`🔍 Vector search error (${mode}):`, error);
      }
      throw new Error(`Vector search failed: ${error.message}`);
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
        await initializeMemoryIndex(posts);
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

  const refreshMemoryIndex = async () => {
    const posts = await getAllPosts(true, true); // Force refresh
    return await initializeMemoryIndex(posts);
  };

  return {
    searchPosts,
    searchAutocomplete,
    refreshMemoryIndex,
    performMemorySearch,
    performVectorSearch,
  };
}
