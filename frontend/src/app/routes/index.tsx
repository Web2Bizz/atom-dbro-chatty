import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom'
import { publicRouter } from './public'
import { defaultChatRouter } from './chat'

export const RouterApp = () => {
  const router = createBrowserRouter([
    ...publicRouter,
    ...defaultChatRouter,
  ])

  return (
    <RouterProvider
      router={router}
    ></RouterProvider>
  )
}
