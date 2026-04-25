'use server'

export interface Message {
    id: string;
    type: 'email' | 'sms' | 'notification';
    subject: string;
    status: 'sent' | 'scheduled' | 'draft';
    recipients: number;
    openRate?: number;
    sentDate?: string;
    scheduledDate?: string;
}

const messagesData: Message[] = [
    {
        id: 'MSG001',
        type: 'email',
        subject: 'Special Summer Rewards',
        status: 'sent',
        recipients: 5000,
        openRate: 45,
        sentDate: '2023-07-01'
    },
    {
        id: 'MSG002',
        type: 'sms',
        subject: 'Double Points Weekend',
        status: 'scheduled',
        recipients: 10000,
        scheduledDate: '2023-07-15'
    },
    {
        id: 'MSG003',
        type: 'notification',
        subject: 'New Rewards Available',
        status: 'draft',
        recipients: 8000
    }
];

export async function getCommunicationDataAction(): Promise<Message[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return messagesData;
}
