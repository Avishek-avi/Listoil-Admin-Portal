import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'

export const dynamic = 'force-dynamic'
import { getProcessDataAction } from "@/actions/process-actions";
import ProcessClient from "./ProcessClient";

export default async function ProcessPage() {
    const queryClient = new QueryClient()

    // Prefetch data on the server
    await queryClient.prefetchQuery({
        queryKey: ['process-data'],
        queryFn: () => getProcessDataAction(),
    })

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ProcessClient />
        </HydrationBoundary>
    )
}
