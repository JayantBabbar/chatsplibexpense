import { useUser, TEST_USERS } from '../context/UserContext'
import { useTheme } from '../context/ThemeContext'
import { IoSunny, IoMoon } from 'react-icons/io5'

export default function UserBanner() {
  const { currentUser, setCurrentUser } = useUser()
  const { theme, toggleTheme } = useTheme()

  const currentKey = Object.keys(TEST_USERS).find(
    (k) => TEST_USERS[k].id === currentUser.id
  ) || 'aarav'

  const switchUser = (key) => {
    setCurrentUser(key)
  }

  return (
    <div className="bg-wa-bg-panel border-b border-wa-border-subtle px-3 py-1 flex items-center justify-between flex-shrink-0 safe-top select-none text-[11px] sm:text-xs">
      {/* Current User Pill */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="w-1.5 h-1.5 rounded-full bg-wa-accent animate-pulse flex-shrink-0" />
        <span className="font-medium text-wa-text-secondary truncate">
          <span className="hidden sm:inline">User: </span>
          <span className="text-wa-text font-semibold">{currentUser.display_name}</span>
        </span>
      </div>

      {/* Switch Buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] text-wa-text-muted hidden md:inline uppercase tracking-wider font-semibold">Test accounts:</span>
        <div className="flex items-center gap-1">
          {Object.entries(TEST_USERS).map(([key, user]) => {
            const isSelected = currentUser.id === user.id
            return (
              <button
                key={key}
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  switchUser(key)
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-wa-accent text-white font-semibold'
                    : 'bg-wa-bg-input text-wa-text-secondary hover:bg-wa-bg-hover hover:text-wa-text'
                }`}
              >
                {user.display_name.split(' ')[0]}
              </button>
            )
          })}
        </div>

        <span className="w-px h-3.5 bg-wa-border-subtle mx-0.5" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1 rounded-md text-wa-text-secondary hover:text-wa-text hover:bg-wa-bg-hover transition-colors active:scale-95 flex items-center justify-center"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <IoSunny size={14} /> : <IoMoon size={14} />}
        </button>
      </div>
    </div>
  )
}
