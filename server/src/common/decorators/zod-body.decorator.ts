import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ZodSchema } from 'zod';

export const ZodBody = (schema: ZodSchema) => {
  return createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const body = request.body;
    
    try {
      return schema.parse(body);
    } catch (error) {
      throw error;
    }
  })();
};

