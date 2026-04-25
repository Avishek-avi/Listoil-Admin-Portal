import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getRoleDataAction } from '@/actions/role-actions'
import RolesClient from './RolesClient'

export default async function RoleManagementPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['role-data', '', '', ''],
    queryFn: () => getRoleDataAction(),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RolesClient />
    </HydrationBoundary>
  )
}