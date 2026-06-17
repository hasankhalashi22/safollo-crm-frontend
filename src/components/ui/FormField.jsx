export function TextField({ label, value, onChange, type = 'text', placeholder, required, ...rest }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}{required && ' *'}</label>
      <input type={type} className="input-field" value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} {...rest} />
    </div>
  );
}

export function SelectField({ label, value, onChange, options, placeholder = '-- Select --', required }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}{required && ' *'}</label>
      <select className="input-field" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function TextareaField({ label, value, onChange, rows = 2, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <textarea className="input-field resize-none" rows={rows} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function CheckboxField({ label, checked, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <label className="text-sm">{label}</label>
    </div>
  );
}