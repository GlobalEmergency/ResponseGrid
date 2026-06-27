# 13 · Roles, permisos y autenticación — Dominio: Plataforma y acceso

> Rediseño fundacional del sistema de autorización de ReliefHub. No es una feature operativa: es la **capa transversal** sobre la que se apoyan todas las demás (coordinación, voluntarios, acreditación, reunificación…). Sustituye los tres mecanismos de autorización actuales —incompatibles entre sí— por un único modelo escalable.

> **Tesis:** el problema no es "faltan roles", es que hoy se modela autorización con tres mecanismos planos (`isAdmin` booleano + `Role` enum por emergencia + `OrganizationRole` owner/member) y **ninguno tiene el concepto de _permiso_**. Por eso cada matiz nuevo del "popurrí" (unos validan, otros solo ven, otros gestionan usuarios, otros administran su organización) obliga a tocar código. La salida es invertir el modelo: **roles → permisos → scopes**, con un único tipo de _concesión_ (grant) y un único tipo de _principal_ (usuario o máquina).

---

## 0. Decisiones de diseño tomadas (alcance de este documento)

| # | Decisión | Elección | Implicación en este doc |
|---|----------|----------|--------------------------|
| D1 | **Delegación entre usuarios** | **Completa con atenuación** desde día 1 | `role:grant` recursivo + atenuación de privilegios. Orgs y managers se autogestionan sin equipo central (§5). |
| D2 | **Roles custom por organización** | **Catálogo fijo primero** | Roles predefinidos en código (§4); roles custom por org = **fase 2** (§4.4). La atenuación funciona igual con catálogo fijo. |
| D3 | **Enforcement / token** | **Mantener el JWT actual** (grants embebidos, 12 h) | El `can()` se resuelve **en memoria** contra los grants del token, igual que hoy con `memberships`. Se documenta el riesgo de revocación diferida y su mitigación ligera (§9), y el camino futuro a PDP server-side. Nota: D3 aplica al **plano interno**; el **plano API pública** (#2) tiene credenciales propias (API key/OAuth2) desde el inicio, resolviendo por el mismo `can()` (§8). |

### 0.1 Alineación con el backlog (issues abiertas)

Este diseño es el cimiento que varias issues abiertas necesitan pero que hoy no tiene base coherente:

| Issue | Qué pide | Cómo lo cubre este modelo |
|---|---|---|
| **#2** [EPIC] API pública por fases | base de autorización para terceros | Catálogo de permisos = catálogo de scopes (§8.2) |
| **#17** API key + rotación (P1) | auth por API key, **desacoplada del JWT interno** | `ServiceAccount` como principal (§8.3) — desacoplado por diseño |
| **#18** Rate limit/cuotas por cliente | 429 + `X-RateLimit-*` por key | Atributos `rateLimitPerMin`/`quotaPerDay` en la credencial (§8.3) |
| **#21** OAuth2 + scopes + consentimiento (Fase 2) | apps actúan en nombre de usuarios | Atenuación (§5) aplicada al consentimiento (§8.4) |
| **#22** Registro de apps de terceros | `client_id`/`secret`/scopes | `OAuthClient` = otro tipo de principal (§8.4) |
| **#23** Webhooks firmados | suscripción a eventos públicos | `can()` autoriza la suscripción y filtra por scope (§8.5) |
| **#16** Diseño API v1 (RFC 7807) | formato de error consistente | Denegaciones del `PermissionGuard` en RFC 7807 / 401·403·429 (§9.1) |
| **#24, #9–#14** datos sensibles / inventario | quién ve/edita qué por punto | Permisos + ABAC `ownership`/`data_sensitivity` (§7) y scopes `entity`/`group` (§3) |

---

## 1. Origen (qué hay hoy en el código)

ReliefHub tiene **tres mecanismos de autorización desconectados**:

```ts
// 1) identity/domain/user.ts — super-poder global, binario
class User { … readonly isAdmin: boolean }

// 2) identity/domain/role.ts + membership.ts — rol por emergencia
enum Role { Coordinator = 'coordinator', Verifier = 'verifier' }
class Membership { readonly userId; readonly emergencyId; readonly role: Role }
//   tabla memberships con unique(user_id, emergency_id)  ← un solo rol por emergencia

// 3) organizations/domain/organization-member.ts — pertenencia a org
enum OrganizationRole { Owner = 'owner', Member = 'member' }
class OrganizationMember { readonly organizationId; readonly userId; readonly role }

// 4) accreditation — confianza de ORG (eje aparte, ver §11), scope global|emergency
```

Enforcement actual (NestJS guards):

- `RequireAdminGuard` → comprueba `user.isAdmin`.
- `RequireCoordinatorGuard` → comprueba `memberships` por `emergencyId` de ruta.
- `entity-coordinator-guard.factory.ts` → **7 guards** (`Resource/Need/Offer/Volunteer/Task/Report/ReunificationReport`) que hacen **todos lo mismo**: resolver la emergencia dueña de la entidad y comprobar rol `Coordinator`.
- JWT con `memberships[]` embebidas, 12 h, sin refresh.

---

## 2. Problema / valor

### 2.1 Por qué no escala (diagnóstico brutal)

| Mecanismo | Qué expresa | Por qué se rompe |
|---|---|---|
| `user.isAdmin: boolean` | super-poder global | Binario. No existe "admin de _mi_ organización" ni "admin solo de _esta_ emergencia". Todo-o-nada. |
| `Role = Coordinator\|Verifier` | rol por emergencia | **El rol _es_ el permiso.** Cada matiz nuevo ("solo ve", "valida", "gestiona usuarios") = añadir valor al enum **y tocar todos los guards**. |
| `unique(user_id, emergency_id)` | un rol por usuario por emergencia | Bug latente: un usuario no puede ser _coordinador_ **y** _manager de cuadrilla_ en la misma emergencia. |
| `OrganizationRole = Owner\|Member` | pertenencia a org | Desconectado de emergencias y de acciones. `Owner` no significa nada operativo. |
| 7 × `Require*CoordinatorGuard` | "¿coordinador del dueño de esto?" | El **mismo** patrón repetido. Síntoma de que falta la abstracción _permiso_. |
| JWT con `memberships[]`, 12 h | autorización en el token | (a) Revocar un rol tarda **hasta 12 h** en surtir efecto → agujero anti-fraude. (b) Un org-admin nacional con grants en decenas de scopes infla el token. |

### 2.2 Valor

Un único modelo **roles → permisos → scopes** con grants polimórficos:

- **Disuelve el "popurrí":** cada actor (voluntario, oficial, validador, gestor, org-admin, manager…) = un _bundle_ de permisos en un _scope_. Los matices son combinaciones, no tipos nuevos.
- **Habilita la autogestión:** orgs que crean sus propios usuarios y managers que gestionan grupos, **sin** intervención central, vía delegación con atenuación (§5).
- **Escala a futuro sin rework:** las API keys (máquinas) entran como un subtipo de _principal_ ya contemplado (§8).
- **Elimina código repetido:** los 7 guards colapsan en **un** decorador `@RequirePermission()` (§9).

---

## 3. Propuesta — modelo de dominio (DDD/Hexagonal)

### 3.1 Las 4 primitivas

```
PRINCIPAL  ──hace──►  GRANT(rol @ scope)  ──desempaqueta──►  PERMISOS  ──evalúa──►  can(acción, recurso)
 (quién)                (la concesión)        (qué puede)         (decisión)
```

1. **Principal** — cualquier cosa que se autentica. `User` hoy; `ServiceAccount` (API keys) mañana (§8). Las concesiones funcionan igual sobre ambos.
2. **Permission** — el verbo atómico sobre un tipo de recurso (`resource:verify`, `role:grant`). **Es la moneda.** Los guards comprueban _permisos_, nunca _roles_.
3. **Role** — un _bundle_ con nombre de permisos (`coordinator`, `group_manager`, `viewer`). En esta fase, **catálogo fijo en código** (D2).
4. **Grant** — la tripleta `(principal, role, scope)`. **Una sola tabla** que sustituye a `memberships` + `organization_members` + `isAdmin`.

```ts
// identity/domain/grant.ts  (generaliza Membership)
export interface GrantSnapshot {
  id: string;
  principalId: string;               // user o service-account
  principalType: 'user' | 'service_account';
  roleId: string;                    // del catálogo fijo (§4)
  scope: ScopeRefProps;              // ↓ §3.2
  grantedByPrincipalId: string;      // cadena de delegación auditable (§5)
  grantedAt: Date;
  expiresAt: Date | null;            // grants temporales: turno, voluntario eventual
}
```

### 3.2 Scope como value object

```ts
// identity/domain/value-objects/scope-ref.ts
export type ScopeRefProps =
  | { type: 'platform' }
  | { type: 'organization'; id: string }
  | { type: 'emergency';    id: string }
  | { type: 'group';        id: string }
  | { type: 'entity'; entityType: string; id: string } // permiso sobre UNA instancia
  // Conjunto ABIERTO y extensible. Actores logísticos transversales (§16) añaden tipos
  // sin tocar el algoritmo: p. ej. { type: 'hub'; id } · { type: 'corridor'; id } · { type: 'customs_zone'; id }
  ;

export class ScopeRef {
  static platform(): ScopeRef { /* … */ }
  static organization(id: string): ScopeRef { /* … */ }
  static emergency(id: string): ScopeRef { /* … */ }
  static group(id: string): ScopeRef { /* … */ }

  /** ¿este scope cubre `other` por jerarquía? (platform cubre todo, etc.) */
  covers(other: ScopeRef, hierarchy: ScopeHierarchy): boolean { /* §3.3 */ }
}
```

### 3.3 La jerarquía de scopes (corazón de la escalabilidad)

Un grant no es "global o por emergencia": vive en un **árbol** y los permisos **cascadean hacia abajo**.

```
                    PLATFORM            ← grant aquí = el antiguo isAdmin (super-rol)
                   /        \
          ORGANIZATION      ORGANIZATION ← "admin de mi organización" (org_admin)
              |                  |
          EMERGENCY          EMERGENCY    ← coordinador / verificador (modelo actual)
           /     \
       GROUP     GROUP                    ← "manager de la cuadrilla Norte"
         |
       ENTITY (este punto, este reporte)  ← "responsable de ESTE punto"
```

**Algoritmo de decisión** (un solo método, el `can()`):

```
can(principal, action, resource):
   1. resuelve la CADENA de scopes del recurso:  entity → group → emergency → org → platform
   2. junta todos los grants del principal cuyo scope esté en esa cadena
   3. desempaqueta sus roles → conjunto de permisos efectivos
   4. ¿action ∈ permisos?  → evalúa condiciones ABAC (§7)  → permit / deny
```

Un grant en un scope **superior** cubre todo lo inferior. Esto **unifica `isAdmin`, `memberships` y `org members` en una sola regla**: `platform_admin` puede en cualquier emergencia; `org_admin` en todas las de su org; `group_manager` solo en su grupo. El "veto central" del spec (§2 arquitectura) sale gratis: un grant `platform` siempre gana al delegado.

> **Árbol → DAG (multi-padre).** Para los actores y recursos que viven en el **plano global y cruzan emergencias** (una naviera, un hub logístico, un envío que transita un puerto que sirve a dos emergencias a la vez), la "cadena" del paso 1 deja de ser un árbol estricto y pasa a ser un **DAG**: un recurso puede tener **varios padres** (su `emergency_id` _y_ el hub/organización por el que pasa). El algoritmo no cambia conceptualmente —`junta los grants sobre el **cierre transitivo de ancestros**` en vez de sobre una única cadena lineal—. Esto es lo que permite que "el jefe del hub de Valencia vea toda la carga de su hub, **sea de la emergencia que sea**", algo que un árbol `entity ⊂ una emergencia` no puede expresar. Desarrollo y ejemplo trabajado en **§16**.

### 3.4 El puerto de autorización (PDP único)

```ts
// identity/domain/ports/access-control.ts
export interface AuthorizationContext {
  principalId: string;
  grants: GrantSnapshot[];        // hoy vienen del JWT (D3); mañana de Redis (§9)
}

export interface AccessControl {
  /** Decisión central. Reemplaza la lógica dispersa en los 7 guards. */
  can(
    ctx: AuthorizationContext,
    action: Permission,
    resource: ResourceRef,         // { scopeChain: ScopeRef[]; attributes?: {...} }
  ): Promise<boolean>;

  /** Permisos efectivos de un principal en un scope (para pintar UI / atenuación). */
  effectivePermissions(ctx: AuthorizationContext, scope: ScopeRef): Set<Permission>;
}
```

`AccessControl` es un **puerto de dominio**. El adapter de esta fase resuelve **en memoria** contra los grants del token (D3). Si en el futuro la política se externaliza (OpenFGA/SpiceDB/Cerbos, §10), **se cambia el adapter sin tocar el dominio**.

---

## 4. Catálogo de permisos y roles (el "popurrí", disuelto)

### 4.1 Permisos (constantes en código, ~40-50, estable)

```ts
// identity/domain/permission.ts
export const PERMISSIONS = {
  emergency: ['create','activate','pause','close','read'],
  resource:  ['register','read','verify','close','edit'],
  need:      ['create','validate','prioritize','read'],
  offer:     ['create','match','read'],
  campaign:  ['create','verify','block','read'],
  volunteer: ['register','read','assign','validate_skill'],
  task:      ['create','assign','checkin_self','read'],
  report:    ['create','triage','read'],
  incident:  ['create','resolve'],
  reunification: ['create','read_private','match'],   // ← "personal autorizado" (feature 01)
  org:       ['create','edit','read'],
  accreditation: ['grant','revoke'],
  user:      ['invite','read'],
  role:      ['grant','revoke','create_custom'],       // create_custom = fase 2 (D2)
  apikey:    ['create','revoke'],                       // §8
  audit:     ['read'],
} as const;
// Permission = `${keyof typeof PERMISSIONS}:${valor}`  → 'resource:verify', etc.
```

> **Doble uso (ver §8.2):** este catálogo es también la fuente de los **scopes OAuth2** de la API pública (#21). Un subconjunto _exportable_ (p. ej. los `*:read`) se expone como scope público; permisos sensibles (`role:grant`, `accreditation:grant`) **nunca** se exportan. Una sola moneda para web interna y terceros.

### 4.2 Roles del catálogo fijo (mapeo de TUS actores)

| Actor (del brief / spec §6) | `roleId` | Scope típico | Permisos clave |
|---|---|---|---|
| Admin central | `platform_admin` | platform | _todos_ (sustituye `isAdmin`) |
| Equipo GlobalEmergency | `platform_operator` | platform | `emergency:create/activate/pause`, `accreditation:grant` |
| **Admin de organización** | `org_admin` | organization | **`user:invite`, `role:grant`, `apikey:create`**, `org:edit` |
| Miembro de org | `org_member` | organization | `org:read`, participar |
| Coordinador (ya existe) | `emergency_coordinator` | emergency | `resource:verify`, `need:validate`, `task:assign`, `report:triage` |
| **Validador ("unos validan")** | `emergency_verifier` | emergency / global | `resource:verify`, `campaign:verify`, `need:validate` |
| **Manager de grupo de voluntarios** | `group_manager` | **group** | `volunteer:read+assign`, `task:create` (en su grupo) |
| Voluntario operativo | `volunteer_operative` | emergency / group | `task:checkin_self`, `report:create`, `volunteer:read` (propio) |
| **"Otros solo pueden ver"** | `viewer` | cualquiera | `*:read` |
| Personal de reunificación | `reunification_officer` | emergency | `reunification:read_private/match` |
| Ciudadano logueado (default) | `citizen` | platform | `offer:create`, `resource:register`, lecturas públicas |

```ts
// identity/domain/role-catalog.ts  (catálogo FIJO en esta fase, D2)
export const ROLE_CATALOG: Record<string, { permissions: Permission[]; defaultScope: ScopeType }> = {
  platform_admin:        { permissions: ALL,                                   defaultScope: 'platform' },
  org_admin:             { permissions: ['user:invite','role:grant','apikey:create','org:edit','org:read', /*…*/], defaultScope: 'organization' },
  emergency_coordinator: { permissions: ['resource:verify','need:validate','task:assign','report:triage', /*…*/],  defaultScope: 'emergency' },
  group_manager:         { permissions: ['volunteer:read','volunteer:assign','task:create','task:read'],            defaultScope: 'group' },
  viewer:                { permissions: READ_ONLY,                              defaultScope: 'emergency' },
  // …
};
```

> Las "categorías y tipos dentro de voluntarios" del brief = combinaciones de este catálogo. Si una org necesita una categoría propia ("valida pero no asigna"), eso es **roles custom (fase 2, §4.4)**; en esta fase se cubre eligiendo el rol fijo más cercano.

### 4.3 Encaje con la acreditación (NO confundir ejes — ver §11)

La acreditación de una **org** (eje confianza 🔵🟢🏛️) puede **derivar** grants: una org `official` acreditada → sus miembros obtienen `emergency_verifier` en las emergencias cubiertas por la acreditación. Se modela como **derivación explícita** (un caso de uso que crea grants), **no** fusionando confianza y permisos.

### 4.4 Roles custom por organización (fase 2, fuera de alcance ahora — D2)

Cuando haya demanda: el catálogo pasa de código a **tabla** (`roles`, `role_permissions`), y `org_admin` con `role:create_custom` compone roles a partir del catálogo de permisos, **acotado por atenuación** (§5). El dominio (`AccessControl`, `Grant`, `ScopeRef`) **no cambia**: solo cambia la fuente de `ROLE_CATALOG` (constante → repositorio).

---

## 5. Delegación con atenuación de privilegios (D1 — la _killer feature_)

Esto habilita "orgs que añaden sus propios usuarios" y "managers que gestionan grupos" **sin** intervención central y **sin** escalada de privilegios.

**Dos reglas, y solo dos:**

1. Puedes conceder el rol _R_ en el scope _S_ **solo si** tienes `role:grant` en _S_ o en un **ancestro** de _S_.
2. **Solo puedes conceder permisos que tú ya tienes** en _S_ (atenuación / _privilege non-escalation_): `permisos(R) ⊆ permisos_efectivos(tú, S)`.

```ts
// identity/application/grant-role.ts  (caso de uso)
async function grantRole(actor, targetPrincipalId, roleId, scope) {
  // Regla 1: ¿el actor administra este scope?
  assert(await access.can(actorCtx, 'role:grant', { scopeChain: chainFor(scope) }),
         'No administras este ámbito');

  // Regla 2: atenuación — no puedes dar lo que no tienes
  const actorPerms  = access.effectivePermissions(actorCtx, scope);
  const targetPerms = ROLE_CATALOG[roleId].permissions;
  assert(targetPerms.every(p => actorPerms.has(p)),
         'No puedes conceder permisos que tú no tienes en este ámbito');

  const grant = Grant.create({ principalId: targetPrincipalId, roleId, scope,
                               grantedByPrincipalId: actor.id });
  await grants.save(grant);
  await events.publish(new RoleGranted(grant));  // → audit_log (§11)
}
```

**Consecuencias:**

- Un `org_admin` invita usuarios y les asigna roles **dentro de su org**, pero **nunca** puede fabricar un `platform_admin` ni darse a sí mismo algo que no tenga. Recursivo e infinito → las orgs se autogestionan solas.
- Un `group_manager` asigna voluntarios y crea tareas **en su grupo**; si tiene `role:grant` acotado al grupo, nombra sub-managers, pero jamás escala fuera.
- Todo grant guarda `grantedByPrincipalId` → **cadena de delegación auditable**. Si un org-admin comprometido reparte permisos en masa, se ve en el `audit_log` y se corta por la raíz. Es el mejor control **anti-fraude interno**.

---

## 6. Grupos / cuadrillas y "managers"

Agregado nuevo y pequeño: **`Group`** (cuadrilla, brigada, equipo) dentro de una emergencia (o de una org).

```ts
// groups/domain/group.ts
export interface GroupSnapshot {
  id: string;
  emergencyId: string;            // (o organizationId para grupos permanentes de la org)
  name: string;
  parentGroupId: string | null;   // anidamiento → managers de managers
}
// groups/domain/group-member.ts → (groupId, volunteerId|userId)
```

- Un voluntario **pertenece** a 0..n grupos.
- "Manager de un grupo" = `grant(user, role='group_manager', scope={type:'group', id})`.
- Los permisos del manager aplican **transitivamente** a las entidades cuyo scope cuelga del grupo (tareas/voluntarios del grupo), vía la cadena de scopes (§3.3).
- Grupos anidables (`parentGroupId`) → managers de managers, sin tocar el modelo.

> Esta es exactamente la forma de problema que resuelven los sistemas **ReBAC estilo Zanzibar** (§10). Por eso la tabla de scopes se diseña **con forma de tuplas** (`scope` → `parent` → `scope`), aunque el resolver se escriba a mano ahora.

---

## 7. ABAC — condiciones finas que RBAC puro no captura

Las "15 reglas de oro" del spec (nada se publica sin responsable, ubicación oculta hasta asignación, saturación cierra entregas, medicamentos = bloqueo especial…) **no son permisos, son condiciones**. Capa ABAC evaluada dentro de `can()`:

```ts
// identity/domain/condition.ts
export type Condition =
  | { kind: 'ownership' }                        // solo TU punto, TU reporte
  | { kind: 'emergency_status'; in: Status[] }   // solo si la emergencia está activa
  | { kind: 'data_sensitivity'; max: Level }     // no ver ubicación sensible sin asignación (GDPR, feature 09)
  | { kind: 'time_window'; from: Date; to: Date } // grant solo durante el turno
  | { kind: 'category_lock'; categories: string[] }; // medicamentos → canal especial (feature 04)
```

Regla de diseño: **RBAC decide _qué clase_ de acción; ABAC decide _sobre esta instancia, en este estado, ahora_.** No usar ABAC donde RBAC basta (mata rendimiento y legibilidad).

---

## 8. Principals máquina, API keys y API pública (issues #2, #17–#23)

> **Hallazgo del backlog:** existe el EPIC **#2 "API Pública para desarrolladores"** por fases, cuyas sub-issues **dependen de este modelo de permisos**: **#17** (API keys, "desacoplada de la identidad JWT interna", P1), **#18** (rate-limit/cuotas por key), **#21** (OAuth2 + scopes + consentimiento), **#22** (registro de apps de terceros), **#23** (webhooks firmados). El acceso máquina **no es futuro lejano**: la Fase 1 (API keys read-only) es **P1**. Este diseño es su cimiento.

El error clásico es tratar la API key como "un usuario con contraseña rara". **No.** Hay **dos modelos de acceso máquina distintos**, y ambos entran por el **mismo `can()`** (§9):

### 8.1 Dos modelos de acceso máquina (no confundir)

| Modelo | Issue / Fase | Semántica | Principal | Permisos efectivos |
|---|---|---|---|---|
| **API key** | #17/#18 · Fase 1 · P1 | la app actúa **como sí misma** (server-to-server, _client credentials_) | `ServiceAccount` | grants propios del service-account |
| **OAuth2 + scopes** | #21/#22 · Fase 2 | la app actúa **en nombre de** un usuario/org, con consentimiento | el `User`/`Org`, vía la app cliente | **subconjunto** de los permisos del usuario que el usuario consiente (= atenuación §5) |

### 8.2 El catálogo de permisos ES el catálogo de scopes OAuth2

Decisión de unificación clave: **no inventes un vocabulario de "scopes" aparte para la API pública.** Los _scopes_ OAuth2 de #21 son **proyecciones públicas del catálogo de permisos** (§4.1): `resource:read`, `need:read`, `offer:create`… Un scope público = un permiso (o un bundle nombrado de permisos de solo-lectura para la Fase 1). Beneficios: una sola fuente de verdad, el mismo `can()` decide para web interna y para apps externas, y la pantalla de consentimiento (#21) muestra exactamente los permisos que se delegan.

> Matiz: no todos los permisos se exponen como scope público. Habrá un **subconjunto exportable** (marcado en el catálogo) — p. ej. `*:read` sí, `accreditation:grant` o `role:grant` **nunca**.

### 8.3 ServiceAccount + API key (Fase 1 — #17, #18)

- **`ServiceAccount` es un `Principal`** igual que `User`. Los grants (§3) ya funcionan sobre él sin cambios → **desacoplado del JWT interno**, como pide #17.
- Una **API key es una credencial** que apunta a un principal (un service-account, o un _personal access token_ que cuelga de un user).
- La key lleva un **subconjunto acotado** de los permisos de su dueño (atenuación §5), sus **propios scopes**, **expiración**, **rotación/revocación** (#17), **rate-limit + cuota** (#18) y **audit** independientes. Comprometer una key ≠ comprometer al usuario.

```ts
// identity/domain/api-key.ts
export interface ApiKeySnapshot {
  id: string;
  prefix: string;            // 'rh_live_ab12…' visible, identifica sin revelar
  hashedSecret: string;      // se guarda hash, nunca el secreto (como passwords)
  principalId: string;       // a quién representa (normalmente un service_account)
  scopes: ScopeRefProps[];   // dónde vale (emergencia/org/global)
  permissions: Permission[]; // subconjunto de los del dueño (≤, atenuación) = scopes OAuth2 (§8.2)
  rateLimitPerMin: number;   // #18 — cuota por cliente
  quotaPerDay: number | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;   // detección de fugas
  revokedAt: Date | null;    // #17 — revocación inmediata → 401
}
```

### 8.4 OAuth2 + scopes + consentimiento (Fase 2 — #21, #22): atenuación aplicada a apps

El flujo _authorization-code_ de #21 **es la atenuación de §5 aplicada a una app cliente**: la app pide unos scopes (= permisos), el usuario consiente un **subconjunto**, y la app recibe un token cuyos permisos efectivos = `scopes_consentidos ∩ permisos_del_usuario`. El "registro de apps de terceros" (#22, `client_id`/`secret`/`redirect_uris`) es, en el modelo, **otro tipo de principal** (una `OAuthClient`) que nunca puede exceder lo que el usuario delega. Cero conceptos nuevos en el dominio: es el mismo grafo principal→grant→permiso.

### 8.5 Webhooks (#23)

El permiso gobierna **quién puede suscribirse** y **qué eventos puede recibir** un suscriptor (filtrado por scope: una org solo recibe eventos de sus emergencias). La firma/reintentos son infra (BullMQ existente); la **autorización de la suscripción** pasa por `can()`.

> Que las 4 primitivas (§3) ya contemplen `Principal` polimórfico (`User` | `ServiceAccount` | `OAuthClient`) es **precisamente** lo que permite que toda la API pública (#2) se construya **sin rework** del núcleo de identidad.

---

## 9. Enforcement (D3 — mantener el JWT actual, con los ojos abiertos)

### 9.1 Cómo queda en esta fase

- `JwtAuthGuard` sigue cargando autorización en `request.user`, pero pasa de `memberships[]` a **`grants[]`** (generalización directa).
- El `AccessControl.can()` se resuelve **en memoria** contra esos grants + la cadena de scopes del recurso. La cadena entity→emergency se obtiene con los **`*EmergencyLookup` que ya existen**, extendidos para resolver también `group → emergency → org → platform`.
- **Los 7 `Require*CoordinatorGuard` colapsan en un decorador + un guard:**

```ts
// uso en cualquier controller
@RequirePermission('resource:verify')   // ← reemplaza RequireResourceCoordinatorGuard
@Patch('resources/:resourceId/verify')
verify(/* … */) { /* … */ }
```

```ts
// identity/infrastructure/http/permission.guard.ts (uno solo, genérico)
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly access: AccessControl,
              private readonly scopes: ScopeResolver /* usa los *EmergencyLookup */) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const action = this.reflector.get<Permission>('permission', ctx.getHandler());
    const resource = await this.scopes.resolveFromRequest(req); // cadena de scopes
    return this.access.can({ principalId: req.user.id, grants: req.user.grants }, action, resource);
  }
}
```

> **Win inmediato, no solo futuro:** tu `entity-coordinator-guard.factory.ts` ya casi hace esto; solo le falta preguntar por _permiso_ en vez de por _rol fijo_.

**Varios PEP, un solo PDP.** El plano interno (`JwtAuthGuard`) y el plano de la **API pública** (`/api/public/v1`, con `ApiKeyAuthGuard` de #17 y, en Fase 2, el guard OAuth2 de #21) son **puntos de enforcement (PEP) distintos** que convergen en el **mismo `AccessControl.can()` (PDP)**. Las denegaciones se emiten en formato **RFC 7807** (#16): `401` sin credencial, `403` sin permiso, `429` por cuota (#18). Esto evita duplicar lógica de autorización entre la app y la API pública.

### 9.2 Riesgo aceptado y mitigación ligera

Mantener grants embebidos en un token de 12 h implica **revocación diferida**: revocas un rol y el principal lo conserva hasta que expira el token. En una plataforma anti-fraude esto es un riesgo real. Mitigaciones **sin** migrar al PDP completo:

1. **Acortar `expiresIn`** del access token (p. ej. 1–2 h) y añadir **refresh token** (hoy no existe). Reduce la ventana sin coste de infra.
2. **Denylist ligera en Redis** (que ya está): al revocar un grant crítico, publicar su id/`principalId` + `permissionsVersion`; el guard hace **una** lectura barata de versión y, si no coincide, fuerza re-login. Solo para revocaciones sensibles.
3. **Aceptar la ventana** para revocaciones no críticas.

Recomendación: **(1) + (2)**. Es barato, respeta "mantener JWT actual" y cierra el agujero anti-fraude.

### 9.3 Camino futuro a PDP server-side (cuando haga falta)

JWT mínimo (`principalId` + `permissionsVersion`, ~15 min) + **resolución server-side cacheada en Redis** por `(principal, scope)`, **invalidada por domain-event** (`RoleGranted`/`GrantRevoked`) — apoyado en el Redis + outbox que ya hay. Revocación inmediata y sin bloat. **No requiere tocar el dominio**, solo el adapter de `AuthorizationContext` (de "leer del token" a "leer de Redis").

---

## 10. ¿Dónde vive la política? (decisión de infraestructura)

| Opción | Qué es | Veredicto |
|---|---|---|
| **RBAC propio en Postgres tras puerto** | tablas `grants/roles/permissions/scopes` + resolver a mano | ✅ **Recomendado ahora.** Encaja en hexagonal, cero infra nueva, **barato cuando duerme** (restricción nº1: scale-to-zero). |
| **Zanzibar — OpenFGA / SpiceDB** | servicio de tuplas relacionales, _graph walk_ | Brutal para grupos anidados/managers-de-managers, pero **es un servicio always-on** → mata "dormida ≈ 0". Destino, no inicio. |
| **Cerbos / Oso** | motor de políticas como código (PDP externo) | Buen punto medio si la lógica ABAC explota. Otra pieza que mantener. |

**Recomendación:** modela los datos **con forma de tuplas ReBAC** (`scope-parent-scope`, `principal-rol-scope`) en **tu propio Postgres detrás del puerto `AccessControl`**, resolver a mano. Si algún día la profundidad relacional o el multi-región lo exige, **cambias el adapter a OpenFGA/SpiceDB** sin tocar el dominio. No metas un servicio always-on en un sistema diseñado para dormir gratis.

---

## 11. Ejes ortogonales que NO son permisos (no confundir)

- **Confianza / verificación (🔵🟢🏛️)** ≠ permisos. El nivel de un recurso decide si **se publica**, no qué puede hacer un usuario. Pero la acreditación de una org puede **derivar** grants (§4.3). Ejes separados; derivación explícita.
- **GDPR / fila (RLS)** ≠ acción. Los permisos abren _acciones_; RLS abre _filas_. Dos capas. Datos sensibles (ubicaciones — feature 09, desaparecidos — feature 01, sanitario — feature 04) necesitan filtros de fila por scope **y propósito**, encima del permiso.
- **Audit:** cada `grant/revoke` es evento auditado con su cadena de delegación. Engancha al `audit_log` existente.
- **Break-glass / veto central:** "pausar todo" y el override de admin son **permisos auditados** que idealmente piden _step-up_ (re-autenticación). El grant de scope `platform` siempre gana.

---

## 12. Plan de migración sobre el código (sin big-bang)

| Paso | Qué | Toca |
|---|---|---|
| **1. Fundaciones** | Puerto `AccessControl` + `can()` + `PERMISSIONS` + `ROLE_CATALOG` (constantes) + tests de dominio | nuevo en `identity` |
| **2. Generalizar tabla** | `memberships` → `grants(principal_id, principal_type, role_id, scope_type, scope_id, granted_by, expires_at)`. **Migración de datos:** cada membership → grant `emergency`; cada `isAdmin=true` → grant `platform/platform_admin`; cada org owner/member → grant `organization`. **Quitar `unique(user_id, emergency_id)`** (multi-rol). | identity + organizations schema |
| **3. Sustituir guards** | `@RequirePermission()` + `PermissionGuard` + `ScopeResolver` (reusa `*EmergencyLookup`). Migrar los 7 guards. `isAdmin` pasa a grant; deprecar el booleano. | identity/http + todos los controllers |
| **4. Token (D3)** | `JwtAuthGuard` carga `grants[]`; acortar expiry + refresh token + denylist Redis (§9.2) | identity |
| **5. Delegación + grupos (D1)** | `role:grant` con atenuación; agregado `Group` + `group_manager`. Desbloquea "orgs añaden usuarios" y "managers de cuadrillas". | nuevo contexto `groups` + identity |
| **6. Roles custom (fase 2, D2)** | `ROLE_CATALOG` de constante → tabla; `role:create_custom` | identity |
| **7. Principals máquina (futuro)** | `ServiceAccount` + `ApiKey` + `ApiKeyAuthGuard`, todo por el mismo `can()` | identity |

Pasos 1–4 dejan de sangrar y dan un sistema sólido; 5 es la autogestión (D1); 6–7 son futuro sin rework.

### 12.1 Esbozo de migración Drizzle (paso 2)

```sql
CREATE TABLE grants (
  id                     UUID PRIMARY KEY,
  principal_id           UUID NOT NULL,
  principal_type         TEXT NOT NULL DEFAULT 'user',   -- 'user' | 'service_account'
  role_id                TEXT NOT NULL,                  -- del catálogo fijo
  scope_type             TEXT NOT NULL,                  -- platform|organization|emergency|group|entity
  scope_id               UUID,                           -- NULL para 'platform'
  scope_entity_type      TEXT,                           -- solo para scope 'entity'
  granted_by_principal_id UUID NOT NULL,
  granted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at             TIMESTAMPTZ
);
CREATE INDEX grants_principal_idx ON grants (principal_id);
CREATE INDEX grants_scope_idx     ON grants (scope_type, scope_id);
-- NB: ya NO hay unique(principal, scope): un principal puede tener varios roles en un scope.

-- Migración de datos (idempotente):
INSERT INTO grants (id, principal_id, principal_type, role_id, scope_type, scope_id, granted_by_principal_id)
SELECT id, user_id, 'user',
       CASE role WHEN 'coordinator' THEN 'emergency_coordinator'
                 WHEN 'verifier'    THEN 'emergency_verifier' END,
       'emergency', emergency_id, user_id
FROM memberships;
-- + isAdmin → platform_admin ; + organization_members → org_admin/org_member
```

---

## 13. Privacidad / seguridad / GDPR

- **Minimización:** un grant `viewer` no debe poder leer datos sensibles aunque "vea" la entidad; la sensibilidad se filtra por **ABAC + RLS** (§7, §11), no por el rol.
- **Datos personales de voluntarios/usuarios:** la cadena de delegación (`granted_by`) es dato de tratamiento; incluir en el registro de actividades.
- **Derecho de supresión:** borrar un principal debe **cascada-borrar o seudonimizar** sus grants y las cadenas donde figura como `granted_by`.
- **API keys:** se guarda **hash** del secreto (nunca el secreto), con rotación y revocación; `lastUsedAt` para detección de fugas.
- **Revocación efectiva:** ver §9.2 — la ventana de 12 h es un riesgo GDPR/seguridad documentado, mitigado con expiry corto + denylist.
- **Audit inmutable:** todo `grant/revoke/role-change` va al `audit_log` por emergencia/scope.

---

## 14. Esfuerzo estimado

| Bloque | Esfuerzo |
|---|---|
| Pasos 1–3 (modelo + tabla + guards) | **L — 5-8 días.** El grueso: migrar controllers a `@RequirePermission` y la migración de datos. |
| Paso 4 (token: expiry + refresh + denylist) | **M — 2-3 días.** |
| Paso 5 (delegación con atenuación + grupos) | **L — 5-7 días.** Contexto `groups` nuevo + casos de uso de delegación + UI de gestión. |
| Pasos 6-7 (custom roles, API keys) | Futuro, fuera de este corte. |

El grueso del riesgo está en el paso 3 (tocar muchos controllers): se mitiga con la pirámide TDD (casos de uso con dominio real, puertos fake) que ya usa el proyecto.

---

## 15. Decisiones cerradas y abiertas

### Cerradas (este documento)
1. ✅ **Delegación completa con atenuación** desde día 1 (D1).
2. ✅ **Catálogo fijo de roles** primero; custom = fase 2 (D2).
3. ✅ **Mantener JWT actual** con grants embebidos; riesgo de revocación mitigado con expiry corto + refresh + denylist (D3).

### Abiertas (para PM / equipo)
1. **Granularidad del catálogo de permisos:** ¿~45 permisos como en §4.1, o empezar más grueso (por contexto) y refinar? Recomendación: el de §4.1, ya es legible.
2. **Grupos: ¿por emergencia, por org, o ambos?** El brief sugiere ambos (cuadrillas de emergencia + equipos permanentes de org). Confirmar antes del paso 5.
3. **`emergency_verifier`: ¿scope global o por emergencia?** El spec admite ambos ("global o por emergencia"). Se modela igual; decisión de producto sobre el default.
4. **Derivación acreditación → grants (§4.3): ¿automática o requiere acción de coordinador?** Recomendación: explícita (un coordinador la confirma), por trazabilidad.
5. **Step-up auth para break-glass (pausar todo, override admin): ¿en este corte o futuro?**
6. **¿Mantener `Verifier` como rol o fusionarlo en permisos de `coordinator`?** Con el modelo nuevo, "verifier" es un bundle más pequeño de permisos de validación; conviene mantenerlo separado para el caso "valida pero no coordina".
7. **¿Qué permisos se exportan como scopes OAuth2 públicos (#21)?** Recomendación Fase 1: solo `*:read` del subconjunto ya público. Definir el subconjunto _exportable_ del catálogo (§8.2) antes de #16.
8. **API key: ¿solo `ServiceAccount`, o también _personal access tokens_ que cuelgan de un `User` (#17)?** Recomendación: empezar por `ServiceAccount` (server-to-server, Fase 1); los PAT de usuario, después.
9. **Coordinación con #16/#17:** este documento debería referenciarse desde el diseño de `/api/public/v1` para que API keys (#17) y scopes (#21) reutilicen el catálogo, no inventen uno paralelo.
10. **¿Cuándo promover un "hub logístico" de _recurso_ (entity) a _scope_ de primera clase?** Recomendación: mientras un hub sirva a una sola emergencia, basta `entity`/`group`; cuando un mismo nodo (puerto, terminal aérea, almacén central) opere **varias emergencias a la vez**, promoverlo a `scope: 'hub'` (§16). Decisión activable sin migración del modelo.

---

## 16. Prueba de escalabilidad: actores logísticos transversales (navieras, aerolíneas, hubs, aduanas)

> Esta sección somete el modelo a estrés contra requisitos futuros explícitos del spec —"furgoneta→camión→**naviera/aduanas**", "**transportista**", "crear **manifiesto**/expedición", `lots`/`shipments` (Fase 4)— y contra actores aún no escritos: **gestor de hub logístico, operador de naviera/aerolínea, agente de aduanas**.

### 16.1 Qué estresan estos actores (y qué no)

Hay que separar dos cosas que se confunden:

- **NO estresan el núcleo.** `principal · permiso · rol · grant` es invariante. Estos actores son más de lo mismo.
- **SÍ estresan el _scope_.** A diferencia de un coordinador (vive _dentro_ de una emergencia), una naviera/aerolínea/hub vive en el **plano global** y **cruza emergencias**: el spec ya asume `shipments` con `emergency_id` único (línea 190), y eso es un **árbol estricto** que no expresa "este nodo sirve a varias emergencias". Por eso §3.3 generaliza a **DAG**.

### 16.2 Lo que escala por DATO (cero cambio de arquitectura)

| Requisito futuro | Mecanismo del modelo | ¿Toca arquitectura? |
|---|---|---|
| Naviera / aerolínea / operador logístico / aduana como entidad | nuevo `OrganizationType` (`transport_operator`, `airline`, `customs_authority`) | **No** — enum/data |
| "Gestor de hub", "operador de naviera", "transportista", "agente de aduanas" | nuevos roles del catálogo (§4) | **No** — data (fase 2: incluso roles custom por org) |
| `shipment:create/track`, `manifest:sign`, `customs:clear`, `expedition:close` | nuevos permisos (§4.1) | **No** — data |
| Terminal portuaria, carga aérea, zona aduanera, lote, expedición | nuevos `resource.type` / agregados Fase 4 | **No** — data |
| "No crear expedición sin destino confirmado/receptor/capacidad" (regla del spec §20.3) | condición **ABAC** (§7): `{ kind: 'expedition_ready' }` | **No** — data |
| Carga refrigerada / corredor internacional / despacho aduanero pendiente | condiciones ABAC (`category_lock`, `customs_state`) | **No** — data |
| Acreditación de una naviera válida en todas las emergencias | `Accreditation` scope global (§11) → deriva grants | **No** — ya existe |
| Sistema de la naviera/aerolínea que empuja manifiestos/ETA por API | `ServiceAccount` + API key (§8) | **No** — ya diseñado |

**Veredicto de 16.2:** prácticamente todo el roadmap logístico es **configuración**, no reingeniería. Eso es la prueba de que el modelo escala.

### 16.3 El único endurecimiento de arquitectura: scope = DAG extensible

Dos ajustes, ya incorporados (§3.2 y §3.3):

1. **Tipos de scope = conjunto abierto.** Añadir `hub`, `corridor`, `customs_zone` es ampliar una unión discriminada; el `can()` no se entera.
2. **Resolución sobre el cierre transitivo de ancestros (DAG), no una cadena lineal.** Un recurso puede tener **varios padres**.

**Ejemplo trabajado — el jefe de hub que ve carga de dos emergencias:**

```
Org "MedShip" (type: transport_operator), acreditada GLOBAL en Fase 0.
Hub "Puerto de Valencia"  ── scope { type:'hub', id:'valencia' }
Ana = jefa de operaciones del hub
      grant(Ana, role:'hub_manager', scope:{type:'hub', id:'valencia'})

Shipment S1 → emergency_id = 'venezuela'   ┐  ambos transitan el
Shipment S2 → emergency_id = 'dana'        ┘  hub 'valencia'

Padres de S1 (DAG):  S1 → hub:valencia
                     S1 → emergency:venezuela → platform
```

`can(Ana, 'shipment:read', S1)`:
- cierre de ancestros de S1 = { hub:valencia, emergency:venezuela, platform }
- Ana tiene grant en `hub:valencia` → su rol `hub_manager` incluye `shipment:read` → **permit**.

Ana ve S1 **sin** ser nada en la emergencia "venezuela": su autoridad entra por el **padre hub**, no por el padre emergencia. Un árbol estricto (`shipment ⊂ una emergencia`) **no podría** expresarlo; el DAG sí. Y un coordinador de "venezuela" sigue viendo S1 por el **otro** padre. Las dos autoridades coexisten sin colisión.

### 16.4 Handoffs inter-organización (la naviera opera carga de una ONG)

Cuando un actor de la org A actúa sobre un recurso propiedad de la org B (la naviera mueve un lote de una ONG), la autorización es **relacional**: "transportista_de(envío)". Se resuelve con:

- **grant `entity`-scoped** sobre ese envío concreto (la ONG/coordinador concede `shipment:track` al transportista para ese shipment), **acotado por atenuación** (§5); o
- una **tupla de relación** ReBAC (`carrier_of`, `consignee_of`) — exactamente la forma que §10 recomienda preparar en datos.

Si la profundidad relacional explota (cadenas transportista→subcontrata→aduana→receptor), se **cambia el adapter del puerto `AccessControl` a OpenFGA/SpiceDB sin tocar el dominio** (§10). El modelo ya está diseñado para esa salida.

### 16.5 Veredicto

| Eje | ¿Escala a navieras/aerolíneas/hubs/aduanas? |
|---|---|
| Núcleo principal/permiso/rol/grant | ✅ Sin cambios (todo es data) |
| Roles y permisos logísticos | ✅ Catálogo (data); custom por org en fase 2 |
| Scope transversal multi-emergencia | ✅ Con DAG + tipos de scope abiertos (§3.2/§3.3, §16.3) |
| Handoffs inter-organización | ✅ entity-scope/atenuación ahora; ReBAC externo si la profundidad lo exige (§10) |
| Integraciones de sistemas (API) | ✅ `ServiceAccount`/API key ya diseñado (§8) |

**Conclusión:** lo actual está cubierto y el roadmap logístico es mayoritariamente configuración. El único concepto que estos actores exigen —scope **transversal** a emergencias— ya está resuelto modelando la jerarquía como **DAG extensible**, no como árbol. No se identifica ningún requisito de los citados que obligue a rehacer el núcleo.
