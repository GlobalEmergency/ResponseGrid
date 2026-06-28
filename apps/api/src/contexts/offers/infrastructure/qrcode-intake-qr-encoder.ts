import QRCode from 'qrcode';
import { IntakeQrEncoder } from '../domain/ports/intake-qr-encoder';

export class QrcodeIntakeQrEncoder implements IntakeQrEncoder {
  encodeToPng(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url, { type: 'png', margin: 2, width: 512 });
  }
}
