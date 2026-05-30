import { useState, useRef, useEffect } from 'react'
import { IoClose, IoDocument, IoImage, IoCamera, IoReceipt, IoPerson, IoLocation } from 'react-icons/io5'

export default function AttachmentMenu({ isOpen, onClose, onSelectExpense }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const menuItems = [
    {
      icon: IoReceipt,
      label: 'Expense',
      color: 'bg-purple-500',
      onClick: () => {
        onSelectExpense()
        onClose()
      }
    },
    {
      icon: IoDocument,
      label: 'Document',
      color: 'bg-blue-500',
      onClick: () => {
        console.log('Document selected')
        onClose()
      }
    },
    {
      icon: IoCamera,
      label: 'Camera',
      color: 'bg-pink-500',
      onClick: () => {
        console.log('Camera selected')
        onClose()
      }
    },
    {
      icon: IoImage,
      label: 'Gallery',
      color: 'bg-purple-600',
      onClick: () => {
        console.log('Gallery selected')
        onClose()
      }
    },
    {
      icon: IoPerson,
      label: 'Contact',
      color: 'bg-cyan-500',
      onClick: () => {
        console.log('Contact selected')
        onClose()
      }
    },
    {
      icon: IoLocation,
      label: 'Location',
      color: 'bg-green-500',
      onClick: () => {
        console.log('Location selected')
        onClose()
      }
    }
  ]

  return (
    <div className="absolute bottom-12 sm:bottom-14 left-0 sm:left-4 right-0 sm:right-auto z-50 px-3 sm:px-0">
      <div
        ref={menuRef}
        className="bg-wa-bg-dropdown rounded-2xl shadow-2xl p-3 animate-slideUp border border-wa-border w-full sm:w-auto"
      >
        <div className="grid grid-cols-3 gap-3 sm:w-56">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="flex flex-col items-center gap-1.5 p-2 hover:bg-wa-bg-hover rounded-xl transition-colors"
            >
              <div className={`${item.color} p-2.5 rounded-full`}>
                <item.icon size={22} className="text-white" />
              </div>
              <span className="text-[11px] text-wa-text-secondary">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
