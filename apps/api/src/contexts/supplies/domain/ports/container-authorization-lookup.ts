export const CONTAINER_AUTHORIZATION_LOOKUP = Symbol(
  'ContainerAuthorizationLookup',
);

export interface ContainerAuthorizationFacts {
  emergencyId: string;
}

/**
 * Resolves the emergency a container belongs to, for the HTTP layer's
 * coordinator-membership gate on the `/supplies/containers/{id}/...` write
 * routes (which carry no scope-resolvable param). Mirrors the logistics
 * ShipmentAuthorizationLookup.
 */
export interface ContainerAuthorizationLookup {
  findAuthorizationFacts(
    containerId: string,
  ): Promise<ContainerAuthorizationFacts | null>;
}
