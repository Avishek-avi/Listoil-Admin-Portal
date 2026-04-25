'use server'

import { fileMiddleware } from "@/server/middlewares/file-middleware";
import { getFileUrl } from "@/lib/utils/random";

export async function uploadFileAction(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const type = formData.get('type') as string || 'creatives';

        if (!file) {
            return { success: false, error: "No file provided" };
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Mocking the Express.Multer.File object for uploadFile
        const mockedFile = {
            buffer,
            originalname: file.name,
            mimetype: file.type,
            size: file.size,
        } as Express.Multer.File;

        const fileName = await fileMiddleware.uploadFile(mockedFile, type);

        const bucket = process.env.AWS_BUCKET_NAME;
        const region = process.env.AWS_REGION;

        if (!bucket || !region) {
            throw new Error("AWS_BUCKET_NAME or AWS_REGION not configured in environment");
        }

        const key = getFileUrl(type) + fileName;
        const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

        return {
            success: true,
            fileName,
            url: url
        };
    } catch (error) {
        console.error("Error in uploadFileAction:", error);
        return { success: false, error: "Failed to upload file" };
    }
}
