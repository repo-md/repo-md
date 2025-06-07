import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getMethodMeta, getMethodsByMode } from '../../../lib/schemas/schemas.js';

// Function group color mapping
const groupColors: Record<string, string> = {
  Posts: '#4c86f9',
  Media: '#f97316',
  Files: '#65a30d',
  Project: '#8b5cf6',
  URLs: '#0891b2',
  Similarity: '#ec4899',
  Fetch: '#f59e0b',
  OpenAI: '#06b6d4',
  Other: '#ccc'
};

// Meta badges with emojis and descriptions
const metaBadges: Record<string, { emoji: string; description: string }> = {
  popular: { emoji: '⭐', description: 'Commonly used method' },
  inference: { emoji: '🤖', description: 'AI/ML-powered method' },
  internal: { emoji: '🔧', description: 'Internal/system method' },
  framework: { emoji: '🏗️', description: 'Framework integration method' },
  memoryHeavy: { emoji: '💾', description: 'Memory-intensive operation' },
  deprecated: { emoji: '⚠️', description: 'Deprecated method' },
  cacheable: { emoji: '💽', description: 'Cacheable operation' },
  readonly: { emoji: '👁️', description: 'Read-only operation' }
};

// Filter mode options
const filterModes = [
  { value: 'all', label: 'All Methods' },
  { value: 'publicChatMethods', label: 'Public Chat Methods' },
  { value: 'popular', label: 'Popular Methods' },
  { value: 'inference', label: 'AI/ML Methods' },
  { value: 'framework', label: 'Framework Methods' },
  { value: 'public', label: 'Public Methods' },
  { value: 'lightweight', label: 'Lightweight Methods' },
  { value: 'cacheable', label: 'Cacheable Methods' },
  { value: 'readonly', label: 'Read-only Methods' }
];

interface FunctionParam {
  name: string;
  required: boolean;
  type: string;
  default?: unknown;
  description?: string;
}

interface MethodDescription {
  name: string;
  description: string;
  parameters: FunctionParam[];
  category: string;
}

interface FunctionListProps {
  functions: string[];
  handleExecute: (fnName: string, params?: Record<string, string>) => void;
  disabled?: boolean;
  functionParams?: Record<string, FunctionParam[]>;
  methodDescriptions?: Record<string, MethodDescription>;
}

