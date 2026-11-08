import type { ReactNode } from 'react'

export function AuthShell({
  title,
  subtitle,
  brandLine,
  children,
}: {
  title: string
  subtitle?: string
  brandLine?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4 py-10">
      <div className="w-full max-w-md">
        <div className="space-y-2 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center border border-ink text-[10px] font-semibold tracking-[0.1em]">
            PT
          </div>
          <h1 className="text-[17px] font-semibold leading-tight tracking-[-0.01em]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-[12px] text-muted leading-relaxed">
              {subtitle}
            </p>
          ) : null}
          {brandLine ? (
            <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-dim">
              {brandLine}
            </p>
          ) : null}
        </div>
        <div className="border-t border-rule mt-6 pt-5">{children}</div>
      </div>
    </div>
  )
}
