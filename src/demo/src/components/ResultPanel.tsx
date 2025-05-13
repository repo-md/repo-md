import React, { useState, useEffect, useCallback } from 'react'
import { ApiResult } from '../types'
import JSONPretty from 'react-json-pretty'
import 'react-json-pretty/themes/monikai.css'
import { Settings, Code, Play } from 'lucide-react'

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
}

const ResultPanel: React.FC<ResultPanelProps> = ({
  result,
  loading,
  toggleConfig,
  showConfig,
  handleRun,
  functionParams = {}
}) => {
  // State for parameter values
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

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
            className="nav-button code-sample-button"
            title="View Code Sample"
            disabled
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