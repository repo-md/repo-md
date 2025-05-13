import React, { useState, useEffect } from 'react';

// Define parameter types for functions
interface FunctionParam {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  defaultValue?: string | number | boolean;
}

// Function metadata
interface FunctionInfo {
  name: string;
  params: FunctionParam[];
}

interface FunctionListProps {
  functions: string[];
  handleExecute: (fnName: string, params?: Record<string, string>) => void;
  disabled: boolean;
}

const FunctionList: React.FC<FunctionListProps> = ({
  functions,
  handleExecute,
  disabled
}) => {
  // State for function parameters
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({});

  // Define function parameter requirements
  const functionParams: Record<string, FunctionParam[]> = {
    getPostBySlug: [
      { name: 'slug', required: true, type: 'string' }
    ],
    getPostByHash: [
      { name: 'hash', required: true, type: 'string' }
    ],
    getPostByPath: [
      { name: 'path', required: true, type: 'string' }
    ],
    getRecentPosts: [
      { name: 'count', required: false, type: 'number', defaultValue: 3 }
    ],
    getSimilarPostsByHash: [
      { name: 'hash', required: true, type: 'string' },
      { name: 'count', required: false, type: 'number', defaultValue: 5 }
    ],
    getSimilarPostsBySlug: [
      { name: 'slug', required: true, type: 'string' },
      { name: 'count', required: false, type: 'number', defaultValue: 5 }
    ],
    getSimilarPostsHashByHash: [
      { name: 'hash', required: true, type: 'string' },
      { name: 'limit', required: false, type: 'number', defaultValue: 10 }
    ],
    getSimilarPostsSlugBySlug: [
      { name: 'slug', required: true, type: 'string' },
      { name: 'limit', required: false, type: 'number', defaultValue: 10 }
    ],
    getFileContent: [
      { name: 'path', required: true, type: 'string' }
    ],
    getPostsSimilarityByHashes: [
      { name: 'hash1', required: true, type: 'string' },
      { name: 'hash2', required: true, type: 'string' }
    ]
  };

  // Load saved parameters from localStorage on mount
  useEffect(() => {
    const storedParams = localStorage.getItem('repomd_demo_params');
    if (storedParams) {
      try {
        const parsedParams = JSON.parse(storedParams);
        setParamValues(parsedParams);
      } catch (e) {
        console.error('Failed to parse stored params:', e);
      }
    }
  }, []);

  // Save parameters to localStorage when they change
  const saveParamToLocalStorage = (fnName: string, paramName: string, value: string) => {
    const updatedParams = {
      ...paramValues,
      [fnName]: {
        ...(paramValues[fnName] || {}),
        [paramName]: value
      }
    };

    setParamValues(updatedParams);
    localStorage.setItem('repomd_demo_params', JSON.stringify(updatedParams));
  };

  // Handle change in parameter input
  const handleParamChange = (fnName: string, paramName: string, value: string) => {
    saveParamToLocalStorage(fnName, paramName, value);
  };

  // Check if a function has parameters
  const hasFunctionParams = (fnName: string): boolean => {
    return !!functionParams[fnName] && functionParams[fnName].length > 0;
  };

  // Handle function selection/execution
  const handleFunctionSelect = (fnName: string) => {
    if (hasFunctionParams(fnName)) {
      setSelectedFunction(fnName);
    } else {
      // Directly execute functions without parameters
      handleExecute(fnName);
    }
  };

  // Handle form submission for parametrized functions
  const handleSubmitParams = (fnName: string) => {
    if (!hasFunctionParams(fnName)) return;

    const params = functionParams[fnName].reduce<Record<string, string>>((acc, param) => {
      const value = paramValues[fnName]?.[param.name] ||
                   (param.defaultValue !== undefined ? String(param.defaultValue) : '');

      if (value) {
        acc[param.name] = value;
      }

      return acc;
    }, {});

    // Check required parameters
    const missingRequired = functionParams[fnName]
      .filter(param => param.required && !params[param.name]);

    if (missingRequired.length > 0) {
      alert(`Missing required parameters: ${missingRequired.map(p => p.name).join(', ')}`);
      return;
    }

    handleExecute(fnName, params);
  };

  // Group functions by their prefix (post, media, etc.)
  const groupedFunctions: Record<string, string[]> = {};

  functions.forEach(fn => {
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
      <h2>All Available Functions</h2>
      <p className="function-description">
        Click on a function to select it. Functions with required parameters will show input fields.
      </p>

      {groupOrder.map(groupName => {
        const functionList = groupedFunctions[groupName];
        if (!functionList || functionList.length === 0) return null;

        return (
          <div key={groupName} className="function-group">
            <div className="function-group-header">{groupName}</div>
            <div className="function-items">
              {functionList.sort().map(fnName => {
                const hasParams = hasFunctionParams(fnName);
                const isSelected = selectedFunction === fnName;

                return (
                  <div key={fnName} className="function-item">
                    <div
                      className={`function-name ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleFunctionSelect(fnName)}
                    >
                      {fnName}
                      {hasParams && (
                        <span className="function-params-indicator">
                          ({functionParams[fnName]
                            .filter(p => p.required)
                            .map(p => p.name)
                            .join(', ')})
                        </span>
                      )}
                    </div>

                    {isSelected && hasParams && (
                      <div className="function-params-form">
                        {functionParams[fnName].map(param => (
                          <div key={param.name} className="param-input">
                            <label htmlFor={`${fnName}-${param.name}`}>
                              {param.name}
                              {param.required && <span className="required-indicator">*</span>}
                            </label>
                            <input
                              id={`${fnName}-${param.name}`}
                              type={param.type === 'number' ? 'number' : 'text'}
                              value={paramValues[fnName]?.[param.name] || ''}
                              onChange={(e) => handleParamChange(fnName, param.name, e.target.value)}
                              placeholder={param.defaultValue !== undefined ? String(param.defaultValue) : ''}
                            />
                          </div>
                        ))}
                        <button
                          className="run-function-button"
                          onClick={() => handleSubmitParams(fnName)}
                          disabled={disabled}
                        >
                          Run
                        </button>
                      </div>
                    )}
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