import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getTicketsAction } from '@/actions/ticket-actions'
import TicketsClient from './TicketsClient'

// This is a Server Component
export default async function TicketsPage() {
    const queryClient = new QueryClient()

    // Prefetch data on the server
    await queryClient.prefetchQuery({
        queryKey: ['tickets'],
        queryFn: () => getTicketsAction(),
    })

    // Dehydrate the state to send to the client
    // The client component <TicketsClient /> will pick up this data automatically
    // via useQuery({ queryKey: ['tickets'] })
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <TicketsClient />
        </HydrationBoundary>
    )
}
