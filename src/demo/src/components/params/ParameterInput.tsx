import React, { useEffect } from 'react';
import StringParam from './StringParam';
import NumberParam from './NumberParam';
import BooleanParam from './BooleanParam';
import ArrayParam from './ArrayParam';
import EnumParam from './EnumParam';

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

const ParameterInput: React.FC<ParameterInputProps> = ({ param, value, onChange, className = '' }) => {
  useEffect(() => {
    if (value === '' && param.default !== undefined && !param.required) {
      if (param.type === 'boolean' || (typeof param.default === 'boolean')) {
        onChange(param.name, String(param.default));
      }
    }
  }, [param, value, onChange]);

  const getParameterType = () => {
    const type = param.type.toLowerCase();
    
    if (type === 'boolean' || (param.default !== undefined && typeof param.default === 'boolean')) {
      return 'boolean';
    }
    
    if (type === 'number' || type.includes('number')) {
      return 'number';
    }
    
    if (type.includes('enum') || (type.includes('(') && type.includes(')'))) {
      return 'enum';
    }
    
    if (type === 'array' || type.includes('array') || type.includes('[]')) {
      return 'array';
    }
    
    return 'string';
  };

  const paramType = getParameterType();

  switch (paramType) {
    case 'boolean':
      return (
        <BooleanParam 
          param={param} 
          value={value} 
          onChange={onChange} 
          className={className}
        />
      );
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
      return (
        <EnumParam 
          param={param} 
          value={value} 
          onChange={onChange} 
          className={className}
        />
      );
    case 'array':
      return (
        <ArrayParam 
          param={param} 
          value={value} 
          onChange={onChange} 
          className={className}
        />
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

export default ParameterInput;