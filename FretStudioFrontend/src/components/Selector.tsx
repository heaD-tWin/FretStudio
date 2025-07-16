

interface SelectorProps<T> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel?: (option: T) => string;
  getKey?: (option: T) => string | number;
  className?: string;
  label?: string;
}

export function Selector<T>({
  options,
  value,
  onChange,
  getLabel = (option: T) => String(option),
  getKey = (option: T) => String(option),
  className = '',
  label = '',
}: SelectorProps<T>) {
  return (
    <select
      id={label}
      name={label}
      className={className}
      value={getKey(value)}
      aria-label={label}
      title={label}
      onChange={e => {
        const selected = options.find(
          option => getKey(option) === e.target.value
        );
        if (selected) {
          onChange(selected);
        }
      }}
    >
      {options.map(option => (
        <option key={getKey(option)} value={getKey(option)}>
          {getLabel(option)}
        </option>
      ))}
    </select>
  );
}

export default Selector;