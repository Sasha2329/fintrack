import { ChangeEvent } from 'react';

interface DateFieldProps {
  type: 'date' | 'month' | 'datetime-local';
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  min?: string;
  max?: string;
}

function formatDateValue(type: DateFieldProps['type'], value: string) {
  if (!value) {
    return '';
  }

  if (type === 'month') {
    const [year, month] = value.split('-').map(Number);
    if (!year || !month) {
      return value;
    }

    return new Date(year, month - 1, 1).toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric'
    });
  }

  if (type === 'datetime-local') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function DateField({ type, value, onChange, required, min, max }: DateFieldProps) {
  return (
    <span className="date-field">
      <span className="date-field__value">{formatDateValue(type, value)}</span>
      <input
        className="date-field__native"
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
      />
      <span className="date-field__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <rect x="4.5" y="6.5" width="15" height="13" rx="2.5" />
          <path d="M8 4.8v3.4" />
          <path d="M16 4.8v3.4" />
          <path d="M4.5 10h15" />
        </svg>
      </span>
    </span>
  );
}
