import {
  ContainerRepository,
  ListContainersFilter,
  Container,
  ContainerSnapshot,
  ContainerId,
  ContainerType,
} from '@globalemergency/warehouse-core/containers';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';

export class InMemoryContainerRepository implements ContainerRepository {
  private store = new Map<string, ContainerSnapshot>();
  /** Monotonic per-(emergency, type) code counter; mirrors the DB sequence. */
  private sequences = new Map<string, number>();

  save(container: Container): Promise<void> {
    this.store.set(container.id.value, container.toSnapshot());
    return Promise.resolve();
  }

  findById(id: ContainerId): Promise<Container | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? Container.fromSnapshot(snap) : null);
  }

  findByScope(
    scopeId: ScopeId,
    filter: ListContainersFilter,
  ): Promise<Container[]> {
    const result = [...this.store.values()]
      .filter((s) => s.scopeId === scopeId.value)
      .filter((s) => filter.type === undefined || s.type === filter.type)
      .filter((s) => filter.status === undefined || s.status === filter.status)
      .filter(
        (s) =>
          filter.holderType === undefined || s.holderType === filter.holderType,
      )
      .filter(
        (s) => filter.holderId === undefined || s.holderId === filter.holderId,
      )
      .filter((s) => !filter.topLevelOnly || s.parentContainerId === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => Container.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findChildren(parentId: ContainerId): Promise<Container[]> {
    const result = [...this.store.values()]
      .filter((s) => s.parentContainerId === parentId.value)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((s) => Container.fromSnapshot(s));
    return Promise.resolve(result);
  }

  nextSequence(scopeId: ScopeId, type: ContainerType): Promise<number> {
    const key = `${scopeId.value}:${type}`;
    const next = (this.sequences.get(key) ?? 0) + 1;
    this.sequences.set(key, next);
    return Promise.resolve(next);
  }
}
