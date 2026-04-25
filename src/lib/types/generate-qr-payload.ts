export class GenerateQrPayload {
    quantity: number;
    skuCode: string;
    type: 'inner' | 'outer';

    constructor(data: GenerateQrPayload) {
        if (!data || typeof data.quantity !== "number" || data.quantity <= 0) {
            throw new Error("quantity is required and must be a positive number");
        }

        if (!data.skuCode || data.skuCode.trim() === "") {
            throw new Error("skuCode is required and cannot be empty");
        }

        if (!data.type || (data.type !== 'inner' && data.type !== 'outer')) {
            throw new Error("type is required and must be either 'inner' or 'outer'");
        }

        this.quantity = data.quantity;
        this.skuCode = data.skuCode.trim();
        this.type = data.type;
    }
}
export class FetchQrCodeFromOpenSourceApiRequest {
    constructor(
        public data: string,
        public ecc: string,
        public margin: string,
        public format: string,
        public size: string,
        public qzone: string,
    ) { }
}

