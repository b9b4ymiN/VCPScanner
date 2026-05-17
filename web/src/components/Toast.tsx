import { useState, useEffect, useCallback } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let addToastFn: ((message: string, type: Toast['type']) => void) | null = null
let nextId = 0

export function toast(message: string, type: Toast['type'] = 'info') {
  addToastFn?.(message, type)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((message: string, type: Toast['type']) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  useEffect(() => {
    addToastFn = add
    return () => { addToastFn = null }
  }, [add])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            padding: '12px 16px',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--bg-border)',
            borderRadius: 'var(--radius-lg)',
            font: '400 13px var(--font-ui)',
            color: 'var(--text-primary)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            animation: 'toast-in 200ms ease forwards',
            maxWidth: 320,
            borderLeft: t.type === 'success' ? '2px solid var(--green-400)' :
                        t.type === 'error' ? '2px solid var(--red-400)' :
                        '2px solid var(--orange-500)',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
