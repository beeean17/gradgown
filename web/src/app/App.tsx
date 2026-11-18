import { RouterProvider } from 'react-router-dom'
import { ThemeModeProvider } from '../shared/theme/ThemeModeContext'
import { router } from './router'

export default function App() {
  return (
    <ThemeModeProvider>
      <RouterProvider router={router} />
    </ThemeModeProvider>
  )
}
