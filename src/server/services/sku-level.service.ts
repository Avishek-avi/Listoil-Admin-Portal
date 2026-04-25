
import { skuLevelRepository } from "../repositories/sku-level-repository";

class SkuLevelService {
    async getL1() {
        return await skuLevelRepository.fetchL1();
    }

    async getL2(l1Id?: number) {
        return await skuLevelRepository.fetchL2(l1Id);
    }

    async getL3(l1Id?: number, l2Id?: number) {
        return await skuLevelRepository.fetchL3(l1Id, l2Id);
    }

    async getL4(l1Id?: number, l2Id?: number, l3Id?: number) {
        return await skuLevelRepository.fetchL4(l1Id, l2Id, l3Id);
    }

    async getL5(l1Id?: number, l2Id?: number, l3Id?: number, l4Id?: number) {
        return await skuLevelRepository.fetchL5(l1Id, l2Id, l3Id, l4Id);
    }

    async getL6(l1Id?: number, l2Id?: number, l3Id?: number, l4Id?: number, l5Id?: number) {
        return await skuLevelRepository.fetchL6(l1Id, l2Id, l3Id, l4Id, l5Id);
    }

    async getVariants(skuEntityId?: number) {
        return await skuLevelRepository.fetchVariants(skuEntityId);
    }
}

export const skuLevelService = new SkuLevelService();
