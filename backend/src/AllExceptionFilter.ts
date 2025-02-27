import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { Response } from "express";

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionFilter.name)

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        
        let status = 500;
        let message = 'Unexpected Error';
        let name = 'Internal Server Error';

        if(exception instanceof HttpException) {
            const exceptionResponse = exception.getResponse();

            status = exception.getStatus();

            if(typeof exceptionResponse === 'object') {
                const { name: errorName, message: errorMessage } = exceptionResponse as any;

                name = errorName;
                message = errorMessage;
            } else if(typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
        } else {
            this.logger.error('Unhandled Exception', exception)
            message = exception.message || 'Unexpected Error';
        }

        response.status(status).json({
            statusCode: status,
            name,
            message,
            timeStamp: new Date().toISOString(),
        })

    }
}