import React, { useState } from 'react'

interface OperationsProps {
  handleRun: (operation: string, params?: Record<string, string>) => void
  disabled: boolean
}

const Operations: React.FC<OperationsProps> = ({ handleRun, disabled }) => {
  const [slug, setSlug] = useState('')
  const [count, setCount] = useState('3')

  return (
    <div className="operations">
      <h2>API Operations</h2>
      
      <div className="operation-group">
        <div className="operation-header">Project Information</div>
        <button 
          onClick={() => handleRun('getProjectDetails')} 
          disabled={disabled}
        >
          Get Project Details
        </button>
      </div>
      
      <div className="operation-group">
        <div className="operation-header">Posts</div>
        <button 
          onClick={() => handleRun('getAllPosts')} 
          disabled={disabled}
        >
          Get All Posts
        </button>
        
        <div className="button-with-input">
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="Count"
            min="1"
            max="10"
          />
          <button 
            onClick={() => handleRun('getRecentPosts', { count })} 
            disabled={disabled}
          >
            Get Recent Posts
          </button>
        </div>
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
            onClick={() => handleRun('getPostBySlug', { slug })} 
            disabled={disabled || !slug}
          >
            Get Post
          </button>
        </div>
      </div>
      
      <div className="operation-group">
        <div className="operation-header">Media</div>
        <button 
          onClick={() => handleRun('getAllMedia')} 
          disabled={disabled}
        >
          Get All Media
        </button>
      </div>
    </div>
  )
}

export default Operations