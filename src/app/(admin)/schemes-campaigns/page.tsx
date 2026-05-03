import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getSchemesAction } from '@/actions/schemes-actions'
import SchemesClient from './SchemesClient'

export default async function SchemesPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['schemes-data'],
    queryFn: getSchemesAction,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SchemesClient />
    </HydrationBoundary>
  )
}
