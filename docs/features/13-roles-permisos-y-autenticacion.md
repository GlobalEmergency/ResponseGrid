> ⚠️ **DEPRECADO** — ficha congelada como referencia histórica. El seguimiento de esta feature vive en **GitHub Issues**: implementada. No edites esta ficha; trabaja en el issue. Convención: ver `AGENTS.md` y [`00-indice.md`](00-indice.md).

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
| D4 | **Apuestas North Star** | **Las 4 comprometidas**: IA en el loop · federación de orgs · break-glass · multi-instancia/soberanía | Se **diseña-para-ellas** desde ya (5 invariantes §18.1); se construyen después. |
| D5 | **Topología de despliegue** | **Una instancia global, federable después** | MVP single-instance; multi-instancia/jurisdicción = extensión sin reescritura si se respetan las invariantes (§18.3-f). |

> **D1/D2/D3 son el incremento MVP de una visión mayor.** El North Star (infraestructura crítica federada, multi-jurisdicción, con IA en el loop) y la prueba de que estas decisiones no lo hipotecan están en **§18**. La regla: respetar las **5 invariantes de diseño** (§18.1) hace que "pensar en grande" no cueste nada hoy.

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

> **Nota (post-#51):** la feature de **reunificación familiar** (F01) y los informes de **daños estructurales/SAR** se retiraron del producto en #51. Por eso el permiso `reunification:*` y el rol `reunification_officer` **ya no están en el catálogo implementado** (se eliminaron de `permission.ts` y `role-catalog.ts`). El eje de privacidad/categoría especial (§17) **sigue plenamente vigente** para los verticales sensibles que permanecen —ubicaciones (F09), necesidades nominales (F02/#24) y datos sanitarios (F04)—: los ejemplos basados en "desaparecidos" se conservan como ilustración del **modelo** de dato de categoría especial, no como contrato de una feature activa.

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

### Decididas en esta ronda (cierre técnico)
1. ✅ **Catálogo de permisos:** el de §4.1 (~45). Legible y estable.
2. ✅ **Grupos: ambos** — un `Group` cuelga de `emergencyId` (cuadrilla) **o** de `organizationId` (equipo permanente). Coherente con la federación de orgs (D4).
3. ✅ **`emergency_verifier`:** se permiten **ambos scopes**; **default por-emergencia**, global solo para entidades acreditadas globalmente (§11).
4. ✅ **Derivación acreditación → grants:** **explícita** (un coordinador la confirma), por trazabilidad y anti-fraude.
5. ✅ **Break-glass:** **comprometido como North Star** (D4); se diseña como grant time-boxed/auditado (§18.3-d). El **step-up auth** entra en su construcción, no en el día 1 del MVP.
6. ✅ **`Verifier`:** se **mantiene separado** de `coordinator` (caso "valida pero no coordina").
7. ✅ **Scopes OAuth2 públicos:** Fase 1 = solo `*:read` del subconjunto ya público; el conjunto _exportable_ excluye toda clase `personal`/`special` (§17.8).
8. ✅ **API key:** primero **`ServiceAccount`** (server-to-server, Fase 1); PAT de usuario después.
9. ✅ **Coordinación con #16/#17:** sí — `/api/public/v1` reutiliza este catálogo; no se crea uno paralelo.
10. ✅ **Hub como scope:** `entity`/`group` mientras sirva una emergencia; promover a `scope:'hub'` cuando opere varias (sin migración del modelo).

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

---

## 17. Prueba de privacidad: control a nivel de fila y de campo (RLS · ABAC · GDPR)

> Los permisos (§4) responden "¿puede este principal hacer la acción X sobre el **tipo** Y?". Pero la privacidad de **este** dominio —ubicaciones sensibles (F09), personas desaparecidas (F01), necesidades nominales por beneficiario (F02/#24), datos sanitarios (F04), manifiestos con datos del consignatario— **no se juega a nivel de acción, sino de FILA y de CAMPO**. Esta sección somete ese eje al mismo estrés que §16.

### 17.1 Cuatro capas, no una

Confundirlas es el error que convierte la privacidad en un parche. Son ortogonales y **todas** necesarias:

| Capa | Pregunta | Mecanismo | Ejemplo |
|---|---|---|---|
| **1. Acción** (RBAC) | ¿puede leer informes de desaparecidos? | permiso `reunification:read_private` (§4) | sin él → 403 |
| **2. Fila** (RLS + scope) | ¿**qué** informes? | predicado RLS derivado del scope (§17.2) | solo los de emergencias donde tiene grant |
| **3. Campo** (ABAC + proyección) | ¿**qué campos** de esa fila? | clase de sensibilidad + proyección por audiencia (§17.4) | ve estado, **no** `documentId` ni teléfono salvo asignación |
| **4. Propósito/ciclo** (GDPR) | ¿para qué, cuánto tiempo, auditado? | base legal, retención, purga, auditoría de acceso (§17.7) | acceso registrado; purga al cerrar la emergencia |

El modelo de §1–§16 cubre la capa 1 y (vía scope) la 2. Las capas **3 y 4** son el endurecimiento de privacidad que formaliza esta sección.

### 17.2 Regla de oro: las políticas RLS se DERIVAN del modelo de grants (una sola verdad)

El riesgo número uno de RLS es crear una **segunda** lógica de autorización en SQL que diverge de la del dominio. Para evitarlo, el predicado RLS **no decide nada nuevo**: solo refleja el límite de scope que ya calcula `AccessControl`.

```sql
-- RLS "tonta y gruesa": solo el límite de aislamiento; la inteligencia vive en el dominio.
CREATE POLICY emergency_isolation ON needs
  USING (emergency_id::text = ANY (
    string_to_array(current_setting('app.scope_emergencies', true), ',')
  ));
```

```ts
// El contexto del principal (de §9, el JWT con grants) se inyecta en la sesión Postgres por transacción.
async withPrincipal(ctx: AuthorizationContext, work: () => Promise<T>): Promise<T> {
  await db.execute(sql`SET LOCAL app.principal_id = ${ctx.principalId}`);
  await db.execute(sql`SET LOCAL app.scope_emergencies = ${readableEmergencyIds(ctx).join(',')}`);
  return work();
}
```

### 17.3 Dos muros, sin violar "la lógica vive en el dominio"

Tensión real con la arquitectura (§7.1 del spec: *"la lógica vive en el dominio, no en la BD"*) vs. RLS (que empuja autorización a la BD). Resolución honesta — **defensa en profundidad con un dueño claro**:

- **Muro 1 (autoritativo, testeable): el dominio.** `can()` + proyecciones (§17.4) son la fuente de verdad; el grueso del TDD (§7.3 del spec) los cubre.
- **Muro 2 (red de seguridad): RLS.** Garantiza que **ninguna** query pueda filtrar filas de otra emergencia **aunque un caso de uso olvide un filtro**. No decide políticas; impone el límite de aislamiento.

Así se conserva "la lógica en el dominio" (el muro 1 manda) **y** se obtiene la garantía anti-fuga de RLS (el muro 2 no depende de que el programador acierte). Coherente con la "puerta de escape de escalado" del spec (§7.5): una emergencia ultra-sensible se promueve a esquema/BD propia sin tocar la identidad.

### 17.4 Sensibilidad de campo = proyecciones por audiencia (encaja en CQRS-lite, y ya lo hacéis)

La capa 3 es la que falta formalizar. **Ya existe ad-hoc en el código:** la migración `0015_location_sensitivity.sql` documenta *"el agregado siempre guarda coordenadas exactas; la aproximación se aplica al serializar en la respuesta pública"*. Eso es exactamente enmascarado en la **proyección de lectura**, no en el cliente. Se generaliza:

```ts
// La sensibilidad se aplica al LEER (proyección CQRS-lite), NUNCA en el DTO del cliente:
// si la fila sale de la BD con el dato exacto, ya hubo fuga.
function projectNeed(need: Need, viewer: AuthorizationContext): NeedView {
  const precise =
    need.locationSensitivity === 'public' ||
    access.can(viewer, 'need:read_precise_location', need); // p. ej. asignado (ABAC)
  return {
    id: need.id, category: need.category, status: need.status, quantity: need.quantity,
    location: precise ? need.exactCoords : fuzzToCentroid(need.exactCoords),
  };
}
```

Regla: **cada campo tiene una _clase de sensibilidad_** (`public` · `operational` · `personal` · `special`), y existe **una proyección por audiencia** (`PublicView`, `CoordinatorView`, `AssignedView`) elegida por `can()` + clase. No hay "una entidad que se serializa distinto a mano" en seis sitios.

### 17.5 Recorrido por los datos sensibles del dominio

| Dato sensible | Fila — ¿quién la ve? | Campo — ¿qué se enmascara? | Mecanismo | Hoy en código |
|---|---|---|---|---|
| Ubicación de punto/necesidad (F09) | público (aprox.) / asignado (exacta) | coords → centroide | clase `personal` + ABAC `assigned` | ✅ parcial (`location_sensitivity` en needs) |
| Persona desaparecida (F01) | solo `reunification:read_private` en esa emergencia | `documentId`, `reporter.phone/email` ocultos salvo autorizado | acción + fila + clase `special` | ⚠️ existe el dato; falta proyección por clase |
| Necesidad nominal por beneficiario (F02/#24) | coordinación; **nunca** público | identidad del beneficiario | proyección `public` sin PII | ⚠️ feature pendiente (#24) |
| `skillSpecialty` sanitario (F04) | coordinación | texto libre (p. ej. patología) | clase `special`, fuera de logs | ⚠️ a clasificar |
| PII de voluntario | coordinador / su manager de grupo | contacto | clase `personal` + scope `group` | ⚠️ a clasificar |
| Antifraude de campaña (CIF, cuenta) | verificador/coordinador | datos bancarios/responsable | clase `personal`, no público | ⚠️ a clasificar |
| Manifiesto / consignatario (Fase 4) | logística por scope `hub` (§16) | identidad/dirección del beneficiario | **clase `special`** aunque vea la fila (§17.6) | 🔜 roadmap |
| Acceso a categoría especial | — | — | **auditoría de acceso** (§17.7) | ✅ `audit_log` (access-log) |

### 17.6 Interacción con §16: el scope te da la FILA, la sensibilidad gobierna el CAMPO

El caso que demuestra que las dos pruebas (escalabilidad y privacidad) **componen** sin colisión. Retomando a Ana, jefa del hub de Valencia (§16.3):

```
Shipment S1 (emergency:venezuela) transita hub:valencia
  campos logísticos:  weight, route, eta, status          → clase 'operational'
  manifiesto:         consignee.name, consignee.address    → clase 'special' (PII del beneficiario)

can(Ana, 'shipment:read', S1)      → PERMIT  (vía padre hub, DAG §16) → ve la FILA
project(S1, Ana):
  - campos 'operational' → visibles  (los necesita para coordinar la carga)
  - campos 'special'     → requieren 'manifest:read_pii' con propósito 'delivery'
                           Ana NO lo tiene → consignatario ENMASCARADO
```

Ana coordina el envío **sin ver la identidad del beneficiario**. El **scope abrió la fila; la sensibilidad cerró el campo.** Un modelo que solo tuviera scope (RLS) le habría enseñado la PII; uno que solo tuviera permisos de acción no habría sabido enseñarle la carga. Hacen falta las dos capas, y el modelo las tiene.

### 17.7 Propósito, consentimiento, auditoría, retención y borrado (GDPR)

La capa 4, donde el spec marca *bloqueante legal* (§11):

- **Limitación de propósito:** el dato se usa solo para el fin consentido (el teléfono del voluntario para coordinar tareas, no para difusión). Se modela como condición ABAC `purpose` o conjunto de propósitos permitidos en la credencial (§8). MVP: registrar consentimiento + auditar acceso; propósito formal como fase posterior.
- **Auditoría de acceso a categoría especial:** el `audit_log` **implementado** es un _access-log_ (actor, método, path, entidad, status) **sin payload** — buena decisión de privacidad. Requisito: que las **lecturas** (`GET`) de desaparecidos/nominales/sanitarios se auditen, no solo las mutaciones. (Nota: el spec proponía `before/after`; la implementación eligió access-log: **mantenerla así** evita que el propio audit sea una fuga de PII.)
- **Retención y purga:** purga por emergencia al cerrar (§7.4 spec) como job de ciclo de vida; **derecho de supresión** → cascada/seudonimización del sujeto **y** de la cadena de grants donde figure (§5).
- **El audit no debe guardar categoría especial** en claro: referenciar por id, nunca volcar el campo.

### 17.8 Interacción con el plano máquina (§8): export público y API keys

- La **API pública read-only** (#19) sirve **solo la proyección `public`** (ubicaciones difusas, cero PII). 
- El subconjunto **exportable** como scope OAuth2 (§8.2) **excluye toda clase `personal`/`special`**. Una API key **nunca** obtiene una proyección más permisiva que su principal.
- Los **webhooks** (#23) transportan payload de proyección pública o solo ids — jamás PII.

### 17.9 Anti-patrones a evitar (la parte "brutal")

1. **RLS divergente:** reimplementar políticas en SQL que contradicen al dominio → dos verdades que derivan. RLS solo el límite de scope (§17.2).
2. **Enmascarar en el DTO/cliente:** si la fila salió de la BD con el dato exacto, **ya hubo fuga**. Enmascarar en la proyección de lectura (§17.4).
3. **PII en el JWT:** grants sí (§9), datos del sujeto no.
4. **PII en el audit:** nada de `before/after` con categoría especial; access-log sin payload (§17.7).
5. **Coordenadas exactas en logs/eventos de dominio:** los domain events que cruzan Redis/colas no deben llevar PII ni ubicación exacta de entidades sensibles.
6. **Exportar campos sensibles por la API pública/scopes** (§17.8).

### 17.10 Veredicto + decisiones abiertas

| Capa | ¿Cubierta por el modelo? |
|---|---|
| Acción (RBAC) | ✅ catálogo de permisos (§4) |
| Fila (RLS + scope) | ✅ predicado derivado del grant; doble muro (§17.2–17.3) |
| Campo (sensibilidad + proyección) | ✅ patrón formalizado; ya existe ad-hoc en `0015` (§17.4) |
| Propósito/ciclo (GDPR) | ⚠️ mecanismo definido; **base legal y retención son decisión legal** (§17.7) |

**Conclusión:** el eje de privacidad **no** se resuelve con permisos solos, y el modelo no lo pretende: aporta las cuatro capas y, lo importante, las **deriva de una sola fuente** (el grant/scope) para que RLS y enmascarado no se conviertan en un segundo sistema de autorización. El único trabajo no-cubierto-por-arquitectura es **clasificar los campos por sensibilidad** (mecánico) y **cerrar la base legal/retención** (decisión legal del spec §11).

**Decisiones de privacidad — cierre de esta ronda:**
1. ✅ **Base legal por categoría de dato** — **adoptada como _default de trabajo_** (aprobada por producto): _interés vital_ (categoría especial en catástrofe: desaparecidos, sanitario) · _interés legítimo_ (coordinación operativa) · _consentimiento_ (voluntarios, datos de contacto). ⚖️ Pendiente solo de **ratificación legal por jurisdicción** antes de producción (spec §11) — no bloquea diseño ni implementación.
2. ✅ **Ventanas de retención y purga** — **adoptadas como _default de trabajo_** (aprobadas por producto): purga al cerrar la emergencia + ventana de gracia de 30 d para export/informe; categoría especial con el mínimo imprescindible. ⚖️ Pendiente solo de **ajuste/ratificación legal por jurisdicción**.
3. ✅ **Cifrado en reposo / esquema propio para categoría especial:** **sí** para desaparecidos y sanitario — se activa la puerta de escape del spec §7.5 para esos verticales desde su entrada.
4. ✅ **Propósito formal (ABAC `purpose`):** **fase 2.** MVP = consentimiento + auditoría de acceso.
5. ✅ **Clases de sensibilidad:** **2 ahora** (público/sensible, como `0015`); **4** (`public/operational/personal/special`) cuando entren manifiestos y sanitario.

---

## 18. Visión a gran escala (North Star) — qué diseñar AHORA vs construir después

> Pensar en grande no es meter features en el MVP: es elegir las **invariantes** que hacen que el futuro grande sea una **extensión**, no una **reescritura**. ResponseGrid aspira a ser **infraestructura crítica** de respuesta a catástrofes: multi-país, multi-jurisdicción, multi-organización, con ecosistema de API, integraciones gubernamentales y logística internacional. Esta sección fija el destino y prueba que el núcleo (§1–§17) lo aguanta.

> **Decisión (D4/D5):** las **cuatro** apuestas de §18.3 —IA en el loop (a/c), federación de orgs (b), break-glass (d), multi-instancia/soberanía (e/f)— quedan **comprometidas como North Star**: se diseña-para-ellas desde ya, se construyen después. Topología objetivo: **una instancia global, federable después** (multi-instancia es extensión, no reescritura, si se respetan las 5 invariantes).

### 18.1 Las 5 invariantes de diseño (si se respetan, nada de lo de abajo exige rehacer el núcleo)

1. **Principal polimórfico:** `User | ServiceAccount | OAuthClient | AIAgent | …`. Todo lo que actúa es un principal.
2. **Todo es `grant(principal, rol, scope)`:** una tabla, una regla de resolución.
3. **Scope = DAG de tipos abiertos** (§3, §16): `platform/org/emergency/group/hub/entity/…`, multi-padre.
4. **La política vive tras un puerto** (`AccessControl`): el motor es reemplazable (propio → Zanzibar) sin tocar el dominio.
5. **Una sola moneda: permiso = scope OAuth2 = tupla de relación** (§8.2): lista para federar.

El resto de §18 es la demostración de que cada ambición encaja en estas cinco.

### 18.2 Re-examen de las decisiones con lente ambiciosa

| Decisión MVP | Extensión "en grande" | Coste de diseñarlo ahora |
|---|---|---|
| **D1** delegación con atenuación | **Federación de organizaciones anidadas** (§18.3-b): Cruz Roja Int'l → nacional → delegación provincial; la atenuación fluye por el árbol de orgs igual que por el de scopes | Bajo: añadir `parentOrganizationId`; la regla de atenuación ya es recursiva |
| **D2** catálogo fijo de roles | **Roles como _assets de plantilla_** (§18.3-a): una plantilla "Sismo/Sanitario" trae su _role pack_, como trae el catálogo de material. Roles custom por org = caso particular | Bajo: el rol ya es dato; se mueve al contexto `templates` |
| **D3** mantener JWT | **PDP como objetivo cercano, no lejano**: para infraestructura crítica, la revocación inmediata y la **auditabilidad de cada decisión** no son opcionales. Ya tienes Redis+eventos+outbox | Medio: pero el puerto `AccessControl` hace que el cambio sea un no-evento |

> Recomendación de gran escala: **mantener D1/D2/D3 como incremento MVP**, pero comprometerse explícitamente con estas tres extensiones como destino. Ninguna contradice el MVP; todas son "diseñar-para-ello ahora, construir después".

### 18.3 Las dimensiones que faltaban (todas caben en las 5 invariantes)

**(a) Roles y permisos como assets de plantilla.** El contexto `templates` ya pre-carga catálogo de material, mensajes y categorías por tipo de emergencia (Fase 0). Añadir **role packs** a la plantilla: "Sismo/Sanitario" trae `reunification_officer`, `medical_coordinator`…; "Inundación" trae otros. Activar una emergencia instancia su modelo de permisos en segundos. Unifica D2 con un sistema que ya existe.

**(b) Organizaciones anidadas / federadas.** Hoy `organizations` es una lista plana. En grande, las orgs forman un **DAG** (`parentOrganizationId`): una matriz acredita y delega en sus filiales, recursivamente, con atenuación (§5). Esto es lo que permite onboarding de federaciones reales (Cruz Roja, Cáritas, redes de ayuntamientos) sin gestión central. Mismo patrón que el scope-DAG (§16) aplicado al plano de identidad.

**(c) Agentes de IA como principals de primera clase.** Un agente de triage, de matching oferta↔necesidad o de borrador de decisiones de coordinación **es un `ServiceAccount` especializado** (`AIAgent`). Diseño que honra estructuralmente el "IA nunca como decisión final" del spec (§10):
- permisos **acotados a `*:suggest` y `*:read`**, jamás `*:decide`/`*:verify`;
- condición ABAC `requires_human_confirmation` en toda sugerencia que mute estado;
- **atenuación** (§5): un agente que actúa para un coordinador **nunca** excede a ese coordinador;
- auditado y revocable al instante como cualquier principal.

El que el modelo de principals ya sea polimórfico convierte "meter IA en el loop" en **configuración, no arquitectura**. Es el mayor dividendo de la invariante 1.

**(d) Break-glass / acceso de emergencia como protocolo diseñado.** En catástrofe, "las primeras horas" a veces exigen que un respondedor verificado actúe **antes** de la delegación formal. En vez de prohibirlo (y que la gente comparta credenciales) o permitirlo sin control, se modela un **grant break-glass**: autoservible por principals pre-verificados, **time-boxed** (p. ej. 2–4 h), con **motivo obligatorio**, **auto-revocado**, **máxima auditoría** y notificación inmediata a admins de plataforma. Es el caso de uso que la mayoría de sistemas de permisos no tiene y que este dominio necesita de verdad.

**(e) Confianza portable (verifiable credentials).** La acreditación (§11) puede emitirse como **credencial verificable** (W3C VC / DID) firmada: una acreditación "Oficial" de Cruz Roja es criptográficamente verificable **fuera** de ResponseGrid (UN OCHA, sistemas gubernamentales). Convierte a la plataforma en **emisor/verificador de confianza** de una federación de respuesta a desastres. North Star lejano, pero la acreditación actual es la semilla exacta.

**(f) Multi-instancia y soberanía de datos.** La "puerta de escape" del spec (§7.5) ya promueve emergencias ultra-sensibles a esquema/BD propia. En grande: **instancias por región** (UE, LATAM…) por residencia de datos y jurisdicción, con **identidad y confianza federadas** (un coordinador acreditado en la instancia UE es reconocido en la LATAM vía VC, §18.3-e). La privacidad (§17) gana una dimensión **`jurisdiction`** (base legal y retención por país).

**(g) Estado final Zanzibar (decisión firme, no hedge).** Con navieras, aduanas, handoffs inter-org, orgs anidadas y jerarquías de grupos, **la profundidad relacional crecerá**. La apuesta ambiciosa: **modelar todo como tuplas de relación desde el día 1** (aunque el resolver sea propio al principio). Migrar a OpenFGA/SpiceDB pasa a ser **cambiar el resolver, no remodelar los datos**. Invariantes 4 y 5.

**(h) Inteligencia de autorización (observabilidad + anti-fraude del propio acceso).** Toda decisión de `can()` **explicable** ("¿por qué se permitió/denegó?") y todo cambio de grant analizable. Sobre el `audit_log` (access-log, §17.7) + las herramientas de analítica ya conectadas (PostHog/Datadog): **detección de anomalías** (un org-admin que concede 500 roles en una hora = señal anti-fraude). El control anti-fraude deja de ser solo de campañas y pasa también a la capa de acceso.

### 18.4 Mapa "diseñar ahora vs construir después"

| Ambición | ¿Diseñar ahora? | ¿Construir cuándo? | Coste si NO se diseña ahora |
|---|---|---|---|
| Principal polimórfico (IA, API, OAuth) | ✅ Sí (invariante 1) | API keys Fase 1; IA/OAuth después | **Alto** — reescritura del núcleo de identidad |
| Scope DAG + tipos abiertos | ✅ Sí (invariante 3) | hubs cuando entre logística | **Alto** — re-modelar autorización |
| Tuplas de relación + puerto `AccessControl` | ✅ Sí (invariantes 4-5) | swap a Zanzibar si la profundidad lo exige | **Alto** — migración de datos masiva |
| Roles como assets de plantilla | 🟡 Reservar el sitio | con roles custom (fase 2) | Bajo |
| Orgs anidadas (`parentOrganizationId`) | 🟡 Columna ahora, lógica después | con federaciones reales | Medio |
| Break-glass | 🟡 Tipo de grant previsto | cuando haya operación real en campo | Bajo |
| SSO empresarial (SAML/OIDC) + SCIM | 🟢 Solo el puerto `IdentityProvider` | con adopción institucional | Bajo (el puerto ya está en el spec §7.4) |
| Verifiable credentials / multi-instancia | 🟢 No bloquear el modelo | North Star | Bajo si se respetan las 5 invariantes |
| PDP + revocación inmediata + decisión auditable | ✅ Puerto ahora, motor pronto | tras MVP | Medio |

### 18.5 El test del rework (la prueba de "pensar en grande sin pagarlo ahora")

**Pregunta:** ¿cuál de estas ambiciones obliga a rehacer el núcleo si se respetan las 5 invariantes (§18.1)? **Respuesta: ninguna.**

- IA en el loop → nuevo subtipo de principal + permisos `*:suggest`. **Config.**
- Federación de orgs → una columna `parentOrganizationId` + atenuación ya recursiva. **Aditivo.**
- SSO de un gobierno con 5.000 personas → un adapter del puerto `IdentityProvider` + mapeo de claims a grants (JIT/SCIM). **Adapter.**
- Zanzibar → swap del resolver tras el puerto. **Adapter.**
- Multi-instancia/jurisdicción → dimensión en privacidad + confianza federada. **Extensión.**
- Break-glass → un tipo de grant time-boxed. **Aditivo.**

**Conclusión:** el modelo no solo cubre lo actual, lo logístico y la privacidad — está **diseñado para ser infraestructura crítica federada con IA en el loop**, y lo hace sin que el MVP cargue con esa complejidad. Las 5 invariantes son el contrato; mientras se respeten, "pensar en grande" sale gratis hasta el día en que toque construir cada pieza.
