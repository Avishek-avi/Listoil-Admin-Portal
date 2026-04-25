import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getEventBusSummaryAction } from '@/actions/eventbus-actions'
import EventBusClient from './EventBusClient'

export default async function EventBusPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['eventbus-summary'],
    queryFn: getEventBusSummaryAction,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EventBusClient />
    </HydrationBoundary>
  )
}
