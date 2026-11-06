export function ProgressBar({
  value,
  className = '',
}: {
  value: number
  className?: string
}) {
  const safe = Math.min(100, Math.max(0, value))

  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}
    >
      <div
        className="h-full rounded-full bg-indigo-600 transition-all duration-300"
        style={{ width: `${safe}%` }}
      />
    </div>
  )
}
