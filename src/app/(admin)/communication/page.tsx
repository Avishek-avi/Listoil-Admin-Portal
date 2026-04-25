import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getCommunicationDataAction } from '@/actions/communication-actions'
import CommunicationClient from './CommunicationClient'

export default async function CommunicationPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['communication-messages'],
    queryFn: getCommunicationDataAction,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CommunicationClient />
    </HydrationBoundary>
  )
}