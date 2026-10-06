import Browse from './screens/Browse'
import Home from './screens/Home'
import OpeningList from './screens/OpeningList'
import Practice from './screens/Practice'
import Review from './screens/Review'
import Settings from './screens/Settings'
import { AppProvider, useApp } from './state'

function Router() {
  const { screen } = useApp()
  switch (screen.name) {
    case 'home':
      return <Home />
    case 'list':
      return <OpeningList />
    case 'browse':
      return <Browse key={screen.openingId} openingId={screen.openingId} />
    case 'practice':
      return <Practice key={`${screen.openingId}-${screen.side}`} openingId={screen.openingId} side={screen.side} />
    case 'review':
      return <Review />
    case 'settings':
      return <Settings />
  }
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  )
}
