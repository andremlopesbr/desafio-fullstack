import React from 'react'

interface NotificationProps {
  type: 'success' | 'error' | 'info'
  message: string
  onClose?: () => void
  autoHide?: boolean
  className?: string
}

const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose,
  autoHide = false,
  className = ''
}) => {
  const baseStyles = 'px-4 py-3 rounded mb-4 flex justify-between items-center border'

  const typeStyles = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700'
  }

  React.useEffect(() => {
    if (autoHide && onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [autoHide, onClose])

  return (
    <div className={`${baseStyles} ${typeStyles[type]} ${className}`}>
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className={`ml-4 hover:${
            type === 'success'
              ? 'text-green-900'
              : type === 'error'
                ? 'text-red-900'
                : 'text-blue-900'
          } transition-colors`}
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default Notification
