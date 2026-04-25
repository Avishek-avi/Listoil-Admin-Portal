
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from 'pg';
import * as schema from "./schema";

async function checkData() {
    const pool = new Pool({
        connectionString: 'postgresql://dbadmin:HNzY2ajBqN6gCCL@10.0.1.149:5432/sturlite',
    });
    const db = drizzle(pool, { schema });

    try {
        console.log('--- USERS ---');
        const u = await db.select().from(schema.users).limit(3);
        console.log(JSON.stringify(u, null, 2));

        console.log('--- RETAILERS ---');
        const r = await db.select().from(schema.retailers).limit(3);
        console.log(JSON.stringify(r, null, 2));

        console.log('--- ELECTRICIANS ---');
        const e = await db.select().from(schema.electricians).limit(3);
        console.log(JSON.stringify(e, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

checkData();
