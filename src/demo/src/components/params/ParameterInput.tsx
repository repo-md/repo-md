import React, { useEffect } from 'react';
import StringParam from './StringParam';
import NumberParam from './NumberParam';
import BooleanParam from './BooleanParam';

export interface FunctionParam {
  name: string;
  required: boolean;
  type: string;
  default?: any;
  description?: string;
}

interface ParameterInputProps {
  param: FunctionParam;
  value: string;
  onChange: (name: string, value: string) => void;
  className?: string;
}

/**
 * Generic parameter input component that delegates to specific input components based on parameter type
 */
const ParameterInput: React.FC<ParameterInputProps> = ({ param, value, onChange, className = '' }) => {
  // Set default value for the parameter if it's not set and has a default
  useEffect(() => {
    if (value === '' && param.default !== undefined) {
      // For boolean params with default value, we need to initialize them
      if (param.type === 'boolean') {
        onChange(param.name, String(param.default));
      }
    }
  }, [param, value, onChange]);

  // Debug the parameter 
  console.log(`[ParameterInput] Rendering ${param.name}: type=${param.type}, required=${param.required}, default=${param.default}`);
  
  // Better detection for boolean parameters by name patterns as fallback
  const booleanParamNames = ['useCache', 'forceRefresh', 'debug', 'loadIndividually'];
  const isBooleanByName = booleanParamNames.includes(param.name);
  
  // Fix the issue with identifying boolean parameters
  const isBoolean = param.type === 'boolean' || 
                   param.type.includes('boolean') || 
                   (param.default !== undefined && typeof param.default === 'boolean') ||
                   isBooleanByName;

  // Determine the appropriate input component based on parameter type
  const renderInput = () => {
    // Extract type from complex types like "enum (a, b, c)"
    const basicType = param.type.includes('enum') 
      ? 'enum' 
      : param.type.split('|')[0].trim();
    
    // Use our enhanced boolean detection
    if (isBoolean) {
      return (
        <BooleanParam 
          param={param} 
          value={value} 
          onChange={onChange} 
          className={className}
        />
      );
    }
    
    switch (basicType) {
      case 'number':
        return (
          <NumberParam 
            param={param} 
            value={value} 
            onChange={onChange} 
            className={className}
          />
        );
      case 'enum':
        // Extract enum values from the type string "enum (a, b, c)"
        const enumValues = param.type
          .match(/\((.*)\)/)?.[1]
          .split(',')
          .map(v => v.trim()) || [];
        
        return (
          <div className={`param-input ${className}`}>
            <label>
              {param.name}
              {param.required ? 
                <span className="required-indicator">*</span> : 
                <span className="optional-indicator">(optional)</span>
              }
            </label>
            <select
              value={value || (param.default !== undefined ? String(param.default) : '')}
              onChange={(e) => onChange(param.name, e.target.value)}
            >
              {enumValues.map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>
        );
      case 'string':
      default:
        return (
          <StringParam 
            param={param} 
            value={value} 
            onChange={onChange} 
            className={className}
          />
        );
    }
  };

  return renderInput();
};

export default ParameterInput;