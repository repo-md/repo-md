import React, { useEffect } from 'react'
import { Info } from 'lucide-react'

interface ConfigPanelProps {
  projectId: string
  setProjectId: (value: string) => void
  orgSlug: string
  setOrgSlug: (value: string) => void
  apiSecret: string
  setApiSecret: (value: string) => void
  strategy:  'auto' | 'server' | 'browser'
  setStrategy: (value: 'auto' | 'server' | 'browser') => void
  revision: string
  setRevision: (value: string) => void
}

// Storage keys
const STORAGE_KEY_PROJECT_ID = 'repomd_demo_projectId';
const STORAGE_KEY_ORG_SLUG = 'repomd_demo_orgSlug';
const STORAGE_KEY_STRATEGY = 'repomd_demo_strategy';
const STORAGE_KEY_REVISION = 'repomd_demo_revision';

// Sample project data
const SAMPLE_PROJECT = {
  projectId: '680e97604a0559a192640d2c',
  orgSlug: 'iplanwebsites'
};

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  projectId,
  setProjectId,
  orgSlug,
  setOrgSlug,
  apiSecret,
  setApiSecret,
  strategy,
  setStrategy,
  revision,
  setRevision
}) => {
  // Load values from localStorage on component mount
  useEffect(() => {
    const storedProjectId = localStorage.getItem(STORAGE_KEY_PROJECT_ID);
    const storedOrgSlug = localStorage.getItem(STORAGE_KEY_ORG_SLUG);
    const storedStrategy = localStorage.getItem(STORAGE_KEY_STRATEGY);

    if (storedProjectId) setProjectId(storedProjectId);
    if (storedOrgSlug) setOrgSlug(storedOrgSlug);
    if (storedStrategy && (storedStrategy === 'auto' || storedStrategy === 'server' || storedStrategy === 'browser')) {
      setStrategy(storedStrategy);
    }
    const storedRevision = localStorage.getItem(STORAGE_KEY_REVISION);
    if (storedRevision) setRevision(storedRevision);
  }, [setProjectId, setOrgSlug, setStrategy, setRevision]);

  // Handler for project ID changes
  const handleProjectIdChange = (value: string) => {
    setProjectId(value);
    localStorage.setItem(STORAGE_KEY_PROJECT_ID, value);
  };

  // Handler for org slug changes
  const handleOrgSlugChange = (value: string) => {
    setOrgSlug(value);
    localStorage.setItem(STORAGE_KEY_ORG_SLUG, value);
  };

  // Handler for strategy changes
  const handleStrategyChange = (value: string) => {
    // Type cast the value as it's coming from a select element
    const typedValue = value as 'auto' | 'server' | 'browser';
    setStrategy(typedValue);
    localStorage.setItem(STORAGE_KEY_STRATEGY, typedValue);
  };

  // Handler for revision changes
  const handleRevisionChange = (value: string) => {
    setRevision(value);
    localStorage.setItem(STORAGE_KEY_REVISION, value);
  };

  // Handler for using sample project
  const handleUseSampleProject = () => {
    handleProjectIdChange(SAMPLE_PROJECT.projectId);
    handleOrgSlugChange(SAMPLE_PROJECT.orgSlug);
  };

  return (
    <div className="config-panel">
      <div className="config-header">
        <h3>API Configuration
          <span className="info-icon">
            <Info size={16} />
            <div className="tooltip">
              <p>This demo uses the RepoMD JavaScript client to fetch content from the repo.md API.</p>
              <p>Enter your project ID and organization slug to get started, or use the sample project button.</p>
            </div>
          </span>
        </h3>
      </div>

      <div className="config-form">
        <div className="form-group">
          <label htmlFor="orgSlug">Org Slug (required)</label>
          <input
            id="orgSlug"
            type="text"
            value={orgSlug}
            onChange={(e) => handleOrgSlugChange(e.target.value)}
            placeholder="Enter org slug"
          />
          <small>Example: my-company</small>
        </div>

        <div className="form-group">
          <label htmlFor="projectId">Project ID (required)</label>
          <input
            id="projectId"
            type="text"
            value={projectId}
            onChange={(e) => handleProjectIdChange(e.target.value)}
            placeholder="Enter project ID"
          />
          <small>Example: 680e97604a0559a192640d2c</small>
        </div>

        <div className="form-group">
          <label htmlFor="strategy">Strategy</label>
          <select
            id="strategy"
            value={strategy}
            onChange={(e) => handleStrategyChange(e.target.value)}
            className="strategy-select"
          >
            <option value="auto">Auto (Default)</option>
            <option value="server">Server</option>
            <option value="browser">Browser</option>
          </select>
          <small>Client handling mode</small>
        </div>

        <div className="form-group">
          <label htmlFor="revision">Revision <span className="optional-label">(optional)</span></label>
          <input
            id="revision"
            type="text"
            value={revision}
            onChange={(e) => handleRevisionChange(e.target.value)}
            placeholder="latest"
          />
          <small>Default: latest</small>
        </div>

        <div className="form-group">
          <label htmlFor="apiSecret">Secret Key <span className="optional-label">(optional)</span></label>
          <input
            id="apiSecret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Enter secret key"
          />
          <small>For protected content</small>
        </div>
      </div>

      <div className="config-buttons">
        <button
          className="sample-project-button"
          onClick={handleUseSampleProject}
        >
          Use Sample Project
        </button>
      </div>
    </div>
  )
}

export default ConfigPanel