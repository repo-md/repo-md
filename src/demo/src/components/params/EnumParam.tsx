import React from 'react';
import { FunctionParam } from './ParameterInput';

interface EnumParamProps {
  param: FunctionParam;
  value: string;
  onChange: (name: string, value: string) => void;
  className?: string;
}

const EnumParam: React.FC<EnumParamProps> = ({ param, value, onChange, className = '' }) => {
  const extractEnumValues = () => {
    const match = param.type.match(/\((.*)\)/);
    if (match) {
      return match[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
    }
    return [];
  };

  const enumValues = extractEnumValues();
  const currentValue = value || (param.default !== undefined ? String(param.default) : '');

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
        value={currentValue}
        onChange={(e) => onChange(param.name, e.target.value)}
        className="enum-select"
      >
        {!param.required && (
          <option value="">
            Default{param.default !== undefined ? ` (${param.default})` : ''}
          </option>
        )}
        {enumValues.map(val => (
          <option key={val} value={val}>
            {val}
          </option>
        ))}
      </select>
      {param.description && <div className="param-description">{param.description}</div>}
    </div>
  );
};

export default EnumParam;