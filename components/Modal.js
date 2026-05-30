import { useEffect } from 'react'
import { IoClose } from 'react-icons/io5'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 sm:bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal — full screen on mobile, centered card on desktop */}
      <div className={`relative bg-wa-bg-panel w-full h-full sm:h-auto sm:rounded-lg shadow-xl ${maxWidthClasses[maxWidth]} sm:max-h-[90vh] flex flex-col safe-top`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 border-b border-wa-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-wa-bg-hover rounded-full transition-colors -ml-1"
            >
              <IoClose size={22} className="text-wa-icon" />
            </button>
            <h2 className="text-[16px] sm:text-lg font-semibold text-wa-text">{title}</h2>
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto flex-1 scrollbar-thin min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
}
