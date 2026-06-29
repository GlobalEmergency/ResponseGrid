import { IntakeQrEncoder } from '../domain/ports/intake-qr-encoder';
import { IntakeResourceLookup } from '../domain/ports/intake-resource-lookup';
import { resolveIntakeTargetResource } from './resolve-intake-target-resource';

export interface IntakeDeepLinkResult {
  url: string;
  resourceName: string;
  slug: string;
  resourceId: string;
}

export class GetIntakeDeepLink {
  constructor(
    private readonly resourceLookup: IntakeResourceLookup,
    private readonly frontendBaseUrl: string,
    private readonly qrEncoder: IntakeQrEncoder,
  ) {}

  async execute(resourceId: string): Promise<IntakeDeepLinkResult> {
    const resource = await resolveIntakeTargetResource(
      this.resourceLookup,
      resourceId,
    );

    const base = this.frontendBaseUrl.replace(/\/$/, '');
    const url = `${base}/e/${resource.emergencySlug}/donar-acopio?resourceId=${resourceId}`;

    return {
      url,
      resourceName: resource.name,
      slug: resource.emergencySlug,
      resourceId: resource.id,
    };
  }

  async generateQr(resourceId: string): Promise<Buffer> {
    const { url } = await this.execute(resourceId);
    return this.qrEncoder.encodeToPng(url);
  }
}
