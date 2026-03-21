import { type RouteObject, useRoutes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { SchedulePage } from '@/pages/SchedulePage'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'schedule',
        element: <SchedulePage />,
      },
    ],
  },
]

export function AppRouter() {
  return useRoutes(routes)
}
