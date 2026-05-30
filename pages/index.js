import Head from 'next/head'
import { useUser } from '../context/UserContext'
import Sidebar from '../components/Sidebar'
import LoadingSpinner from '../components/LoadingSpinner'
import { IoWallet, IoLockClosed } from 'react-icons/io5'

export default function Home() {
  const { currentUser } = useUser()

  if (!currentUser) {
    return (
      <div className="flex-1 bg-wa-bg flex items-center justify-center min-h-0">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>WhatsApp Chats</title>
      </Head>

      <div className="flex-1 bg-wa-bg flex h-full w-full overflow-hidden min-h-0 relative">
        {/* ── Left Sidebar (Sidebar Chat List) ── */}
        {/* Takes full width on mobile, and 30% width (min 340px, max 400px) on desktop */}
        <div className="w-full md:w-[30%] md:min-w-[340px] md:max-w-[400px] flex-shrink-0 flex flex-col h-full border-r border-wa-border-subtle">
          <Sidebar activeGroupId={null} />
        </div>

        {/* ── Right Pane (Intro/Welcome Screen) ── */}
        {/* Hidden on mobile, flex container on desktop */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-wa-bg-deep text-center p-8 select-none relative">
          {/* Subtle background doodle grid */}
          <div 
            className="absolute inset-0 opacity-[0.015] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3Cstyle%3E.a%7Bfill:%23ffffff%7D%3C/style%3E%3C/defs%3E%3Cpath class='a' d='M20 20h8v8h-8zM60 40h6v6h-6zM120 20h10v10h-10zM160 60h8v8h-8zM40 100h6v6h-6zM100 80h8v8h-8zM140 120h6v6h-6zM20 140h8v8h-8zM80 160h10v10h-10zM160 140h8v8h-8zM60 180h6v6h-6zM120 170h8v8h-8z'/%3E%3Ccircle class='a' cx='180' cy='30' r='4'/%3E%3Ccircle class='a' cx='30' cy='70' r='3'/%3E%3Ccircle class='a' cx='90' cy='120' r='4'/%3E%3Ccircle class='a' cx='170' cy='100' r='3'/%3E%3Ccircle class='a' cx='50' cy='150' r='3'/%3E%3Ccircle class='a' cx='140' cy='180' r='4'/%3E%3C/svg%3E")`
            }}
          />

          <div className="max-w-md flex flex-col items-center z-10">
            {/* Elegant flat circle icon */}
            <div className="w-40 h-40 rounded-full bg-wa-bg-panel/40 flex items-center justify-center mb-7 border border-wa-border/20">
              <IoWallet size={72} className="text-wa-accent" />
            </div>

            <h2 className="text-[28px] sm:text-[32px] font-light text-wa-text mb-3 tracking-wide">
              WhatsApp Expense Splitter
            </h2>
            
            <p className="text-[14px] text-wa-text-secondary leading-relaxed max-w-sm">
              Split group expenses, track net balances, and settle debts instantly inside your chat conversations. No more awkward spreadsheets or reminders.
            </p>

            {/* Padlock status */}
            <div className="mt-12 border-t border-wa-border-subtle pt-6 w-full flex items-center justify-center gap-1.5 text-[12px] text-wa-text-muted">
              <IoLockClosed size={12} className="text-wa-text-muted" />
              <span>End-to-end encrypted group expenses</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
