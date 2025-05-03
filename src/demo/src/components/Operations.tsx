import React, { useState } from 'react'

interface OperationsProps {
  handleRun: (operation: string, params?: Record<string, string>) => void
  disabled: boolean
}

const Operations: React.FC<OperationsProps> = ({ handleRun, disabled }) => {
  const [slug, setSlug] = useState('')

  return (
    <div className="operations">
      <h2>API Operations</h2>
      
      <div className="operation-group">
        <div className="operation-header">List Posts</div>
        <button 
          onClick={() => handleRun('listSlugs')} 
          disabled={disabled}
        >
          Get All Posts
        </button>
      </div>

      <div className="operation-group">
        <div className="operation-header">Get Post by Slug</div>
        <div className="button-with-input">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Enter post slug"
          />
          <button 
            onClick={() => handleRun('load', { slug })} 
            disabled={disabled || !slug}
          >
            Get Post
          </button>
        </div>
      </div>
    </div>
  )
}

export default Operations