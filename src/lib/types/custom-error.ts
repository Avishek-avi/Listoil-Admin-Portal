export class CustomError extends Error {
  statusCode: Number;
  responseCode: Number;
  responseMessage: string;
  constructor(data: Partial<CustomError>) {
    super(data?.responseMessage);
    this.statusCode = data?.statusCode || 200;
    this.responseCode = data?.responseCode || 500;
    this.responseMessage =
      data?.responseMessage || "Something went wrong, please try again";
  }
}