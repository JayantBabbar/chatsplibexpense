import '../styles/globals.css'
import { UserProvider } from '../context/UserContext'
import { ThemeProvider } from '../context/ThemeContext'
import Head from 'next/head'

function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <UserProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        </Head>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <Component {...pageProps} />
          </div>
        </div>
      </UserProvider>
    </ThemeProvider>
  )
}

export default MyApp

