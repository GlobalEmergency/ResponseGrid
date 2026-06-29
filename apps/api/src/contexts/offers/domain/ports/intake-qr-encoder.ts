export const INTAKE_QR_ENCODER = Symbol('IntakeQrEncoder');

export interface IntakeQrEncoder {
  encodeToPng(url: string): Promise<Buffer>;
}
