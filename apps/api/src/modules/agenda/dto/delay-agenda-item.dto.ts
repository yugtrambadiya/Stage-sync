import { IsInt, IsBoolean, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DelayAgendaItemDto {
  @ApiProperty({
    example: 15,
    description: 'Number of minutes to delay (integer 1..1440). String "15" is rejected — must be a JSON number.',
  })
  @IsInt({ message: 'delayMinutes must be an integer — do not pass a string.' })
  @Min(1)
  @Max(1440)
  @Type(() => Number)
  delayMinutes: number;

  @ApiPropertyOptional({
    default: true,
    description: 'true = shift this item AND all downstream items; false = shift ONLY this item (may trigger overlap 409)',
  })
  @IsBoolean()
  @IsOptional()
  cascade?: boolean;

  @ApiPropertyOptional({ example: 'Speaker travel delay reported' })
  @IsString()
  @IsOptional()
  reason?: string;
}
