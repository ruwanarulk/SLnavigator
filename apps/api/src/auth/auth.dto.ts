import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;
}

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(128)
  password: string;
}

export class RegisterProviderDto extends RegisterDto {
  @IsIn(['GUIDE', 'COMPANY', 'TRANSPORT']) type: 'GUIDE' | 'COMPANY' | 'TRANSPORT';

  /** Public name: the guide's name, or the company / driver business name. */
  @IsString() @MinLength(2) @MaxLength(80) displayName: string;

  @IsString() @MinLength(1) @MaxLength(60) city: string;

  @IsString() @MinLength(5) @MaxLength(30) phone: string;
}
