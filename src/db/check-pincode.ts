
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from 'pg';
import * as schema from "./schema";
import { eq } from 'drizzle-orm';

async function checkPincode() {
    const pool = new Pool({
        connectionString: 'postgresql://dbadmin:HNzY2ajBqN6gCCL@10.0.1.149:5432/sturlite',
    });
    const db = drizzle(pool, { schema });

    try {
        console.log('--- PINCODE 560083 ---');
        const p = await db.select().from(schema.pincodeMaster).where(eq(schema.pincodeMaster.pincode, '560083'));
        console.log(JSON.stringify(p, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

checkPincode();
