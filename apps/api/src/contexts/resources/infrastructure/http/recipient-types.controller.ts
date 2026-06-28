import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { ListRecipientTypes } from '../../application/list-recipient-types';
import { RecipientType } from '../../domain/recipient-type';

export class RecipientTypeDto {
  @ApiProperty({ example: 'hospital' })
  slug!: string;

  @ApiProperty({ example: 'Hospital' })
  labelEs!: string;

  @ApiProperty({ example: 'Hospital' })
  labelEn!: string;

  @ApiProperty({ example: 10 })
  sort!: number;
}

@ApiTags('public')
@Controller()
export class RecipientTypesController {
  constructor(private readonly listRecipientTypes: ListRecipientTypes) {}

  @Get('recipient-types')
  @ApiOperation({
    summary:
      'List the recipient-type taxonomy for final recipients (extensible)',
  })
  @ApiOkResponse({
    description: 'Recipient types ordered by sort',
    type: [RecipientTypeDto],
  })
  list(): Promise<RecipientType[]> {
    return this.listRecipientTypes.execute();
  }
}
