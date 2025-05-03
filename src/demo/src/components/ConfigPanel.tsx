import React from 'react'

interface ConfigPanelProps {
  projectId: string
  setProjectId: (value: string) => void
  apiSecret: string
  setApiSecret: (value: string) => void
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  projectId,
  setProjectId,
  apiSecret,
  setApiSecret,
}) => {
  return (
    <div className="config-panel">
      <h2>Configuration</h2>
      
      <div className="form-group">
        <label htmlFor="projectId">Project ID (required)</label>
        <input
          id="projectId"
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Enter your project ID"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="apiSecret">API Secret (optional)</label>
        <input
          id="apiSecret"
          type="password"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder="Enter your API secret"
        />
      </div>
    </div>
  )
}

export default ConfigPanel