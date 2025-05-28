import React from 'react';
import { FunctionParam } from './ParameterInput';

interface BooleanParamProps {
  param: FunctionParam;
  value: string;
  onChange: (name: string, value: string) => void;
  className?: string;
}

const BooleanParam: React.FC<BooleanParamProps> = ({ param, value, onChange, className = '' }) => {
  // Handle the select dropdown value
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    
    // Convert the select value to the appropriate parameter value
    if (selectedValue === 'default') {
      // For default option, set to empty string to indicate we want to use the default
      // This will be treated as undefined/null by the parameter processor
      onChange(param.name, '');
    } else {
      // Use the selected value directly (true/false)
      onChange(param.name, selectedValue);
    }
  };
  
  // Determine the current select value to display
  const getSelectValue = () => {
    // Empty string or undefined should show as 'default' for optional parameters
    if (value === '' || value === undefined) {
      return 'default';
    }
    
    // Make sure we return a valid option value
    if (value !== 'true' && value !== 'false' && value !== 'default') {
      // If current value is invalid, default to the default option for optional params
      // or true for required params
      return !param.required ? 'default' : 'true';
    }
    
    return value;
  };
  
  // Debug the current state
  React.useEffect(() => {
    console.log(`[BooleanParam] ${param.name}: value=${value}, computed=${getSelectValue()}, required=${param.required}`);
  }, [param.name, value, param.required]);
  
  // We don't want to auto-initialize empty values anymore
  // Empty value means "use default" so we want to keep it as empty
  // The parameter processing logic will handle this correctly
  
  return (
    <div className={`param-input ${className}`}>
      <div className="boolean-param-container">
        <div className="boolean-label">
          {param.name}
          {param.required ? 
            <span className="required-indicator">*</span> : 
            <span className="optional-indicator">(optional)</span>
          }
        </div>
        <select
          value={getSelectValue()}
          onChange={handleSelectChange}
          className="boolean-select"
          id={`param-${param.name}`}
        >
          {!param.required && (
            <option value="default">Default ({param.default === true ? 'true' : 'false'})</option>
          )}
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </div>
      {param.description && <div className="param-description">{param.description}</div>}
    </div>
  );
};

export default BooleanParam;