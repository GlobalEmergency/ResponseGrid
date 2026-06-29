import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from '../contexts/resources/infrastructure/http/domain-exception.filter';
import { NeedsDomainExceptionFilter } from '../contexts/needs/infrastructure/http/domain-exception.filter';
import { ReportExceptionFilter } from '../contexts/reports/infrastructure/http/report-exception.filter';
import { LogisticsDomainExceptionFilter } from '../contexts/logistics/infrastructure/http/domain-exception.filter';
import { OffersDomainExceptionFilter } from '../contexts/offers/infrastructure/http/domain-exception.filter';
import { SuppliesDomainExceptionFilter } from '../contexts/supplies/infrastructure/http/supplies-domain-exception.filter';

/** Pipes and domain exception filters shared by `main.ts` and e2e test apps. */
export function configureHttpApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(
    new DomainExceptionFilter(),
    new NeedsDomainExceptionFilter(),
    new ReportExceptionFilter(),
    new LogisticsDomainExceptionFilter(),
    new OffersDomainExceptionFilter(),
    new SuppliesDomainExceptionFilter(),
  );
}
