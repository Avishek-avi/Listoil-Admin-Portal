import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    S3,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AwsConfig, CustomError, CustomMulterFilesField } from "../../types";
import multer, { Multer } from "multer";
import {
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET_NAME,
    AWS_REGION,
    AWS_SECRET_ACCESS_KEY,
    AWS_SIGNED_URL_EXPIRY,
    FILE_SIZE,
} from "../configs/config";
import { RequestHandler } from "express";
import { getFileUrl } from "../../lib/utils/random";

export class FileMiddleware {
    private static instance: FileMiddleware | null = null;
    private s3Client: S3Client;
    private bucketName: string;
    multerInstance: Multer;
    customError: CustomError;
    constructor() {
        this.customError = new CustomError({
            responseMessage: "",
            responseCode: 503,
        });

        const awsConfig = {
            accessKey: AWS_ACCESS_KEY_ID,
            secrectKey: AWS_SECRET_ACCESS_KEY,
            bucketName: AWS_BUCKET_NAME,
            region: AWS_REGION,
        };
        if (
            !awsConfig.accessKey ||
            !awsConfig.bucketName ||
            !awsConfig.region ||
            !awsConfig.secrectKey
        ) {
            console.warn("File storage service configuration missing. File uploads will fail.");
        }

        try {
            this.s3Client = new S3({
                region: awsConfig.region,
                credentials: {
                    accessKeyId: awsConfig.accessKey || '',
                    secretAccessKey: awsConfig.secrectKey || '',
                },
            });
        } catch (err) {
            console.warn("Failed to initialize S3 client:", err);
            // Don't throw here to allow build to proceed
            this.s3Client = {} as any;
        }

        this.bucketName = awsConfig.bucketName || '';

        this.multerInstance = multer({
            storage: multer.memoryStorage(),
            limits: { fileSize: FILE_SIZE },
        });
    }

    public static initialize(config: AwsConfig): void {
        if (!this.instance) {
            this.instance = new FileMiddleware();
        }
    }

    public static getInstance(): FileMiddleware {
        if (!this.instance) {
            throw new CustomError({
                responseMessage: "Something went wrong on File Storage Service",
                responseCode: 500,
            });
        }
        return this.instance;
    }

    async uploadFile(file: Express.Multer.File, type: string): Promise<string> {
        console.log("Uploading file to S3:", file.originalname, "Type:", type);
        const fileName = `${Date.now()}_${file.originalname}`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: getFileUrl(type) + fileName,
            Body: file.buffer,
            ContentType: type == "qrFile" ? "application/octet-stream" : file.mimetype,
        });
        console.log('******', getFileUrl(type) + fileName,)
        try {
            await this.s3Client.send(command);
            return fileName;
        } catch (error) {
            this.customError.responseMessage = "File Upload issue, Please try again";
            this.customError.responseCode = 500;
            throw this.customError;
        }
    }

    async getFileSignedUrl(fileName: string, type: string, expiry: number = AWS_SIGNED_URL_EXPIRY): Promise<string> {
        console.log('fileName', fileName)
        console.log('type', type)
        console.log('expiry', expiry)
        console.log('bucketName', this.bucketName)

        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: getFileUrl(type) + fileName,
        });

        try {
            const signedUrl = await getSignedUrl(this.s3Client, command, {
                expiresIn: expiry,
            });
            return signedUrl;
        } catch (error) {
            this.customError.responseMessage = "Issue on file url, Please try again";
            this.customError.responseCode = 500;
            throw this.customError;
        }
    }

    acceptMultipleFields = (fields: CustomMulterFilesField[]) => {
        return this.multerInstance.fields(fields) as unknown as RequestHandler;
    };

    acceptSingleFile = (field: string) => {
        return this.multerInstance.single(field) as unknown as RequestHandler;
    };

    acceptMulitpleFiles = (field: string) => {
        return this.multerInstance.array(field) as unknown as RequestHandler;
    };

    acceptAny = () => {
        return this.multerInstance.any() as unknown as RequestHandler;
    }

    acceptNone() {
        return this.multerInstance.none() as unknown as RequestHandler;
    }
}

export const fileMiddleware = new FileMiddleware();