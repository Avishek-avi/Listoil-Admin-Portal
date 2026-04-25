import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getMastersDataAction } from '@/actions/masters-actions'
import MastersClient from './MastersClient'

export default async function MastersConfigPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['masters-data'],
    queryFn: getMastersDataAction,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MastersClient />
    </HydrationBoundary>
  )
}