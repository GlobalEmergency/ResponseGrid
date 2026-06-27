import * as path from 'node:path';
import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import { FILE_STORAGE, FileStorage } from '../domain/ports/file-storage';
import { LocalDiskFileStorage } from './local-disk-file-storage';
import { S3FileStorage } from './s3-file-storage';
import { FilesController } from './files.controller';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

const fileStorageProvider = {
  provide: FILE_STORAGE,
  useFactory: (): FileStorage => {
    if (process.env.FILE_STORAGE === 's3') {
      const bucket = process.env.S3_BUCKET;
      if (!bucket) {
        throw new Error(
          'S3_BUCKET environment variable is required when FILE_STORAGE=s3',
        );
      }
      const region = process.env.AWS_REGION ?? 'us-east-1';
      return new S3FileStorage({ bucket, region });
    }
    return new LocalDiskFileStorage(UPLOADS_DIR);
  },
};

@Module({
  imports: [IdentityModule],
  controllers: [FilesController],
  providers: [fileStorageProvider],
  exports: [FILE_STORAGE],
})
export class FilesModule {}
