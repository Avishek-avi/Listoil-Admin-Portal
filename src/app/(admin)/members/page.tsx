import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import { getMembersDataAction } from '@/actions/member-actions'
import MembersClient from './MembersClient'

export const dynamic = 'force-dynamic'

export default async function MembersPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['members-data', '', 'All Status', 'All Regions'],
    queryFn: () => getMembersDataAction({ searchQuery: '', kycStatus: 'All Status', region: 'All Regions' }),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MembersClient />
    </HydrationBoundary>
  )
}