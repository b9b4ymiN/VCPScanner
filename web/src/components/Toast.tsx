import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, WarningCircle, Info } from '@phosphor-icons/react'
import styles from './Toast.module.css'

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
    <div className={styles.container} role="status">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`${styles.toast} ${styles[`toast${t.type.charAt(0).toUpperCase() + t.type.slice(1)}` as keyof typeof styles]}`}
          aria-live="polite"
        >
          <span className={styles.icon}>
            {t.type === 'success' ? <CheckCircle size={16} weight="fill" color="var(--green-400)" /> :
             t.type === 'error' ? <WarningCircle size={16} weight="fill" color="var(--red-400)" /> :
             <Info size={16} weight="fill" color="var(--orange-500)" />}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
