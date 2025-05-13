import React from 'react';

interface FunctionListProps {
  functions: string[];
  handleExecute: (fnName: string) => void;
  disabled: boolean;
}

const FunctionList: React.FC<FunctionListProps> = ({ 
  functions, 
  handleExecute, 
  disabled 
}) => {
  // Group functions by their prefix (post, media, etc.)
  const groupedFunctions: Record<string, string[]> = {};
  
  functions.forEach(fn => {
    if (fn.startsWith('_') || fn === 'constructor') return; // Skip internal methods
    
    // Determine group based on method name or pattern
    let group = 'Other';
    if (fn.toLowerCase().includes('post')) group = 'Posts';
    else if (fn.toLowerCase().includes('media')) group = 'Media';
    else if (fn.toLowerCase().includes('file')) group = 'Files';
    else if (fn.toLowerCase().includes('project')) group = 'Project';
    else if (fn.toLowerCase().includes('url')) group = 'URLs';
    else if (fn.toLowerCase().includes('similarity')) group = 'Similarity';
    else if (fn.toLowerCase().includes('openai')) group = 'OpenAI';
    else if (fn.toLowerCase().includes('fetch')) group = 'Fetch';
    
    // Initialize group array if it doesn't exist
    if (!groupedFunctions[group]) {
      groupedFunctions[group] = [];
    }
    
    groupedFunctions[group].push(fn);
  });
  
  // Specific group order
  const groupOrder = [
    'Posts', 
    'Media', 
    'Files', 
    'Project', 
    'URLs', 
    'Similarity', 
    'Fetch',
    'OpenAI',
    'Other'
  ];
  
  return (
    <div className="function-list">
      <h2>All Available Functions</h2>
      <p className="function-description">
        Click on a function to execute it and see its response and execution time
      </p>
      
      {groupOrder.map(groupName => {
        const functionList = groupedFunctions[groupName];
        if (!functionList || functionList.length === 0) return null;
        
        return (
          <div key={groupName} className="function-group">
            <div className="function-group-header">{groupName}</div>
            <div className="function-buttons">
              {functionList.sort().map(fnName => (
                <button
                  key={fnName}
                  className="function-button"
                  onClick={() => handleExecute(fnName)}
                  disabled={disabled}
                >
                  {fnName}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FunctionList;