export class CreateExchangeRequest {
    constructor(
        public name: string,
        public type: string
    ) { }
}

export class BrokerResponse {
    constructor(
        public status: boolean,
        public message: string,
        public transactionId: string
    ) { }
}

export class PublishRequest {
    constructor(
        public exchange: string,
        public payload: any,
        public binding_key: string,
        public type: string
    ) { }
}

export class CustomErrorRabbitMq extends Error {
    constructor(public name: string, public message: string, public status: boolean) {
        super();
    }
}



