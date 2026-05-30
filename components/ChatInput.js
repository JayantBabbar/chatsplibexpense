import { useState, useRef } from 'react'
import { IoSend, IoHappy, IoAttach } from 'react-icons/io5'
import AttachmentMenu from './AttachmentMenu'

export default function ChatInput({ onSendMessage, onOpenExpense, placeholder = "Type a message..." }) {
  const [message, setMessage] = useState('')
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const textareaRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInput = (e) => {
    setMessage(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div className="bg-wa-bg-panel px-2 sm:px-4 py-1.5 sm:py-2 relative safe-bottom">
      {/* Attachment Menu */}
      <AttachmentMenu
        isOpen={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onSelectExpense={onOpenExpense}
      />

      <form onSubmit={handleSubmit} className="flex items-end gap-1 sm:gap-2">
        {/* Emoji/Attach buttons */}
        <div className="flex gap-0 mb-1 sm:mb-1.5 flex-shrink-0">
          <button
            type="button"
            className="p-1.5 sm:p-2 text-wa-text-secondary hover:text-wa-icon transition-colors"
            title="Emoji"
          >
            <IoHappy size={22} className="sm:w-6 sm:h-6" />
          </button>
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className={`p-1.5 sm:p-2 transition-colors ${
              showAttachmentMenu ? 'text-wa-accent' : 'text-wa-text-secondary hover:text-wa-icon'
            }`}
            title="Attach"
          >
            <IoAttach size={22} className="rotate-45 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Message input */}
        <div className="flex-1 relative min-w-0">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full bg-wa-bg-input text-wa-text-light rounded-lg px-3 py-[9px] pr-4 resize-none focus:outline-none placeholder-wa-text-secondary max-h-[120px] text-[15px] scrollbar-thin"
            style={{ minHeight: '40px' }}
          />
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim()}
          className={`p-2 sm:p-[10px] rounded-full mb-0.5 sm:mb-1 transition-all flex-shrink-0 ${
            message.trim()
              ? 'text-wa-accent hover:bg-wa-bg-hover'
              : 'text-wa-text-secondary cursor-not-allowed'
          }`}
        >
          <IoSend size={20} className="sm:w-[22px] sm:h-[22px]" />
        </button>
      </form>
    </div>
  )
}
