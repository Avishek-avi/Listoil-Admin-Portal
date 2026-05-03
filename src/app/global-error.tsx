'use client'

import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[global] unhandled error', error)
    }, [error])

    return (
        <html>
            <body>
                <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
                    <h2>Application error</h2>
                    <p>{error.message || 'An unexpected error occurred.'}</p>
                    {error.digest && <p style={{ color: '#888' }}>Ref: {error.digest}</p>}
                    <button
                        onClick={reset}
                        style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
