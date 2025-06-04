import React, { useEffect, useState } from 'react'
import { Info, ChevronDown, ChevronRight } from 'lucide-react'
import exampleProjects from '../exampleProjects.json'

interface ConfigPanelProps {
  projectId: string
  setProjectId: (value: string) => void
  apiSecret: string
  setApiSecret: (value: string) => void
  strategy:  'auto' | 'server' | 'browser'
  setStrategy: (value: 'auto' | 'server' | 'browser') => void
  revision: string
  setRevision: (value: string) => void
  isCollapsed?: boolean
  onToggle?: () => void
}

type ProjectTemplate = keyof typeof exampleProjects

// Storage keys
const STORAGE_KEY_PROJECT_ID = 'repomd_demo_projectId';
const STORAGE_KEY_STRATEGY = 'repomd_demo_strategy';
const STORAGE_KEY_REVISION = 'repomd_demo_revision';


const ConfigPanel: React.FC<ConfigPanelProps> = ({
  projectId,
  setProjectId,
  apiSecret,
  setApiSecret,
  strategy,
  setStrategy,
  revision,
  setRevision,
  isCollapsed = false,
  onToggle
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | ''>('')
  // Load values from localStorage on component mount
  useEffect(() => {
    const storedProjectId = localStorage.getItem(STORAGE_KEY_PROJECT_ID);
    const storedStrategy = localStorage.getItem(STORAGE_KEY_STRATEGY);

    if (storedProjectId) setProjectId(storedProjectId);
    if (storedStrategy && (storedStrategy === 'auto' || storedStrategy === 'server' || storedStrategy === 'browser')) {
      setStrategy(storedStrategy);
    }
    const storedRevision = localStorage.getItem(STORAGE_KEY_REVISION);
    if (storedRevision) setRevision(storedRevision);
  }, [setProjectId, setStrategy, setRevision]);

  // Handler for project ID changes
  const handleProjectIdChange = (value: string) => {
    setProjectId(value);
    localStorage.setItem(STORAGE_KEY_PROJECT_ID, value);
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

  const handleTemplateChange = (template: ProjectTemplate | '') => {
    setSelectedTemplate(template);
    if (template && exampleProjects[template]) {
      const project = exampleProjects[template];
      handleProjectIdChange(project.projectId);
      setStrategy(project.strategy as 'auto' | 'server' | 'browser');
      handleRevisionChange(project.revision);
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header">
        <h3 className="config-title" onClick={onToggle} style={{ cursor: onToggle ? 'pointer' : 'default' }}>
          {onToggle && (
            <span className="chevron-icon">
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </span>
          )}
          Project Configuration
          <span className="info-icon">
            <Info size={16} />
            <div className="tooltip">
              <p>This demo uses the RepoMD JavaScript client to fetch content from the repo.md API.</p>
              <p>Enter your project ID and organization slug to get started, or use an example project.</p>
            </div>
          </span>
        </h3>
        {!isCollapsed && (
          <div className="template-selector">
            <select
              id="template"
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value as ProjectTemplate | '')}
              className="template-select-subtle"
            >
              <option value="">Use an example project...</option>
              {Object.entries(exampleProjects).map(([key, template]) => (
                <option key={key} value={key}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div className="config-form">
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
        </>
      )}
    </div>
  )
}

export default ConfigPanel