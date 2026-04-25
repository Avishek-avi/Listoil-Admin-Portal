import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getMisAnalyticsAction } from '@/actions/mis-actions'
import MisClient from './MisClient'

export default async function MisPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['mis-analytics'],
    queryFn: () => getMisAnalyticsAction(),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MisClient />
    </HydrationBoundary>
  )
}