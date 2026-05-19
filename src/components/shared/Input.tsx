import { ReactNode } from 'react'

interface InputProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  type?: string
  error?: string
  required?: boolean
  className?: string
}

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  error?: string
  required?: boolean
  placeholder?: string
}

interface TextareaProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  rows?: number
}

const baseInput = `
  w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3
  text-white placeholder:text-slate-500
  focus:outline-none focus:border-primary-500/60 focus:bg-navy-800
  transition-all duration-200
`

export const Input = ({ label, placeholder, value, onChange, type = 'text', error, required, className = '' }: InputProps) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-sm font-medium text-slate-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={`${baseInput} ${error ? 'border-red-500/60' : ''} ${className}`}
    />
    {error && <span className="text-xs text-red-400">{error}</span>}
  </div>
)

export const Select = ({ label, value, onChange, options, error, required, placeholder }: SelectProps) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-sm font-medium text-slate-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={`${baseInput} ${error ? 'border-red-500/60' : ''} cursor-pointer`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-navy-800">
          {opt.label}
        </option>
      ))}
    </select>
    {error && <span className="text-xs text-red-400">{error}</span>}
  </div>
)

export const Textarea = ({ label, placeholder, value, onChange, error, required, rows = 4 }: TextareaProps) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-sm font-medium text-slate-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
    )}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      rows={rows}
      className={`${baseInput} resize-none ${error ? 'border-red-500/60' : ''}`}
    />
    {error && <span className="text-xs text-red-400">{error}</span>}
  </div>
)
