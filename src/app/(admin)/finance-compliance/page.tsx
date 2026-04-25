import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getFinanceDataAction } from '@/actions/finance-actions'
import FinanceClient from './FinanceClient'

export default async function FinancePage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['finance-data'],
    queryFn: () => getFinanceDataAction(),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FinanceClient />
    </HydrationBoundary>
  )
}