/**
 * Value Object: ReporterInfo
 *
 * Encapsulates contact data of the person filing the report.
 * Validation: name must be non-empty; phone must have a basic valid format.
 */

const PHONE_RE = /^\+?[\d\s\-().]{6,20}$/;

export interface ReporterInfoProps {
  userId: string | null;
  name: string;
  phone: string;
  email: string | null;
}

export class InvalidReporterInfoError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidReporterInfoError';
  }
}

export class ReporterInfo {
  readonly userId: string | null;
  readonly name: string;
  readonly phone: string;
  readonly email: string | null;

  private constructor(props: ReporterInfoProps) {
    this.userId = props.userId;
    this.name = props.name;
    this.phone = props.phone;
    this.email = props.email;
  }

  static create(props: ReporterInfoProps): ReporterInfo {
    const name = props.name.trim();
    if (!name) {
      throw new InvalidReporterInfoError('Reporter name must not be empty');
    }
    const phone = props.phone.trim();
    if (!PHONE_RE.test(phone)) {
      throw new InvalidReporterInfoError(`Invalid phone format: "${phone}"`);
    }
    return new ReporterInfo({
      userId: props.userId ?? null,
      name,
      phone,
      email: props.email?.trim() || null,
    });
  }

  toPlain(): ReporterInfoProps {
    return {
      userId: this.userId,
      name: this.name,
      phone: this.phone,
      email: this.email,
    };
  }
}
