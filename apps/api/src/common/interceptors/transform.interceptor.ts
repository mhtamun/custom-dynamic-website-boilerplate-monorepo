import { ServiceResult } from '@/common/interfaces';
import { ErrorService } from '@/util/error.service';
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Standard API Response Structure
 * Following NestJS best practices for consistent API responses
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path?: string;
}

/**
 * Transform Interceptor
 *
 * ERROR HANDLING STRATEGY:
 *
 * 1. SERVICE LAYER:
 *    - Handle BUSINESS LOGIC ERRORS (validation, not found, unauthorized)
 *    - Return ServiceResult with success: false for expected errors
 *    - DO NOT catch unexpected errors (DB connection, system errors)
 *    - Let unexpected errors bubble up to Exception Filter
 *
 * 2. THIS INTERCEPTOR:
 *    - Convert ServiceResult to ApiResponse
 *    - Convert ServiceResult errors to HttpException
 *    - DO NOT catch exceptions - let them bubble to Exception Filter
 *    - Only handles ServiceResult conversion
 *
 * 3. EXCEPTION FILTER:
 *    - Handles ALL unhandled exceptions
 *    - Formats error responses consistently
 *    - Logs errors for monitoring
 *
 * ERROR TYPES:
 *
 * Business Logic Errors (handle in service, return ServiceResult):
 * - Validation errors → badRequest (400)
 * - Not found errors → badRequest (400)
 * - Unauthorized access → unauthorized (401)
 * - Forbidden access → forbidden (403)
 *
 * System Errors (let bubble up, handled by Exception Filter):
 * - Database connection errors → 500
 * - Network errors → 500
 * - Unexpected exceptions → 500
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(@Inject(ErrorService) private readonly errorService: ErrorService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<{ statusCode?: number }>();
    const request = ctx.getRequest<{ url?: string }>();
    const statusCode = response.statusCode || HttpStatus.OK;
    const path = request.url || '';

    return next.handle().pipe(
      map((data: unknown) => {
        // If data is a ServiceResult structure (from services)
        // Services should return ServiceResult<T> for BUSINESS LOGIC ERRORS only
        // System errors should bubble up and be handled by Exception Filter
        if (data && typeof data === 'object' && 'success' in data) {
          const result = data as ServiceResult<unknown>;

          if (!result.success) {
            // Handle error - convert to HttpException
            const errorInfo = this.errorService.handleDbError(result.error, {
              unique: `Oops! Unique validation error occurred!`,
              foreignKeyConstraint: `Oops! You can't delete, update or create this record because it's linked to other data.`,
              recordNotFound: `We're sorry, but the requested record could not be found.`,
            });

            const errorName = errorInfo?.name || result.error?.name;
            const errorMessage = errorInfo?.message || result.error?.message || result.message;

            // Throw appropriate HttpException based on error name
            if (errorName && errorMessage) {
              if (errorName === 'badRequest') {
                throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
              }
              if (errorName === 'unauthorized') {
                throw new HttpException(errorMessage, HttpStatus.UNAUTHORIZED);
              }
              if (errorName === 'forbidden') {
                throw new HttpException(errorMessage, HttpStatus.FORBIDDEN);
              }
              if (errorName === 'notImplemented') {
                throw new HttpException(errorMessage, HttpStatus.NOT_IMPLEMENTED);
              }
            }

            throw new HttpException(
              result.message || 'Something went wrong!',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          // Success case - format response following best practices
          return {
            statusCode,
            message: result.message || 'Request successful',
            data: result.data as T,
            timestamp: new Date().toISOString(),
            path,
          };
        }

        // If data is not a Result structure, wrap it normally
        return {
          statusCode,
          message: 'Request successful',
          data: data as T,
          timestamp: new Date().toISOString(),
          path,
        };
      }),
      catchError((error: unknown) => {
        // Re-throw HttpException as-is (will be handled by HttpExceptionFilter)
        if (error instanceof HttpException) {
          return throwError(() => error);
        }
        // Wrap other errors
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return throwError(() => new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR));
      }),
    );
  }
}
