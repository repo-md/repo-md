/**
 * Version and build information utility
 * Works in both development and production environments
 */

// Get version info - this will be replaced by Vite during build
const getVersionInfo = () => {
  // In production builds, these will be replaced by actual values
  const version = import.meta.env?.VITE_APP_VERSION || '0.0.17-dev';
  const buildDate = import.meta.env?.VITE_APP_BUILD_DATE || new Date().toISOString();
  
  return {
    version,
    buildDate
  };
};

export { getVersionInfo };