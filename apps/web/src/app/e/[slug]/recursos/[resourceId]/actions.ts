"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { authHeaders, clearToken, getToken } from "@/lib/auth";

export interface ResourceGrantView {
  id: string;
  principalId: string;
  principalType: string;
  roleId: string;
  scopeType: string;
  scopeId: string | null;
  grantedByPrincipalId: string | null;
  grantedAt: string;
  expiresAt: string | null;
  principalName: string | null;
  principalEmail: string | null;
}

export interface ActionResult {
  status: "idle" | "success" | "error";
  message?: string;
}

const RESOURCE_SCOPE_TYPE = "entity";
const RESOURCE_SCOPE_ENTITY_TYPE = "resource";

function resourcePath(slug: string, resourceId: string): string {
  return `/e/${slug}/recursos/${resourceId}`;
}

async function resolvePrincipalId(
  token: string,
  input: string,
): Promise<string | null> {
  const query = input.trim();
  if (!query) return null;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuid.test(query)) return query;

  const { data, error } = await api.GET("/users/lookup", {
    params: { query: { email: query } },
    headers: authHeaders(token),
  });
  if (error !== undefined || !data) return null;
  return data.id;
}

export async function fetchResourceGrants(
  resourceId: string,
): Promise<ResourceGrantView[]> {
  const token = await getToken();
  if (!token) return [];

  const { data, error } = await api.GET("/grants/at-scope", {
    params: {
      query: {
        scopeType: RESOURCE_SCOPE_TYPE,
        scopeId: resourceId,
        scopeEntityType: RESOURCE_SCOPE_ENTITY_TYPE,
      },
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) return [];
  return (data ?? []) as ResourceGrantView[];
}

export async function grantResourceRoleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const slug = String(formData.get("slug") ?? "").trim();
  const resourceId = String(formData.get("resourceId") ?? "").trim();
  const principalInput = String(formData.get("principal") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "").trim();
  const token = await getToken();
  if (!token) redirect(resourcePath(slug, resourceId));

  const scopeType = String(formData.get("scopeType") ?? "").trim();
  const scopeEntityType = String(formData.get("scopeEntityType") ?? "").trim();
  if (
    !slug ||
    !resourceId ||
    !principalInput ||
    !roleId ||
    scopeType !== RESOURCE_SCOPE_TYPE ||
    scopeEntityType !== RESOURCE_SCOPE_ENTITY_TYPE
  ) {
    return { status: "error", message: "Completa el usuario y el rol." };
  }

  const principalId = await resolvePrincipalId(token, principalInput);
  if (!principalId) {
    return {
      status: "error",
      message: "No se encontró ningún usuario con ese email o ID.",
    };
  }

  const { error, response } = await api.POST("/grants", {
    body: {
      principalId,
      roleId,
      scopeType: RESOURCE_SCOPE_TYPE,
      scopeId: resourceId,
      scopeEntityType: RESOURCE_SCOPE_ENTITY_TYPE,
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(resourcePath(slug, resourceId));
    }
    if (response.status === 403) {
      return {
        status: "error",
        message:
          "No puedes conceder este rol aquí: necesitas los permisos de coordinación del punto.",
      };
    }
    if (response.status === 400) {
      return {
        status: "error",
        message: "Datos inválidos. Revisa el formulario.",
      };
    }
    return { status: "error", message: "No se pudo conceder el rol." };
  }

  revalidatePath(resourcePath(slug, resourceId));
  return { status: "success", message: "Responsable autorizado." };
}

export async function revokeResourceGrantAction(
  grantId: string,
  slug: string,
  resourceId: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (!token) redirect(resourcePath(slug, resourceId));

  const { error, response } = await api.DELETE("/grants/{id}", {
    params: { path: { id: grantId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(resourcePath(slug, resourceId));
    }
    if (response.status === 403) {
      return {
        status: "error",
        message: "No tienes permiso para revocar este rol.",
      };
    }
    return { status: "error", message: "No se pudo revocar el rol." };
  }

  revalidatePath(resourcePath(slug, resourceId));
  return { status: "success" };
}