const FunctionList: React.FC<FunctionListProps> = ({
  functions,
  handleExecute,
  disabled = false,
  functionParams = {},
  methodDescriptions = {}
}) => {
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const hasInitialized = useRef(false);

  // Get filtered methods based on selected mode
  const getFilteredMethods = useCallback((mode: string = filterMode) => {
    if (mode === 'all') {
      return functions;
    }
    
    const filteredMethods = getMethodsByMode(mode);
    const filteredMethodNames = Object.keys(filteredMethods);
    
    // Return intersection of available functions and filtered methods
    return functions.filter(fn => filteredMethodNames.includes(fn));
  }, [functions, filterMode]);

  // Get method counts for each filter mode
  const getFilterModeCounts = useCallback(() => {
    const counts: Record<string, number> = {};
    filterModes.forEach(mode => {
      const filtered = getFilteredMethods(mode.value);
      counts[mode.value] = filtered.length;
    });
    return counts;
  }, [getFilteredMethods]);

  // Handle function selection/execution
  const handleFunctionSelect = useCallback((fnName: string) => {
    if (disabled) return;
    
    // Prevent re-executing the same function
    if (selectedFunction === fnName) return;

    // Execute the function immediately
    handleExecute(fnName, {});

    // Set selected function for display purposes
    setSelectedFunction(fnName);
  }, [disabled, handleExecute, selectedFunction]);

  // Check URL for initial method selection - only run once on mount
  useEffect(() => {
    if (hasInitialized.current || functions.length === 0) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const method = urlParams.get('method');
    if (method && functions.includes(method)) {
      // Use setTimeout to avoid potential React batching issues
      setTimeout(() => {
        handleFunctionSelect(method);
        hasInitialized.current = true;
      }, 0);
    }
  }, [functions, handleFunctionSelect]);

  // Get methods after applying filter mode
  const modeFilteredFunctions = getFilteredMethods();
  
  // Get counts for dropdown display
  const filterModeCounts = getFilterModeCounts();

  // Filter functions based on search
  const filteredFunctions = searchFilter
    ? modeFilteredFunctions.filter(fn => fn.toLowerCase().includes(searchFilter.toLowerCase()))
    : modeFilteredFunctions;

  // Group functions by their prefix (post, media, etc.)
  const groupedFunctions: Record<string, string[]> = {};

  for (const fn of filteredFunctions) {
    if (fn.startsWith('_') || fn === 'constructor') continue; // Skip internal methods

    // Determine group based on method name or pattern
    let group = 'Other';
    if (fn.toLowerCase().includes('post')) group = 'Posts';
    else if (fn.toLowerCase().includes('media')) group = 'Media';
    else if (fn.toLowerCase().includes('file')) group = 'Files';
    else if (fn.toLowerCase().includes('project')) group = 'Project';
    else if (fn.toLowerCase().includes('url')) group = 'URLs';
    else if (fn.toLowerCase().includes('similarity')) group = 'Similarity';
    else if (fn.toLowerCase().includes('openai')) group = 'OpenAI';
    else if (fn.toLowerCase().includes('fetch')) group = 'Fetch';

    // Initialize group array if it doesn't exist
    if (!groupedFunctions[group]) {
      groupedFunctions[group] = [];
    }

    groupedFunctions[group].push(fn);
  }

  // Specific group order
  const groupOrder = [
    'Posts',
    'Media',
    'Files',
    'Project',
    'URLs',
    'Similarity',
    'Fetch',
    'OpenAI',
    'Other'
  ];

  // Count total filtered methods
  const totalFilteredMethods = filteredFunctions.length;

  return (
    <div className="function-list">
      <div className="function-filters">
        <div className="function-filter-select">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="filter-mode-select"
          >
            {filterModes.map(mode => (
              <option key={mode.value} value={mode.value}>
                {mode.label} ({filterModeCounts[mode.value] || 0})
              </option>
            ))}
          </select>
        </div>
        
        <div className="function-filter">
          <input
            type="text"
            placeholder="Search methods..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="function-search-input"
          />
          {searchFilter && (
            <button
              type="button"
              className="clear-search-button"
              onClick={() => setSearchFilter('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {totalFilteredMethods > 0 && (
        <div className="function-count">
          Showing {totalFilteredMethods} of {functions.length} methods
        </div>
      )}

      {groupOrder.map(groupName => {
        const functionList = groupedFunctions[groupName];
        if (!functionList || functionList.length === 0) return null;

        return (
          <div key={groupName} className="function-group">
            <h3 className="function-group-header">{groupName}</h3>
            <div className="function-items">
              {functionList.sort().map(fnName => {
                const isSelected = selectedFunction === fnName;
                const hasParams = functionParams[fnName] && functionParams[fnName].length > 0;
                const allParams = hasParams ? functionParams[fnName] : [];
                const requiredParams = allParams.filter(p => p.required);
                const optionalParams = allParams.filter(p => !p.required);
                const methodDesc = methodDescriptions[fnName];

                // Format tooltip to show description and parameters
                const descriptionText = methodDesc?.description || '';
                const paramTooltip = [
                  descriptionText ? `${descriptionText}` : '',
                  hasParams ? [
                    requiredParams.length > 0 ? `Required:\n${requiredParams.map(p => `• ${p.name}: ${p.type}`).join('\n')}` : '',
                    optionalParams.length > 0 ? `Optional:\n${optionalParams.map(p => `• ${p.name}: ${p.type}${p.default !== undefined ? ` (default: ${p.default})` : ''}`).join('\n')}` : ''
                  ].filter(Boolean).join('\n\n') : ''
                ].filter(Boolean).join('\n\n');

                const methodMeta = getMethodMeta(fnName);
                const activeMetas = Object.entries(methodMeta || {}).filter(([_, value]) => value === true);

                return (
                  <div key={fnName} className="function-item">
                    <button
                      type="button"
                      className={`function-name ${isSelected ? 'selected' : ''} ${requiredParams.length > 0 ? 'has-required-params' : ''}`}
                      onClick={() => handleFunctionSelect(fnName)}
                      title={paramTooltip}
                    >
                      <div className="function-content">
                        <div className="function-header">
                          <span className="function-dot" style={{ backgroundColor: groupColors[groupName] || '#ccc' }} />
                          <span className="function-label">{fnName}</span>
                          {activeMetas.length > 0 && (
                            <div className="function-meta-badges">
                              {activeMetas.map(([metaKey]) => {
                                const badge = metaBadges[metaKey];
                                if (!badge) return null;
                                return (
                                  <span
                                    key={metaKey}
                                    className="meta-badge"
                                    title={badge.description}
                                  >
                                    {badge.emoji}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {methodDesc?.description && (
                          <div className="function-description">{methodDesc.description}</div>
                        )}
                        <div className="function-params">
                          {requiredParams.length > 0 && (
                            <div className="param-tags">
                              {requiredParams.map(param => (
                                <span key={param.name} className="param-tag required-param" title={`${param.name}: ${param.type}`}>
                                  {param.name}*
                                </span>
                              ))}
                            </div>
                          )}
                          {optionalParams.length > 0 && requiredParams.length === 0 && (
                            <div className="param-tags">
                              <span className="param-tag optional-param">
                                {optionalParams.length} optional
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {totalFilteredMethods === 0 && (
        <div className="no-functions-message">
          No methods found matching the current filters.
        </div>
      )}
    </div>
  );
};

export default FunctionList;