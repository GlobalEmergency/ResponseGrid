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
  | { type: 'entity'; entityType: string; id: string };

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
        a.type === 'group') &&
      (b.type === 'organization' ||
        b.type === 'emergency' ||
        b.type === 'group')
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
 * the current model, where emergencies and organizations sit directly under
 * platform; group/org nesting resolution is a later addition (docs/features/13
 * §16, §18.3-b). Platform is always the root.
 */
export function ancestorChain(scope: ScopeRefProps): ScopeRefProps[] {
  if (scope.type === 'platform') return [{ type: 'platform' }];
  return [scope, { type: 'platform' }];
}
