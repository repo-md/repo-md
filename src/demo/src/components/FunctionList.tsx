import React, { useState } from 'react';

// Import the parameter types from App.tsx

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
interface FunctionParam {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  defaultValue?: string | number | boolean;
}

interface FunctionListProps {
  functions: string[];
  handleExecute: (fnName: string, params?: Record<string, string>) => void;
  disabled?: boolean;
  functionParams?: Record<string, FunctionParam[]>;
}

const FunctionList: React.FC<FunctionListProps> = ({
  functions,
  handleExecute,
  disabled = false,
  functionParams = {}
}) => {
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Handle function selection/execution
  const handleFunctionSelect = (fnName: string) => {
    if (disabled) return;

    // Execute the function immediately
    handleExecute(fnName, {});

    // Set selected function for display purposes
    setSelectedFunction(fnName);
  };

  // Filter functions based on search
  const filteredFunctions = searchFilter
    ? functions.filter(fn => fn.toLowerCase().includes(searchFilter.toLowerCase()))
    : functions;

  // Group functions by their prefix (post, media, etc.)
  const groupedFunctions: Record<string, string[]> = {};

  filteredFunctions.forEach(fn => {
    if (fn.startsWith('_') || fn === 'constructor') return; // Skip internal methods

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
  });

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

  return (
    <div className="function-list">
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
            className="clear-search-button"
            onClick={() => setSearchFilter('')}
          >
            ✕
          </button>
        )}
      </div>

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
                const requiredParams = hasParams ?
                  functionParams[fnName].filter(p => p.required).map(p => p.name) :
                  [];

                return (
                  <div key={fnName} className="function-item">
                    <div
                      className={`function-name ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleFunctionSelect(fnName)}
                    >
                      <span className="function-dot" style={{ backgroundColor: groupColors[groupName] || '#ccc' }}></span>
                      <span className="function-label">{fnName}</span>
                      {requiredParams.length > 0 && (
                        <div className="param-tags">
                          {requiredParams.map(paramName => (
                            <span key={paramName} className="param-tag">
                              {paramName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FunctionList;