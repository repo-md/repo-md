import React from 'react';
import { FunctionParam } from './ParameterInput';

interface StringParamProps {
  param: FunctionParam;
  value: string;
  onChange: (name: string, value: string) => void;
  className?: string;
}

const StringParam: React.FC<StringParamProps> = ({ param, value, onChange, className = '' }) => {
  const placeholder = param.default !== undefined 
    ? `Default: ${String(param.default)}` 
    : param.required 
      ? `Enter ${param.name}...` 
      : 'Optional';
  
  return (
    <div className={`param-input ${param.required ? 'required' : 'optional'} ${className}`}>
      <label>
        {param.name}
        {param.required ? 
          <span className="required-indicator">*</span> : 
          <span className="optional-indicator">(optional)</span>
        }
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(param.name, e.target.value)}
        placeholder={placeholder}
        className={`string-input ${param.required ? 'required-input' : 'optional-input'}`}
        required={param.required}
      />
      {param.description && <div className="param-description">{param.description}</div>}
    </div>
  );
};

export default StringParam;