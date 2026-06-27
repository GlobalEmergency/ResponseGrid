import {
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Res,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../identity/infrastructure/http/jwt-auth.guard';
import { FILE_STORAGE } from '../domain/ports/file-storage';
import type { FileStorage } from '../domain/ports/file-storage';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
  ) {}

  /**
   * Upload a single image file.
   * Accepts: image/* — JPEG, PNG, GIF, WebP, etc.
   * Max size: 5 MB.
   * Returns the storage key and a URL that can be embedded in reports.
   */
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_BYTES },
      fileFilter: (
        _req: unknown,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        // SVG is excluded: it can embed <script> tags and execute JS same-origin.
        if (file.mimetype === 'image/svg+xml') {
          cb(
            new UnprocessableEntityException(
              `Unsupported content-type "image/svg+xml"; SVG uploads are not permitted`,
            ),
            false,
          );
          return;
        }
        if (!file.mimetype.startsWith('image/')) {
          cb(
            new UnprocessableEntityException(
              `Unsupported content-type "${file.mimetype}"; only image/* (JPEG, PNG, WebP, …) is accepted`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload an image file (max 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File stored successfully',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        url: { type: 'string' },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ key: string; url: string }> {
    if (!file) {
      throw new UnprocessableEntityException('No file received');
    }
    return this.fileStorage.save({
      buffer: file.buffer,
      contentType: file.mimetype,
      originalName: file.originalname,
    });
  }

  /**
   * Serve a previously uploaded file by its storage key.
   * Streams the file directly from disk.
   */
  @Get(':key')
  @ApiOperation({ summary: 'Download a stored file by key' })
  @ApiParam({ name: 'key', description: 'Storage key returned by POST /files' })
  @ApiOkResponse({ description: 'File content streamed' })
  async serve(@Param('key') key: string, @Res() res: Response): Promise<void> {
    const stream = await this.fileStorage.getStream(key);
    if (!stream) {
      throw new NotFoundException(`File "${key}" not found`);
    }

    // Derive content-type from extension.
    // SVG is intentionally absent: uploads are rejected at POST time, so a
    // stored SVG key should never occur; fall back to octet-stream if it does.
    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      bin: 'application/octet-stream',
    };
    const contentType = contentTypeMap[ext] ?? 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    // Prevent MIME-sniffing attacks (defence-in-depth alongside the SVG block).
    res.setHeader('X-Content-Type-Options', 'nosniff');
    stream.pipe(res);
  }
}
