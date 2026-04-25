import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getSchemesDataAction } from '@/actions/schemes-actions'
import SchemesClient from './SchemesClient'

export default async function SchemesPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['schemes-data'],
    queryFn: getSchemesDataAction,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SchemesClient />
    </HydrationBoundary>
  )
}