import { RouteObject } from 'react-router-dom'
import {
  Login,
  Registration,
  Main,
  CreateChat,
} from '@pages'
import { Default } from '@layouts'

export const publicRouter: Array<RouteObject> = [
  {
    path: '/account',
    element: <Default>account</Default>,
  },
  {
    path: '/login',
    element: (
      <Default>
        <Login />
      </Default>
    ),
  },
  {
    path: '/reg',
    element: (
      <Default>
        <Registration />
      </Default>
    ),
  },
  {
    path: '/',
    element: (
      <Default>
        <Main />
      </Default>
    ),
  },
  {
    path: '/chat-create',
    element: (
      <Default>
        <CreateChat />
      </Default>
    ),
  },
  {
    path: '*',
    element: <>not found page</>,
  },
]
