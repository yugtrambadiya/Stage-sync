import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'random-reset-token-here' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'newStrongPassword123!', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  newPassword: string;
}
