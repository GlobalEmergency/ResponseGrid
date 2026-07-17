/**
 * Value object representing the scope of an accreditation.
 *
 * - Global scope: the organization is accredited across all emergencies.
 * - Emergency scope: the organization is accredited for a specific emergency.
 */
export type AccreditationScopeProps =
  { kind: 'global' } | { kind: 'emergency'; emergencyId: string };

export class AccreditationScope {
  private constructor(private readonly props: AccreditationScopeProps) {}

  static global(): AccreditationScope {
    return new AccreditationScope({ kind: 'global' });
  }

  static forEmergency(emergencyId: string): AccreditationScope {
    if (!emergencyId || emergencyId.trim() === '') {
      throw new Error('emergencyId must be a non-empty string');
    }
    return new AccreditationScope({ kind: 'emergency', emergencyId });
  }

  static fromProps(props: AccreditationScopeProps): AccreditationScope {
    if (props.kind === 'global') return AccreditationScope.global();
    return AccreditationScope.forEmergency(props.emergencyId);
  }

  get isGlobal(): boolean {
    return this.props.kind === 'global';
  }

  get emergencyId(): string | null {
    return this.props.kind === 'emergency' ? this.props.emergencyId : null;
  }

  /** Returns null when global, or the emergencyId when emergency-scoped. */
  toDb(): string | null {
    return this.props.kind === 'emergency' ? this.props.emergencyId : null;
  }

  toPlain(): AccreditationScopeProps {
    return this.props;
  }

  coversEmergency(emergencyId: string): boolean {
    if (this.props.kind === 'global') return true;
    return this.props.emergencyId === emergencyId;
  }
}
