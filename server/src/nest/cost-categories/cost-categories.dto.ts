import { createZodDto } from 'nestjs-zod';
import { costCategoryCreateRequestSchema, costCategoryUpdateRequestSchema } from '@trek/shared';

/** createZodDto wrappers over the @trek/shared custom cost category contracts (#4). */
export class CostCategoryCreateDto extends createZodDto(costCategoryCreateRequestSchema) {}
export class CostCategoryUpdateDto extends createZodDto(costCategoryUpdateRequestSchema) {}
