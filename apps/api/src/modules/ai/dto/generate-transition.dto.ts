import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateTransitionDto {
  @ApiProperty({
    example: 'Keynote: "AI at the Edge"',
    description: 'Title or description of the session that just finished',
  })
  @IsString()
  @IsNotEmpty()
  current: string;

  @ApiProperty({
    example: 'Talk: "WebAssembly in Production"',
    description: 'Title or description of the upcoming session',
  })
  @IsString()
  @IsNotEmpty()
  next: string;

  @ApiPropertyOptional({
    example: 10,
    default: 0,
    description: 'Optional delay in minutes to incorporate into the announcement context',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  delayMinutes?: number;
}
