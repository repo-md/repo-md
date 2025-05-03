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
          placeholder="Enter your project ID (e.g., 680e97604a0559a192640d2c)"
        />
        <small>Example: 680e97604a0559a192640d2c</small>
      </div>
      
      <div className="form-group">
        <label htmlFor="apiSecret">Secret Key (optional)</label>
        <input
          id="apiSecret"
          type="password"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder="Enter your secret key for protected content"
        />
        <small>Required only for accessing protected content</small>
      </div>
      
      <div className="info-box">
        <p>This demo uses the RepoMD JavaScript client to fetch content from the repo.md API.</p>
        <p>Enter your project ID to get started. You can find this in your repo.md dashboard.</p>
      </div>
    </div>
  )
}

export default ConfigPanel