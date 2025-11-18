import { RouteObject } from 'react-router-dom'
import { ChatView, ChatList } from '@pages'
import {
  Default,
  ChatView as ChatViewLayout,
} from '@layouts'
import { ChatViewFeature } from '@features'

export const mobileChatRouter: Array<RouteObject> =
  [
    {
      path: '/chat/:id',
      element: (
        <Default>
          <ChatView />
        </Default>
      ),
    },
    {
      path: '/chat',
      element: (
        <Default>
          <ChatList />
        </Default>
      ),
    },
  ]

export const defaultChatRouter: Array<RouteObject> =
  [
    {
      path: '/chat',
      Component: ChatViewLayout,
      children: [
        {
          path: ':id',
          Component: ChatViewFeature,
        },
      ],
    },
  ]
