import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { inputClass } from './AuthShell'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  const label = visible ? t('auth.hidePassword') : t('auth.showPassword')

  return (
    <div className="relative">
      <input
        {...props}
        className={[inputClass, 'pr-12', className].filter(Boolean).join(' ')}
        type={visible ? 'text' : 'password'}
      />
      <button
        aria-label={label}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-slate-600 focus-visible:text-indigo-600 focus-visible:outline-none dark:hover:text-slate-200"
        onClick={() => setVisible((value) => !value)}
        title={label}
        type="button"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}
