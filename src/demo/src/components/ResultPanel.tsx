import React, { useState, useEffect, useCallback } from 'react'
import { ApiResult } from '../types'
import JSONPretty from 'react-json-pretty'
import 'react-json-pretty/themes/monikai.css'
import { Code, Play } from 'lucide-react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { monokai } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { ParameterInput, FunctionParam } from './params'
import { getMethodMeta } from '../../../lib/schemas/schemas.js'

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

interface MethodDescription {
  name: string;
  description: string;
  parameters: FunctionParam[];
  category: string;
}

interface ResultPanelProps {
  result: ApiResult | null
  loading: boolean
  handleRun?: (params?: Record<string, string>) => void
  functionParams?: Record<string, FunctionParam[]>
  methodDescriptions?: Record<string, MethodDescription>
  projectId?: string
  strategy?: 'auto' | 'server' | 'browser'
  revision?: string
}

const ResultPanel: React.FC<ResultPanelProps> = ({
  result,
  loading,
  handleRun,
  functionParams = {},
  methodDescriptions = {},
  projectId = '',
  strategy = 'auto',
  revision = ''
}) => {
  // State for parameter values
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  // State for showing code sample
  const [showCodeSample, setShowCodeSample] = useState(false);

  // Reset param values when result changes
  useEffect(() => {
    // Start with empty object or existing params
    const initialParams: Record<string, string> = result?.params ? { ...result.params } : {};
    
    // Initialize all required parameters with empty strings if they're not already set
    if (result?.operation) {
      const params = functionParams[result.operation] || [];
      
      // Set initial empty values for all required parameters only (let optional use defaults)
      const requiredParams = params.filter(p => p.required);
      requiredParams.forEach(param => {
        if (initialParams[param.name] === undefined) {
          initialParams[param.name] = '';
        }
      });
      
      // For optional boolean parameters, set them to empty string to trigger "default" in the UI
      const optionalParams = params.filter(p => !p.required);
      optionalParams.forEach(param => {
        if (param.type === 'boolean' && initialParams[param.name] === undefined) {
          // Use empty string to represent "use default"
          initialParams[param.name] = '';
        }
      });
      
      console.log(`[ResultPanel] Initializing params for ${result.operation}:`, initialParams);
    }
    
    setParamValues(initialParams);
  }, [result?.operation, functionParams]);

  // Handle parameter change
  const handleParamChange = (paramName: string, value: string) => {
    setParamValues(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  // Run function with current parameters
  const runWithParams = useCallback(() => {
    if (handleRun && result?.operation) {
      handleRun(paramValues);
    }
  }, [handleRun, paramValues, result?.operation]);

  // Format execution time to be more readable
  const formatExecutionTime = (time?: number) => {
    if (!time) return '';

    if (time < 1) {
      return '< 1ms';
    } else if (time < 1000) {
      return `${Math.round(time)}ms`;
    } else {
      return `${(time / 1000).toFixed(2)}s`;
    }
  };

  // Get function parameters for the current operation, sorted by required status
  const getCurrentFunctionParams = () => {
    if (!result?.operation) return [];
    const params = functionParams[result.operation] || [];
    
    // Sort params: required params first, then optional params
    return [...params].sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.name.localeCompare(b.name); // Sort alphabetically within each group
    });
  };

  // Check if current function has parameters
  let hasParams = result?.operation ?
    (functionParams[result.operation] && functionParams[result.operation].length > 0) :
    false;
    
  // SPECIAL CASE FIX: Force hasParams to be true for specific methods that require parameters
  // This ensures the parameter UI is always shown for these methods
  if (result?.operation && ['getPostByPath', 'getPostBySlug', 'getPostByHash', 'getFileContent'].includes(result.operation)) {
    if (!hasParams) {
      console.warn(`Forcing hasParams=true for ${result.operation} which should always show parameters`);
      hasParams = true;
    }
  }
    
  // Check if current function has required parameters
  // Log to debug required parameter detection
  const hasRequiredParams = result?.operation ?
    (functionParams[result.operation] && functionParams[result.operation].some(p => p.required)) :
    false;
    
  // Debug check for parameters
  if (result?.operation) {
    const params = functionParams[result.operation] || [];
    const requiredParams = params.filter(p => p.required).map(p => p.name);
    const optionalParams = params.filter(p => !p.required).map(p => p.name);
    console.log(`[ResultPanel] Operation ${result.operation} params:`, {
      params,
      requiredParams,
      optionalParams,
      hasParams,
      paramValues
    });
    
    // EXTRA DEBUG: Check if we're missing any required parameters in the component state
    const missingRequiredParams = requiredParams.filter(name => !paramValues[name]);
    if (missingRequiredParams.length > 0) {
      console.warn(`[ResultPanel] Missing required params for ${result.operation}:`, missingRequiredParams);
    }
    
    // Special debug for getPostByPath which seems to have issues
    if (result.operation === 'getPostByPath') {
      console.log('SPECIAL DEBUG FOR getPostByPath:');
      console.log('- functionParams entry:', functionParams['getPostByPath']);
      console.log('- hasParams value:', hasParams);
      console.log('- Current param values:', paramValues);
      console.log('- Query bar visible:', !loading && result && hasParams);
      
      // Force additional check on the functionParams
      const pathParam = functionParams['getPostByPath']?.find(p => p.name === 'path');
      console.log('- Direct check on path param:', pathParam);
    }
  }

  // Generate code sample for the current operation
  const generateCodeSample = () => {
    if (!result?.operation) return '';

    const operation = result.operation;
    // Use current paramValues state instead of result.params to make it responsive to input changes
    const params = paramValues;
    const currentFunctionParams = functionParams[operation] || [];

    // Use the actual values from the playground
    const actualProjectId = projectId || '680e97604a0559a192640d2c';

    // Create configuration string with conditional options
    let configOptions = `  projectId: '${actualProjectId}'`;

    // Add strategy if not auto
    if (strategy !== 'auto') {
      configOptions += `,\n  strategy: '${strategy}'`;
    }

    // Add revision if specified
    if (revision && revision !== 'latest') {
      configOptions += `,\n  rev: '${revision}'`;
    }

    configOptions += `,\n  debug: true`;

    // Generate function call with parameters
    let functionCall = '';
    if (currentFunctionParams.length === 0) {
      // No parameters
      functionCall = `const data = await repo.${operation}();`;
    } else if (currentFunctionParams.length === 1) {
      // Single parameter
      const param = currentFunctionParams[0];
      const paramValue = params[param.name] || (param.default !== undefined ? String(param.default) : "''");
      const formattedValue = param.type === 'string' ? `'${paramValue}'` : paramValue;
      functionCall = `const data = await repo.${operation}(${formattedValue});`;
    } else {
      // Multiple parameters
      let paramList = currentFunctionParams
        .map(param => {
          const paramValue = params[param.name] || (param.default !== undefined ? String(param.default) : "''");
          const formattedValue = param.type === 'string' ? `'${paramValue}'` : paramValue;
          return formattedValue;
        })
        .join(', ');
      functionCall = `const data = await repo.${operation}(${paramList});`;
    }

    // Use backtick multiline string for the entire code sample
    return `// Import the RepoMD library
import { RepoMD } from "repo-md";  //  npm i repo-md

// Initialize the RepoMD instance
const repo = new RepoMD({
${configOptions}
});

// Later in your code
async function fetchData() {
  try {
    ${functionCall}
    console.log(data);
  } catch (error) {
    console.error("Error:", error);
  }
}

fetchData();`;
  };

  return (
    <div className="result-panel">
      <div className="result-navbar">
        <div className="result-nav-left">
          {loading ? (
            <div className="loading-indicator">Loading...</div>
          ) : (
            result && (
              <div className="method-info">
                <div className="method-name">
                  {result.operation}
                  {(() => {
                    const methodMeta = getMethodMeta(result.operation);
                    const activeMetas = Object.entries(methodMeta || {}).filter(([_, value]) => value === true);
                    
                    if (activeMetas.length > 0) {
                      return (
                        <div className="method-meta-badges">
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
                      );
                    }
                    return null;
                  })()}
                </div>
                {methodDescriptions[result.operation]?.description && (
                  <div className="method-description">
                    {methodDescriptions[result.operation].description}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <div className="result-nav-right">
          {result && !hasParams && (
            <button
              className="nav-button run-button"
              title="Run Again"
              onClick={() => handleRun && handleRun({})}
              disabled={loading}
            >
              <Play size={18} />
              <span>Run</span>
            </button>
          )}

          <button
            className={`nav-button code-sample-button ${showCodeSample ? 'active' : ''}`}
            title={showCodeSample ? "Hide Code Sample" : "View Code Sample"}
            onClick={() => setShowCodeSample(!showCodeSample)}
            disabled={!result}
          >
            <Code size={18} />
          </button>
        </div>
      </div>

      {!loading && result && hasParams && (
        <div className="query-bar">
          <div className="query-params">
            {/* Debug info for params */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ fontSize: '10px', color: '#999', margin: '-5px 0 5px', width: '100%' }}>
                <div><strong>Operation:</strong> {result.operation}</div>
                <div><strong>Parameter count:</strong> {getCurrentFunctionParams().length}</div>
                <div><strong>Required params:</strong> {getCurrentFunctionParams().filter(p => p.required).map(p => p.name).join(', ')}</div>
                <div><strong>Optional params:</strong> {getCurrentFunctionParams().filter(p => !p.required).map(p => p.name).join(', ')}</div>
              </div>
            )}
            
            {/* Render each parameter with ParameterInput component */}
            {getCurrentFunctionParams().map(param => (
              <ParameterInput
                key={param.name}
                param={param}
                value={paramValues[param.name] || ''}
                onChange={handleParamChange}
                className="query-param"
              />
            ))}
            
            {/* SPECIAL CASE: Force input fields for critical parameters that might be missing */}
            {result.operation === 'getPostByPath' && !getCurrentFunctionParams().some(p => p.name === 'path') && (
              <div className="param-input">
                <label>
                  path<span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  value={paramValues['path'] || ''}
                  onChange={(e) => handleParamChange('path', e.target.value)}
                  placeholder="Enter file path"
                />
              </div>
            )}
            
            {/* Force hash input for getPostByHash */}
            {result.operation === 'getPostByHash' && !getCurrentFunctionParams().some(p => p.name === 'hash') && (
              <div className="param-input">
                <label>
                  hash<span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  value={paramValues['hash'] || ''}
                  onChange={(e) => handleParamChange('hash', e.target.value)}
                  placeholder="Enter content hash"
                />
              </div>
            )}
            
            {/* Force slug input for getPostBySlug */}
            {result.operation === 'getPostBySlug' && !getCurrentFunctionParams().some(p => p.name === 'slug') && (
              <div className="param-input">
                <label>
                  slug<span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  value={paramValues['slug'] || ''}
                  onChange={(e) => handleParamChange('slug', e.target.value)}
                  placeholder="Enter post slug"
                />
              </div>
            )}
          </div>
          <button
            className="nav-button run-button"
            title="Run with Parameters"
            onClick={runWithParams}
            disabled={loading || (hasRequiredParams && getCurrentFunctionParams().some(p => p.required && !paramValues[p.name]))}
          >
            <Play size={18} />
            <span>Run</span>
          </button>
        </div>
      )}

      {!loading && result && result.executionTime !== undefined && (
        <div className="execution-time-bar">
          Execution time: {formatExecutionTime(result.executionTime)}
        </div>
      )}

      {!loading && result && showCodeSample && (
        <div className="code-sample-container">
          <div className="code-sample-header">
            <h4>Code Sample</h4>
            <small>How to use this method with RepoMD SDK</small>
          </div>
          <SyntaxHighlighter
            language="javascript"
            style={monokai}
            customStyle={{
              borderRadius: '4px',
              margin: '0',
              padding: '15px',
              fontSize: '14px',
              lineHeight: '1.5',
              backgroundColor: '#282c34'
            }}
            wrapLongLines={true}
            showLineNumbers={true}
            codeTagProps={{
              style: {
                display: 'block',
                overflow: 'auto'
              }
            }}
          >
            {generateCodeSample()}
          </SyntaxHighlighter>
        </div>
      )}

      {!loading && result && (
        <div className={`result-content ${!result.success ? 'error' : ''}`}>
          {result.success ? (
            <div className="json-viewer-container">
              <JSONPretty
                id="json-pretty"
                data={result.data}
                theme={{
                  main: 'line-height:1.3;color:#66d9ef;background:#272822;overflow:auto;',
                  error: 'line-height:1.3;color:#66d9ef;background:#272822;overflow:auto;',
                  key: 'color:#f92672;',
                  string: 'color:#fd971f;',
                  value: 'color:#a6e22e;',
                  boolean: 'color:#ac81fe;',
                }}
              />
            </div>
          ) : (
            <div className="error">
              Error ({result.operation}): {result.error}
            </div>
          )}
        </div>
      )}

      {!loading && !result && (
        <div className="result-content initial-content">
          Repo instance created! Use the methods on the left to interact with your <a href="http://repo.md">Repo.md project</a>.
          {projectId && <div>Project ID: {projectId}</div>}
          {strategy && <div>Strategy: {strategy}</div>}
          {revision && revision !== 'latest' && <div>Revision: {revision}</div>}
        </div>
      )}
    </div>
  )
}

export default ResultPanel