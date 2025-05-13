import React from 'react'
import { ApiResult } from '../types'
import JSONPretty from 'react-json-pretty'
import 'react-json-pretty/themes/monikai.css'

interface ResultPanelProps {
  result: ApiResult | null
  loading: boolean
}

const ResultPanel: React.FC<ResultPanelProps> = ({ result, loading }) => {
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

  return (
    <div className="result-panel">
      <div className="result-header">
        <div className="result-title">
          {loading ? 'Loading...' : result ? `Result: ${result.operation}` : 'Result'}
        </div>

        {!loading && result && result.executionTime !== undefined && (
          <div className="execution-time">
            Execution time: {formatExecutionTime(result.executionTime)}
          </div>
        )}
      </div>

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