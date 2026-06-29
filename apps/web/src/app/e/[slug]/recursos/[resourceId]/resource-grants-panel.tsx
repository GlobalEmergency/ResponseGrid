"use client";

import { useActionState } from "react";
import { Button } from "@/components/atoms/button";
import { ErrorMessage } from "@/components/atoms/error-message";
import { Input } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { FormField } from "@/components/molecules/form-field";
import {
  grantResourceRoleAction,
  revokeResourceGrantAction,
  type ActionResult,
  type ResourceGrantView,
} from "./actions";

const INITIAL: ActionResult = { status: "idle" };

function formatGrantedAt(locale: string, value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function ResourceGrantRow({
  grant,
  slug,
  resourceId,
  locale,
}: {
  grant: ResourceGrantView;
  slug: string;
  resourceId: string;
  locale: string;
}) {
  const [state, formAction, pending] = useActionState(
    () => revokeResourceGrantAction(grant.id, slug, resourceId),
    INITIAL,
  );

  const principalLabel =
    grant.principalName ?? grant.principalEmail ?? grant.principalId;

  return (
    <li className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-ink">{principalLabel}</p>
          <p className="text-sm text-muted-soft">
            Responsable de punto · concedido el{" "}
            {formatGrantedAt(locale, grant.grantedAt)}
          </p>
        </div>

        {state.status === "error" && (
          <ErrorMessage message={state.message ?? ""} />
        )}
        {state.status === "success" && (
          <p
            role="status"
            className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
          >
            Responsable revocado.
          </p>
        )}

        <form action={formAction} className="self-start">
          <Button
            type="submit"
            variant="danger-outline"
            size="sm"
            disabled={pending}
          >
            {pending ? "Revocando…" : "Revocar"}
          </Button>
        </form>
      </div>
    </li>
  );
}

function GrantForm({ slug, resourceId }: { slug: string; resourceId: string }) {
  const [state, formAction, pending] = useActionState(
    grantResourceRoleAction,
    INITIAL,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface px-4 py-4"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="scopeType" value="entity" />
      <input type="hidden" name="scopeEntityType" value="resource" />
      <input type="hidden" name="roleId" value="point_manager" />

      {state.status === "error" && (
        <ErrorMessage message={state.message ?? ""} />
      )}
      {state.status === "success" && (
        <p
          role="status"
          className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          {state.message ?? "Responsable autorizado."}
        </p>
      )}

      <FormField htmlFor="principal" label="Usuario (email o ID)">
        <Input
          id="principal"
          name="principal"
          type="text"
          placeholder="persona@ejemplo.org o UUID"
          required
          autoComplete="off"
        />
      </FormField>

      <FormField htmlFor="expiresAt" label="Caduca (opcional)">
        <Input id="expiresAt" name="expiresAt" type="date" autoComplete="off" />
      </FormField>

      <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Solo se concede el rol de responsable de punto. La atenuación del
        servidor evita escaladas de privilegio.
      </p>

      <Button type="submit" disabled={pending} size="md">
        {pending ? "Concediendo…" : "Autorizar responsable"}
      </Button>
    </form>
  );
}

export function ResourceGrantsPanel({
  slug,
  resourceId,
  grants,
  locale,
}: {
  slug: string;
  resourceId: string;
  grants: ResourceGrantView[];
  locale: string;
}) {
  const orderedGrants = [...grants].sort(
    (a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime(),
  );

  return (
    <section
      aria-labelledby="resource-grants-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <h2
          id="resource-grants-heading"
          className="font-display text-base font-bold text-navy"
        >
          Responsables del punto
        </h2>
        <p className="text-sm text-muted-soft">
          Autoriza personas concretas para operar este punto sin darles
          coordinación de toda la emergencia.
        </p>
      </div>

      <GrantForm slug={slug} resourceId={resourceId} />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">
          Autorizaciones actuales
        </h3>

        {orderedGrants.length === 0 ? (
          <EmptyState title="Todavía no hay responsables asignados." />
        ) : (
          <ul className="flex flex-col gap-3" role="list">
            {orderedGrants.map((grant) => (
              <ResourceGrantRow
                key={grant.id}
                grant={grant}
                slug={slug}
                resourceId={resourceId}
                locale={locale}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
