import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldWrapProps {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FieldWrap({ label, error, children, className = "" }: FieldWrapProps) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
        {label}
      </label>
      {children}
      {error && <div className="text-[11.5px] text-accent-red font-semibold mt-1.5">{error}</div>}
    </div>
  );
}

const inputClasses =
  "w-full bg-surface-alt border border-border rounded-control px-3 py-2.5 text-[13px] font-medium text-text placeholder:text-text-muted transition-colors focus:border-accent-green";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClasses} resize-none ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClasses} cursor-pointer ${props.className ?? ""}`}>
      {props.children}
    </select>
  );
}
