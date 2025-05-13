import React from 'react'
import { ApiResult } from '../types'

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
            <pre>
              {JSON.stringify(result.data, null, 2)}
            </pre>
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