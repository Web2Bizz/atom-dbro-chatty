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
      // Zod по умолчанию игнорирует дополнительные поля (passthrough mode)
      // Используем passthrough() чтобы явно разрешить дополнительные поля
      const parsedValue = this.schema.passthrough().parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        // Форматируем ошибки для лучшей читаемости
        const formattedErrors = error.errors.map((err) => ({
          expected: err.expected,
          code: err.code,
          path: err.path,
          message: `Invalid input: expected ${err.expected}, received ${err.received}`,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
          details: error.errors,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
