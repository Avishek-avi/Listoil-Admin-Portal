
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { db } from "../db";
import { users, userTypeEntity, userTypeLevelMaster } from "../db/schema";
import { eq, or, inArray } from "drizzle-orm";

async function findAdmin() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  console.log("Searching for admin users...");
  try {
    const adminUsers = await db
      .select({
        email: users.email,
        phone: users.phone,
        level: userTypeLevelMaster.levelName,
      })
      .from(users)
      .leftJoin(userTypeEntity, eq(users.roleId, userTypeEntity.id))
      .leftJoin(userTypeLevelMaster, eq(userTypeEntity.levelId, userTypeLevelMaster.id))
      .where(
        inArray(userTypeLevelMaster.levelName, ['Master Admin', 'Admin', 'System Admin'])
      )
      .limit(10);

    console.log("Admin Users Found:");
    console.log(JSON.stringify(adminUsers, null, 2));
  } catch (error) {
    console.error("Error finding admin users:", error);
  } finally {
    process.exit(0);
  }
}

findAdmin();
