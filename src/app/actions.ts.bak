// app/bootstrap/actions.ts
"use server";

import { db } from "@/db/index";
import {
  client,
  userTypeLevelMaster,
  userTypeEntity,
  skuLevelMaster,
  skuEntity,
  skuVariant,
  skuPointConfig,
  locationLevelMaster,
  locationEntity,
} from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createClient(formData: FormData) {
  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || null;
  await db.insert(client).values({ name, code });
  revalidatePath("/bootstrap");
}

export async function createUserTypeLevel(formData: FormData) {
  const levelNo = parseInt(formData.get("levelNo") as string);
  const levelName = formData.get("levelName") as string;
  const parentLevelId = formData.get("parentLevelId")
    ? parseInt(formData.get("parentLevelId") as string)
    : null;
  await db.insert(userTypeLevelMaster).values({ levelNo, levelName, parentLevelId });
  revalidatePath("/bootstrap");
}

export async function createUserTypeEntity(formData: FormData) {
  const levelId = parseInt(formData.get("levelId") as string);
  const typeName = formData.get("typeName") as string;
  const parentTypeId = formData.get("parentTypeId")
    ? parseInt(formData.get("parentTypeId") as string)
    : null;
  await db.insert(userTypeEntity).values({ levelId, typeName, parentTypeId, isActive: true });
  revalidatePath("/bootstrap");
}

export async function createSkuLevel(formData: FormData) {
  const clientId = parseInt(formData.get("clientId") as string);
  const levelNo = parseInt(formData.get("levelNo") as string);
  const levelName = formData.get("levelName") as string;
  const parentLevelId = formData.get("parentLevelId")
    ? parseInt(formData.get("parentLevelId") as string)
    : null;
  await db.insert(skuLevelMaster).values({ clientId, levelNo, levelName, parentLevelId });
  revalidatePath("/bootstrap");
}

export async function createSkuEntity(formData: FormData) {
  const clientId = parseInt(formData.get("clientId") as string);
  const levelId = parseInt(formData.get("levelId") as string);
  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || null;
  const parentEntityId = formData.get("parentEntityId")
    ? parseInt(formData.get("parentEntityId") as string)
    : null;
  await db.insert(skuEntity).values({ clientId, levelId, name, code, parentEntityId, isActive: true });
  revalidatePath("/bootstrap");
}

export async function createSkuVariant(formData: FormData) {
  const skuEntityId = parseInt(formData.get("skuEntityId") as string);
  const variantName = formData.get("variantName") as string;
  const packSize = (formData.get("packSize") as string) || null;
  const mrp = parseFloat(formData.get("mrp") as string);
  await db.insert(skuVariant).values({ skuEntityId, variantName, packSize, mrp, isActive: true });
  revalidatePath("/bootstrap");
}

export async function createSkuPointConfig(formData: FormData) {
  const clientId = parseInt(formData.get("clientId") as string);
  const skuVariantId = parseInt(formData.get("skuVariantId") as string);
  const userTypeId = parseInt(formData.get("userTypeId") as string);
  const pointsPerUnit = parseFloat(formData.get("pointsPerUnit") as string);
  await db.insert(skuPointConfig).values({
    clientId,
    skuVariantId,
    userTypeId,
    pointsPerUnit: pointsPerUnit.toString(),
  });
  revalidatePath("/bootstrap");
}

export async function createLocationLevel(formData: FormData) {
  const clientId = parseInt(formData.get("clientId") as string);
  const levelNo = parseInt(formData.get("levelNo") as string);
  const levelName = formData.get("levelName") as string;
  const parentLevelId = formData.get("parentLevelId")
    ? parseInt(formData.get("parentLevelId") as string)
    : null;
  await db.insert(locationLevelMaster).values({ clientId, levelNo, levelName, parentLevelId });
  revalidatePath("/bootstrap");
}

export async function createLocationEntity(formData: FormData) {
  const clientId = parseInt(formData.get("clientId") as string);
  const levelId = parseInt(formData.get("levelId") as string);
  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || null;
  const parentEntityId = formData.get("parentEntityId")
    ? parseInt(formData.get("parentEntityId") as string)
    : null;
  await db.insert(locationEntity).values({ clientId, levelId, name, code, parentEntityId });
  revalidatePath("/bootstrap");
}