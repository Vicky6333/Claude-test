export function LoadingSpinner({ size = 'md', text }) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }[size]
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
      <svg className={`animate-spin ${sizeClass} text-sky-600`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text && <span className="text-sm">{text}</span>}
    </div>
  )
}
