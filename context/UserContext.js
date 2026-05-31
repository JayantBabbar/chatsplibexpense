import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

const UserContext = createContext()

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}

// Demo users matching seed.sql — all members of the two seeded demo groups
const TEST_USERS = {
  alice: {
    id: '00000000-0000-0000-0000-000000000001',
    display_name: 'Aarav Sharma',
    email: 'aarav@demo.com',
    avatar_url: null,
  },
  bob: {
    id: '00000000-0000-0000-0000-000000000002',
    display_name: 'Priya Singh',
    email: 'priya@demo.com',
    avatar_url: null,
  },
  charlie: {
    id: '00000000-0000-0000-0000-000000000003',
    display_name: 'Rohan Verma',
    email: 'rohan@demo.com',
    avatar_url: null,
  },
  diana: {
    id: '00000000-0000-0000-0000-000000000004',
    display_name: 'Ananya Iyer',
    email: 'ananya@demo.com',
    avatar_url: null,
  },
}

export { TEST_USERS }

export const UserProvider = ({ children }) => {
  const router = useRouter()
  const [currentUser, setCurrentUserState] = useState(TEST_USERS.alice)

  useEffect(() => {
    if (!router.isReady) return

    const userParam = router.query.user
    const normalizedUser = Array.isArray(userParam) ? userParam[0] : userParam
    const nextUser = normalizedUser && TEST_USERS[normalizedUser] ? TEST_USERS[normalizedUser] : TEST_USERS.alice

    setCurrentUserState(nextUser)
  }, [router.isReady, router.query.user])

  const setCurrentUser = (nextUser) => {
    const nextKey =
      typeof nextUser === 'string'
        ? nextUser
        : Object.keys(TEST_USERS).find((key) => TEST_USERS[key].id === nextUser?.id)

    if (!nextKey || !TEST_USERS[nextKey]) {
      return
    }

    setCurrentUserState(TEST_USERS[nextKey])

    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, user: nextKey },
      },
      undefined,
      { shallow: true }
    )
  }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, TEST_USERS }}>
      {children}
    </UserContext.Provider>
  )
}

