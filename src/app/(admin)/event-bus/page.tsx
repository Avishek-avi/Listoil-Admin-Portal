import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getEventBusSummaryAction } from '@/actions/eventbus-actions'
import EventBusClient from './EventBusClient'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function EventBusPage() {
  const session = await auth();
  if (!session?.user?.permissions?.includes('all') && !session?.user?.permissions?.includes('eventbus.view')) {
    redirect('/dashboard');
  }

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
