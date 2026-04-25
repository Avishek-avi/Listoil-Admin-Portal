import dotenv from "dotenv";
dotenv.config();

export const TEMP_TOKEN_EXPIRATION = "5m";
export const JWT_SECRET = process.env.JWT_SECRET as string;
export const CUSTOMER_JWT_SECRET = process.env.CUSTOMER_JWT_SECRET as string;
export const ACCESSS_TOKEN_SECRET = process.env.ACCESSS_TOKEN_SECRET as string;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string;
export const ACCESSS_TOKEN_EXPIRY = process.env.ACCESSS_TOKEN_EXPIRY as string;
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY as string;
export const CUSTOMER_TOKEN_EXPIRY = process.env.CUSTOMER_TOKEN_EXPIRY as string;
export const FILE_SIZE = 5 * 1024 * 1024;
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "" as string
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "" as string
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "" as string
export const AWS_REGION = process.env.AWS_REGION || "" as string
export const AWS_SIGNED_URL_EXPIRY = 600
export const SUREPASS_BASEURL = process.env.SUREPASS_BASEURL as string;
export const SUREPASS_TOKEN = process.env.SUREPASS_TOKEN as string;
