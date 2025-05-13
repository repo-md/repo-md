import React from 'react'
import { ApiResult } from '../types'
import JSONPretty from 'react-json-pretty'
import 'react-json-pretty/themes/monikai.css'
import { Settings, Code } from 'lucide-react'

interface ResultPanelProps {
  result: ApiResult | null
  loading: boolean
  toggleConfig: () => void
  showConfig: boolean
}

const ResultPanel: React.FC<ResultPanelProps> = ({ result, loading, toggleConfig, showConfig }) => {
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

  // Function to extract parameter info
  const getParamsInfo = () => {
    if (!result || !result.success) return '';

    // Simple extraction for now - this could be enhanced
    return '';
  };

  return (
    <div className="result-panel">
      <div className="result-navbar">
        <div className="result-nav-left">
          {loading ? (
            <div className="loading-indicator">Loading...</div>
          ) : (
            result && (
              <>
                <div className="method-name">{result.operation}</div>
                <div className="method-params">{getParamsInfo()}</div>
              </>
            )
          )}
        </div>

        <div className="result-nav-right">
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