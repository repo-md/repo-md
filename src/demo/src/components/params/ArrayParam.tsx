import React, { useState } from 'react';
import { FunctionParam } from './ParameterInput';

interface ArrayParamProps {
  param: FunctionParam;
  value: string;
  onChange: (name: string, value: string) => void;
  className?: string;
}

const ArrayParam: React.FC<ArrayParamProps> = ({ param, value, onChange, className = '' }) => {
  const [items, setItems] = useState<string[]>(() => {
    try {
      return value ? JSON.parse(value) : [];
    } catch {
      return value ? value.split(',').map(s => s.trim()) : [];
    }
  });

  const updateValue = (newItems: string[]) => {
    setItems(newItems);
    onChange(param.name, JSON.stringify(newItems));
  };

  const addItem = () => {
    updateValue([...items, '']);
  };

  const removeItem = (index: number) => {
    updateValue(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, newValue: string) => {
    const newItems = [...items];
    newItems[index] = newValue;
    updateValue(newItems);
  };

  return (
    <div className={`param-input array-param ${className}`}>
      <label>
        {param.name}
        {param.required ? 
          <span className="required-indicator">*</span> : 
          <span className="optional-indicator">(optional)</span>
        }
      </label>
      <div className="array-items">
        {items.map((item, index) => (
          <div key={index} className="array-item">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={`Item ${index + 1}`}
              className="array-item-input"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="array-item-remove"
              title="Remove item"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="array-add-button"
        >
          + Add Item
        </button>
      </div>
      {param.description && <div className="param-description">{param.description}</div>}
    </div>
  );
};

export default ArrayParam;