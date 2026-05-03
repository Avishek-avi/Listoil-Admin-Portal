'use client'

import { useEffect } from 'react'

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[admin] route error', error)
        // TODO: hand off to Sentry / monitoring once DSN is provisioned.
    }, [error])

    return (
        <div className="flex min-h-[60vh] items-center justify-center p-8">
            <div className="max-w-md text-center">
                <h2 className="mb-2 text-xl font-semibold text-gray-900">Something went wrong</h2>
                <p className="mb-4 text-sm text-gray-600">
                    {error.message || 'An unexpected error occurred while loading this page.'}
                </p>
                {error.digest && (
                    <p className="mb-4 text-xs text-gray-400">Reference: {error.digest}</p>
                )}
                <button
                    onClick={reset}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Try again
                </button>
            </div>
        </div>
    )
}
