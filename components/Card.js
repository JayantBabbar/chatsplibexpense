export default function Card({ children, className = '', onClick, hoverable = false }) {
  const hoverClass = hoverable ? 'hover:bg-whatsapp-hover cursor-pointer transition-colors' : ''
  
  return (
    <div 
      className={`bg-whatsapp-bg-message-in rounded-lg p-4 ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
