export abstract class BaseMQConnector {
    abstract publish(topic: string, payload: any): Promise<void>;
    abstract subscribe(topic: string, handler: (payload: any) => Promise<void>): Promise<void>;
    abstract close(): Promise<void>;
}
