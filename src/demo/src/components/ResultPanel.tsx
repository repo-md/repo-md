import React, { useState, useEffect, useCallback } from 'react'
import { ApiResult } from '../types'
import JSONPretty from 'react-json-pretty'
import 'react-json-pretty/themes/monikai.css'
import { Settings, Code, Play } from 'lucide-react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { monokai } from 'react-syntax-highlighter/dist/esm/styles/hljs'

// Define parameter types for functions
interface FunctionParam {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  defaultValue?: string | number | boolean;
}

interface ResultPanelProps {
  result: ApiResult | null
  loading: boolean
  toggleConfig: () => void
  showConfig: boolean
  handleRun?: (params?: Record<string, string>) => void
  functionParams?: Record<string, FunctionParam[]>
  projectId?: string
  orgSlug?: string
  strategy?: 'auto' | 'server' | 'browser'
  revision?: string
}

const ResultPanel: React.FC<ResultPanelProps> = ({
  result,
  loading,
  toggleConfig,
  showConfig,
  handleRun,
  functionParams = {},
  projectId = '',
  orgSlug = '',
  strategy = 'auto',
  revision = ''
}) => {
  // State for parameter values
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  // State for showing code sample
  const [showCodeSample, setShowCodeSample] = useState(false);

  // Reset param values when result changes
  useEffect(() => {
    if (result?.params) {
      setParamValues(result.params);
    } else {
      setParamValues({});
    }
  }, [result?.operation]);

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

  // Get function parameters for the current operation
  const getCurrentFunctionParams = () => {
    if (!result?.operation) return [];
    return functionParams[result.operation] || [];
  };

  // Check if current function has parameters
  const hasParams = result?.operation ?
    (functionParams[result.operation] && functionParams[result.operation].length > 0) :
    false;

  // Generate code sample for the current operation
  const generateCodeSample = () => {
    if (!result?.operation) return '';

    const operation = result.operation;
    const params = result.params || {};
    const currentFunctionParams = functionParams[operation] || [];

    // Use the actual values from the playground
    const actualProjectId = projectId || '680e97604a0559a192640d2c';
    const actualOrgSlug = orgSlug || 'iplanwebsites';

    let codeLines = [
      "// Initialize the RepoMD instance",
      "const repo = new RepoMD({",
      `  projectId: '${actualProjectId}',`,
      `  orgSlug: '${actualOrgSlug}',`
    ];

    // Add strategy if not auto
    if (strategy !== 'auto') {
      codeLines.push(`  strategy: '${strategy}',`);
    }

    // Add revision if specified
    if (revision && revision !== 'latest') {
      codeLines.push(`  rev: '${revision}',`);
    }

    codeLines.push("  debug: true");
    codeLines.push("});");
    codeLines.push("");
    codeLines.push("// Later in your code");
    codeLines.push("async function fetchData() {");
    codeLines.push("  try {");

    // Add the function call with parameters
    if (currentFunctionParams.length === 0) {
      // No parameters
      codeLines.push(`    const data = await repo.${operation}();`);
    } else if (currentFunctionParams.length === 1) {
      // Single parameter
      const param = currentFunctionParams[0];
      const paramValue = params[param.name] || (param.defaultValue !== undefined ? String(param.defaultValue) : "''");
      const formattedValue = param.type === 'string' ? `'${paramValue}'` : paramValue;
      codeLines.push(`    const data = await repo.${operation}(${formattedValue});`);
    } else {
      // Multiple parameters
      let paramList = currentFunctionParams
        .map(param => {
          const paramValue = params[param.name] || (param.defaultValue !== undefined ? String(param.defaultValue) : "''");
          return param.type === 'string' ? `'${paramValue}'` : paramValue;
        })
        .join(', ');
      codeLines.push(`    const data = await repo.${operation}(${paramList});`);
    }

    // Complete the code sample
    codeLines.push('    console.log(data);');
    codeLines.push('  } catch (error) {');
    codeLines.push('    console.error("Error:", error);');
    codeLines.push('  }');
    codeLines.push('}');
    codeLines.push('');
    codeLines.push('fetchData();');

    return codeLines.join('\n');
  };

  return (
    <div className="result-panel">
      <div className="result-navbar">
        <div className="result-nav-left">
          {loading ? (
            <div className="loading-indicator">Loading...</div>
          ) : (
            result && (
              <div className="method-name">
                {result.operation}
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

          <button
            className={`nav-button settings-button ${showConfig ? 'active' : ''}`}
            onClick={toggleConfig}
            title="Toggle Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {!loading && result && hasParams && (
        <div className="query-bar">
          <div className="query-params">
            {getCurrentFunctionParams().map(param => (
              <div key={param.name} className="param-input">
                <label>
                  {param.name}
                  {param.required && <span className="required-indicator">*</span>}
                </label>
                <input
                  type={param.type === 'number' ? 'number' : 'text'}
                  value={paramValues[param.name] || ''}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  placeholder={param.defaultValue !== undefined ? String(param.defaultValue) : ''}
                />
              </div>
            ))}
          </div>
          <button
            className="nav-button run-button"
            title="Run with Parameters"
            onClick={runWithParams}
            disabled={loading}
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
        <div className="result-content">
          No operations run yet. Use the buttons above to test the API.
        </div>
      )}
    </div>
  )
}

export default ResultPanel