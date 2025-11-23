import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    // Если value undefined или null для body, это ошибка
    if (metadata.type === 'body' && (value === undefined || value === null)) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: [
          {
            code: 'invalid_type',
            expected: 'object',
            received: value === undefined ? 'undefined' : 'null',
            path: [],
            message: 'Required',
          },
        ],
      });
    }

    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
