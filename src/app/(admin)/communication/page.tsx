import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getCommunicationDataAction } from '@/actions/communication-actions'
import CommunicationClient from './CommunicationClient'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function CommunicationPage() {
  const session = await auth();
  if (!session?.user?.permissions?.includes('all') && !session?.user?.permissions?.includes('communication.manage')) {
    redirect('/dashboard');
  }

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
