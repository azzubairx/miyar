import type { ReactNode } from 'react';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  unit?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ id, label, hint, unit, required, children, className }: FieldShellProps) {
  return (
    <div className={`field ${className ?? ''}`}>
      <div className="field-label-row">
        <label htmlFor={id}>
          {label}
          {required && <span className="req" aria-hidden="true"> *</span>}
        </label>
        {unit && <span className="field-unit">{unit}</span>}
      </div>
      {children}
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  type = 'text',
  autoComplete,
  inputMode,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
  className?: string;
}) {
  return (
    <FieldShell id={id} label={label} hint={hint} required={required} className={className}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
    </FieldShell>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  hint,
  placeholder,
  step = 'any',
  min = 0,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  hint?: string;
  placeholder?: string;
  step?: string;
  min?: number;
  className?: string;
}) {
  return (
    <FieldShell id={id} label={label} hint={hint} unit={unit} className={className}>
      <input
        id={id}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        min={min}
        inputMode="decimal"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  hint?: string;
  className?: string;
}) {
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 5,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
    </FieldShell>
  );
}
