"use client";

import { useState } from 'react';

export function useNotification() {
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const removeNotification = () => {
        setNotification(null);
    };

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
    }

    return { notification, removeNotification, showNotification };
}
