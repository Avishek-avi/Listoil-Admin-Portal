import { db } from './index';
import { skuEntity, skuVariant, skuPointConfig } from './schema';
import { eq } from 'drizzle-orm';

async function checkSku217() {
    // Check variants linked to skuEntity id=217 (which is 1224001)
    console.log('--- Variants linked to skuEntity 217 (1224001) ---');
    const variants = await db.select().from(skuVariant).where(eq(skuVariant.skuEntityId, 217));
    console.log(JSON.stringify(variants, null, 2));

    if (variants.length > 0) {
        for (const v of variants) {
            console.log(`\n--- Point config for variant ${v.id} ---`);
            const configs = await db.select().from(skuPointConfig).where(eq(skuPointConfig.skuVariantId, v.id));
            console.log(JSON.stringify(configs, null, 2));
        }
    } else {
        console.log('NO VARIANTS FOUND for 1224001. This is why points lookup fails.');
    }

    // Check parent chain
    console.log('\n--- Parent chain for skuEntity 217 ---');
    let currentId: number | null = 217;
    while (currentId) {
        const [entity] = await db.select().from(skuEntity).where(eq(skuEntity.id, currentId));
        if (!entity) break;
        console.log(`  L${entity.levelId}: id=${entity.id}, name="${entity.name}", code="${entity.code}", parent=${entity.parentEntityId}`);
        currentId = entity.parentEntityId;
    }

    process.exit(0);
}

checkSku217().catch(e => { console.error(e); process.exit(1); });
