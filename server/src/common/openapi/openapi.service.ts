import { Injectable } from '@nestjs/common';
import { z } from 'zod';

/**
 * Пример использования zod-openapi для генерации OpenAPI документации
 *
 * Для использования установите: pnpm add zod-openapi
 *
 * Пример:
 *
 * import { createOpenApi } from 'zod-openapi';
 *
 * const UserSchema = z.object({
 *   id: z.string().uuid(),
 *   email: z.string().email(),
 *   username: z.string(),
 * });
 *
 * const openApi = createOpenApi({
 *   openapi: '3.0.0',
 *   info: {
 *     title: 'My API',
 *     version: '1.0.0',
 *   },
 *   paths: {
 *     '/users': {
 *       get: {
 *         summary: 'Get all users',
 *         responses: {
 *           '200': {
 *             description: 'List of users',
 *             content: {
 *               'application/json': {
 *                 schema: UserSchema,
 *               },
 *             },
 *           },
 *         },
 *       },
 *     },
 *   },
 * });
 */

@Injectable()
export class OpenApiService {
  // Этот сервис можно использовать для генерации OpenAPI документации
  // на основе Zod схем
}
