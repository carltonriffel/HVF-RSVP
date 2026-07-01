'use client';

import type { ReactNode } from 'react';

/**
 * A single step of the multi-step form: eyebrow label, title, optional note,
 * and the fields passed as children.
 */
export default function FormStep({
  title,
  eyebrow,
  note,
  children,
}: {
  title: string;
  eyebrow?: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {eyebrow ? <p className="eyebrow section-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {note ? <p className="note">{note}</p> : null}
      <div>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable field primitives, shared across every step.
// ---------------------------------------------------------------------------

let uid = 0;
function nextId(prefix: string) {
  uid += 1;
  return `${prefix}-${uid}`;
}

export function RadioGroup({
  label,
  hint,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  name: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {hint ? <span className="hint">{hint}</span> : null}
      <div className="choices" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <label className="choice" key={opt}>
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  placeholder,
  inputMode,
  autoComplete,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'date';
  placeholder?: string;
  inputMode?: 'text' | 'tel' | 'email';
  autoComplete?: string;
}) {
  const id = nextId('tf');
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint ? <span className="hint">{hint}</span> : null}
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function TextArea({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = nextId('ta');
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint ? <span className="hint">{hint}</span> : null}
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
