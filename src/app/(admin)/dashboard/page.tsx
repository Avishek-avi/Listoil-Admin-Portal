import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getDashboardDataAction } from '@/actions/dashboard-actions'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['dashboard-data'],
    queryFn: () => getDashboardDataAction(),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  )
}