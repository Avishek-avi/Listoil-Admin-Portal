import { HydrationBoundary, dehydrate, QueryClient } from '@tanstack/react-query';

export const dynamic = 'force-dynamic'
import { getConfigurationAction } from '@/actions/configuration-actions';
import ConfigurationClient from './ConfigurationClient';

export default async function ConfigurationPage() {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery({
        queryKey: ['configuration'],
        queryFn: getConfigurationAction
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ConfigurationClient />
        </HydrationBoundary>
    );
}
