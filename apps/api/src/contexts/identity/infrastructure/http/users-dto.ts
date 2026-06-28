import { ApiProperty } from '@nestjs/swagger';

/** Minimal directory projection used to resolve an email to a principal id. */
export class UserLookupDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;
}
