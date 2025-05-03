/**
 * Simple content client for demo purposes
 */

export const createRepo = ({ baseUrl }) => {
  return {
    listSlugs: async () => {
      // For demo purposes, return some mock data
      return ['about', 'contact', 'blog-post-1', 'blog-post-2'];
    },
    
    load: async (slug) => {
      // For demo purposes, return mock data based on slug
      return {
        slug,
        title: `Content for ${slug}`,
        content: `This is the content for ${slug}`,
        created: new Date().toISOString()
      };
    }
  };
};

export default createRepo;