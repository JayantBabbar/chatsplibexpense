export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  disabled = false,
  type = 'button',
  className = ''
}) {
  const baseClasses = 'rounded-lg font-medium transition-colors duration-200 flex items-center justify-center'
  
  const variantClasses = {
    primary: 'bg-whatsapp-green hover:bg-whatsapp-green-dark text-white',
    secondary: 'bg-whatsapp-bg-input hover:bg-whatsapp-hover text-whatsapp-text-primary',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'hover:bg-whatsapp-hover text-whatsapp-text-primary',
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  const widthClass = fullWidth ? 'w-full' : ''
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass} ${className}`}
    >
      {children}
    </button>
  )
}
