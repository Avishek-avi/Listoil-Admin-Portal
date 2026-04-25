import { CustomError, GenerateQrPayload } from "../types";

export class CustomValidators {
  customError: CustomError;
  constructor() {
    this.customError = new CustomError({
      responseMessage: "",
      responseCode: 400,
      statusCode: 200,
    });
  }

  generateQrValidation(payload: GenerateQrPayload) {
    if (!payload.quantity || typeof payload.quantity !== 'number' || payload.quantity <= 0) {
      this.customError.responseMessage = `Quantity must be a positive number`;
      throw this.customError;
    }

    if (!payload.skuCode || payload.skuCode.trim().length === 0) {
      this.customError.responseMessage = `SKU Code is required`;
      throw this.customError;
    }

    if (!payload.type || (payload.type !== 'inner' && payload.type !== 'outer')) {
      this.customError.responseMessage = `Type is required and must be either 'inner' or 'outer'`;
      throw this.customError;
    }

    return new GenerateQrPayload(payload);
  }

}



export const customValidators = new CustomValidators();
