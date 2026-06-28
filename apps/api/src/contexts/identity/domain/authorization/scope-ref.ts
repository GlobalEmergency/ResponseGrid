/**
 * A scope is *where* a grant applies. Scopes form an open-typed hierarchy that
 * is resolved as a DAG (a resource may have several parents — e.g. an emergency
 * AND a logistics hub). See docs/features/13 §3 and §16.
 *
 * The type set is intentionally extensible: adding `hub`/`corridor`/… for
 * cross-emergency logistics actors does not change the decision algorithm.
 */
export type ScopeRefProps =
  | { type: 'platform' }
  | { type: 'organization'; id: string }
  | { type: 'emergency'; id: string }
  | { type: 'group'; id: string }
  | { type: 'entity'; entityType: string; id: string }
  | { type: 'hub'; id: string }
  | { type: 'corridor'; id: string };

export type ScopeType = ScopeRefProps['type'];

function requireId(id: string): string {
  if (!id || id.trim() === '') {
    throw new Error('scope id must be a non-empty string');
  }
  return id;
}

export class ScopeRef {
  private constructor(private readonly props: ScopeRefProps) {}

  static platform(): ScopeRef {
    return new ScopeRef({ type: 'platform' });
  }

  static organization(id: string): ScopeRef {
    return new ScopeRef({ type: 'organization', id: requireId(id) });
  }

  static emergency(id: string): ScopeRef {
    return new ScopeRef({ type: 'emergency', id: requireId(id) });
  }

  static group(id: string): ScopeRef {
    return new ScopeRef({ type: 'group', id: requireId(id) });
  }

  static entity(entityType: string, id: string): ScopeRef {
    return new ScopeRef({
      type: 'entity',
      entityType: requireId(entityType),
      id: requireId(id),
    });
  }

  /** Logistics hub (e.g. a port/airport) — a cross-emergency scope (§16). */
  static hub(id: string): ScopeRef {
    return new ScopeRef({ type: 'hub', id: requireId(id) });
  }

  /** Logistics corridor between nodes — a cross-emergency scope (§16). */
  static corridor(id: string): ScopeRef {
    return new ScopeRef({ type: 'corridor', id: requireId(id) });
  }

  static fromProps(props: ScopeRefProps): ScopeRef {
    switch (props.type) {
      case 'platform':
        return ScopeRef.platform();
      case 'organization':
        return ScopeRef.organization(props.id);
      case 'emergency':
        return ScopeRef.emergency(props.id);
      case 'group':
        return ScopeRef.group(props.id);
      case 'entity':
        return ScopeRef.entity(props.entityType, props.id);
      case 'hub':
        return ScopeRef.hub(props.id);
      case 'corridor':
        return ScopeRef.corridor(props.id);
      default: {
        // Unknown scope type. The compiler proves this is unreachable for valid
        // input, but grant snapshots arrive from JWTs and are not re-validated
        // at runtime — so reject explicitly (fail-closed) rather than fall off
        // the switch returning `undefined`, which would crash the PDP. Never map
        // an unknown scope to `platform`: that would be a fail-open escalation.
        const exhaustive: never = props;
        throw new Error(
          `unknown scope type: ${String((exhaustive as { type?: unknown }).type)}`,
        );
      }
    }
  }

  get type(): ScopeType {
    return this.props.type;
  }

  toPlain(): ScopeRefProps {
    return this.props;
  }

  equals(other: ScopeRef): boolean {
    const a = this.props;
    const b = other.props;
    if (a.type !== b.type) return false;
    if (a.type === 'platform') return true;
    if (a.type === 'entity' && b.type === 'entity') {
      return a.id === b.id && a.entityType === b.entityType;
    }
    if (
      (a.type === 'organization' ||
        a.type === 'emergency' ||
        a.type === 'group' ||
        a.type === 'hub' ||
        a.type === 'corridor') &&
      (b.type === 'organization' ||
        b.type === 'emergency' ||
        b.type === 'group' ||
        b.type === 'hub' ||
        b.type === 'corridor')
    ) {
      return a.id === b.id;
    }
    return false;
  }

  /**
   * Does a grant held at THIS scope cover a resource whose ancestor chain is
   * `chain`?
   *
   * - A `platform` grant always covers (top of the hierarchy).
   * - Otherwise this scope must appear in the resource's ancestor chain. The
   *   chain is a flat set of ancestors, so multi-parent (DAG) resources are
   *   supported transparently.
   */
  coversAnyOf(chain: ScopeRef[]): boolean {
    if (this.props.type === 'platform') return true;
    return chain.some((s) => this.equals(s));
  }
}

/**
 * The ancestor chain of a scope (the scope itself → platform). Simplified for
 * the current model, where emergencies, organizations and logistics
 * hubs/corridors sit directly under platform (hubs/corridors are
 * cross-emergency, docs/features/13 §16); group/org nesting resolution is a
 * later addition (§18.3-b). Platform is always the root.
 */
export function ancestorChain(scope: ScopeRefProps): ScopeRefProps[] {
  if (scope.type === 'platform') return [{ type: 'platform' }];
  return [scope, { type: 'platform' }];
}
