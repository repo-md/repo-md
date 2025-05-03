import React from 'react'
import { ApiResult } from '../types'

interface ResultPanelProps {
  result: ApiResult | null
  loading: boolean
}

const ResultPanel: React.FC<ResultPanelProps> = ({ result, loading }) => {
  return (
    <div className="result-panel">
      <div className="result-title">
        {loading ? 'Loading...' : 'Result'}
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