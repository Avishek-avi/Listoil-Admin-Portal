export class Sku {
    constructor(
        public skuId: number,
        public skuCode: string,
        public skuDescription: string,
        public skuPoints: number,
        public isSkuActive: boolean,
        public createdAt: Date
    ) { }
}