import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";

config({ path: ".env" });

const migrationClient = postgres(process.env.DATABASE_URL as string, {
    max: 1,
});

async function syncDatabase() {
    try {
        console.log("DATABASE_URL =", process.env.DATABASE_URL);
        console.log("Starting migration...");
        await migrate(drizzle(migrationClient), {
            migrationsFolder: path.join(process.cwd(), "drizzle"),
        });
        console.log("Migration completed.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await migrationClient.end();
        console.log("Done 😃✅✅✅");
    }
}

syncDatabase();
