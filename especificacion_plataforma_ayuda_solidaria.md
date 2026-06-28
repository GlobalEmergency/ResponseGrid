# Especificación funcional rápida  
## Plataforma de coordinación de ayuda solidaria y donaciones en emergencias internacionales

**Versión:** 0.1  
**Fecha:** 25 de junio de 2026  
**Contexto inicial:** posible movilización de ayuda desde España hacia Venezuela tras emergencia sísmica.  
**Objetivo:** ordenar la solidaridad ciudadana, evitar saturación logística y canalizar la ayuda hacia necesidades reales, verificadas y trazables.

---

# 1. Resumen ejecutivo

La aplicación debe servir para coordinar iniciativas espontáneas de ayuda, puntos de recogida, voluntariado, donaciones en especie y necesidades logísticas.

El problema principal no es solo recibir ayuda, sino evitar que la ayuda desorganizada se convierta en un segundo problema operativo: almacenes saturados, material inútil, medicamentos sin control, campañas falsas, transporte sin destino, expectativas irreales y voluntarios sin tarea.

La plataforma debe funcionar con dos niveles:

1. **Modo operativo ultra simple**, pensado para personas desbordadas en puntos de recogida, asociaciones, almacenes o iniciativas locales.
2. **Modo coordinación**, pensado para equipos con más capacidad de análisis, validación, priorización y gestión logística.

La regla general debe ser:

> **Captura simple en campo, estructuración en retaguardia.**

El usuario operativo no debe rellenar formularios largos. Debe poder informar con una foto, un botón y, como máximo, una categoría aproximada.

---

# 2. Lecciones aprendidas aplicables

## 2.1. DANA de Valencia

Lecciones principales:

- La solidaridad puede crecer más rápido que la capacidad de coordinarla.
- Los puntos de recogida pueden saturarse en pocas horas.
- Los voluntarios espontáneos necesitan tareas concretas, turnos y puntos de coordinación.
- Enviar material sin destino confirmado puede colapsar almacenes.
- La ropa, el agua embotellada y los productos mezclados suelen generar mucha carga logística.
- Hace falta capacidad para cerrar o pausar recogidas de forma rápida.
- Las redes sociales y WhatsApp pueden crear iniciativas útiles, pero también duplicidades, bulos y puntos no autorizados.

## 2.2. Ucrania y emergencias internacionales

Lecciones principales:

- La ayuda internacional requiere más control que la ayuda local.
- Los envíos en especie necesitan documentación, aduanas, destino, receptor y logística confirmada.
- Los medicamentos y productos sanitarios requieren trazabilidad, conservación y canal autorizado.
- Los contenedores o envíos improvisados pueden quedarse bloqueados o llegar tarde.
- Es fundamental diferenciar entre “quiero ayudar” y “hay una necesidad validada”.

## 2.3. Emergencias humanitarias en general

Lecciones principales:

- No debe aceptarse “de todo”.
- Las necesidades cambian por fases: rescate, emergencia, sostenimiento, recuperación.
- Lo que se necesita el primer día puede no ser útil una semana después.
- La comunicación clara reduce el caos.
- La ausencia de un canal oficial provoca que la ciudadanía cree canales paralelos.

---

# 3. Objetivo de la plataforma

La plataforma debe responder a cuatro preguntas:

1. **Qué se necesita realmente.**
2. **Quién lo solicita y quién lo valida.**
3. **Dónde se puede entregar o canalizar.**
4. **Qué salida logística tiene hasta destino.**

Si una donación, campaña, punto o iniciativa no supera estas preguntas, el sistema debe reconducirla o bloquearla.

---

# 4. Principios rectores

## 4.1. Activar la ayuda en especie solo cuando esté validada

La ayuda en especie solo debe activarse cuando exista:

- necesidad validada;
- lista cerrada de material;
- punto autorizado;
- capacidad de almacenamiento;
- transporte confirmado;
- receptor final o intermediario logístico validado.

## 4.2. No aceptar material genérico

La plataforma debe impedir mensajes como:

- “se acepta de todo”;
- “trae lo que puedas”;
- “necesitamos cualquier cosa”;
- “mañana sale un camión/avión” sin documentación.

Debe trabajar con categorías y listas cerradas.

## 4.3. No transportar sin destino

Regla dura:

> **No se genera expedición si no existe destino confirmado, receptor responsable y capacidad de recepción.**

## 4.4. Tolerancia con datos imperfectos, rigidez con decisiones peligrosas

El sistema debe tolerar:

- fotos borrosas;
- cantidades aproximadas;
- categorías dudosas;
- “no lo sé”;
- reportes incompletos;
- notas de audio;
- mala cobertura.

Pero debe ser estricto con:

- medicamentos;
- campañas económicas;
- apertura de puntos;
- publicación pública;
- transporte;
- expediciones;
- destino;
- cierre por saturación.

---

# 5. Usuarios y roles

## 5.1. Ciudadano donante

Puede:

- consultar cómo ayudar;
- ofrecer material;
- ofrecer transporte;
- ofrecer espacio;
- apuntarse como voluntario;
- consultar puntos autorizados;
- recibir instrucciones de entrega.

No puede:

- crear campañas públicas sin validación;
- publicar puntos de recogida;
- solicitar material en nombre de terceros;
- canalizar medicamentos;
- gestionar expediciones.

## 5.2. Responsable de punto de recogida

Puede:

- cambiar estado del punto;
- enviar fotos rápidas;
- solicitar recogida;
- reportar incidencias;
- consultar qué acepta y qué no acepta;
- registrar lotes simples;
- cerrar temporalmente el punto;
- recibir instrucciones de coordinación.

No debe tener que gestionar inventario complejo.

## 5.3. Voluntario operativo

Puede:

- registrarse;
- indicar disponibilidad;
- recibir tareas concretas;
- hacer check-in/check-out;
- reportar incidencias;
- enviar fotos.

No debe autodesplazarse ni actuar sin asignación.

## 5.4. Coordinador

Puede:

- validar puntos;
- validar campañas;
- revisar fotos;
- clasificar reportes;
- asignar recogidas;
- cerrar puntos saturados;
- activar avisos públicos;
- priorizar necesidades;
- crear expediciones;
- gestionar incidencias.

## 5.5. Entidad verificadora

Puede ser una ONG, administración, consulado, asociación reconocida, operador logístico o entidad humanitaria.

Puede:

- validar necesidades;
- validar campañas;
- autorizar categorías;
- aprobar puntos;
- bloquear iniciativas;
- validar receptores;
- emitir instrucciones.

## 5.6. Administrador central

Puede:

- gestionar usuarios y permisos;
- auditar cambios;
- exportar datos;
- configurar categorías;
- activar modo emergencia;
- pausar recogidas;
- revisar alertas antifraude.

---

# 6. Modo operativo ultra simple

## 6.1. Objetivo

Permitir que una persona desbordada pueda informar del estado real del punto en menos de 20 segundos.

## 6.2. Pantalla principal

Ejemplo:

```text
¿Cómo está tu punto ahora?

[ 🟢 Normal ]
[ 🟡 Mucho volumen ]
[ 🔴 Saturado / parar entregas ]
[ 🚚 Necesito recogida ]
[ ⚠️ Incidencia ]
[ 📷 Enviar foto ]
```

Información visible:

```text
Estado público actual:
🟡 Aceptando solo higiene, pañales y baterías

Última actualización:
hace 42 minutos
```

## 6.3. Funciones mínimas

1. Cambiar estado del punto.
2. Enviar foto rápida.
3. Solicitar recogida.
4. Reportar incidencia.
5. Cerrar punto temporalmente.
6. Consultar instrucciones actuales.
7. Ver categorías permitidas.
8. Registrar lote simple.
9. Escanear QR.
10. Pedir ayuda a coordinación.

---

# 7. Flujo “Enviar foto rápida”

## 7.1. Paso 1: pulsar “Enviar foto”

El usuario solo debe hacer una foto o seleccionar una imagen.

## 7.2. Paso 2: categoría aproximada

```text
¿Qué estás fotografiando?

[ Material recibido ]
[ Almacén / acumulación ]
[ Punto saturado ]
[ Material dudoso ]
[ Incidencia ]
[ Voluntarios / cola ]
[ Transporte / carga ]
[ No lo sé ]
```

## 7.3. Paso 3: volumen aproximado

```text
¿Cuánto hay aproximadamente?

[ Poco ]
[ Medio ]
[ Mucho ]
[ Palé / varias cajas ]
[ No lo sé ]
```

## 7.4. Paso 4: envío automático

La app añade automáticamente:

- usuario;
- punto;
- fecha;
- hora;
- ubicación si está disponible;
- estado del punto;
- fotos;
- categoría aproximada.

---

# 8. Modo “solo foto”

Debe existir una funcionalidad aún más simple:

- enviar foto;
- nota opcional;
- audio opcional.

Nada más.

El reporte entra en una cola de revisión para coordinación.

Esto es clave porque muchas personas solo podrán mandar una foto por WhatsApp o desde el móvil.

---

# 9. Entrada por WhatsApp o canal externo

La plataforma debe admitir información imperfecta desde canales externos.

Ejemplos:

```text
SATURADO
```

```text
RECOGIDA
```

```text
INCIDENCIA medicamentos
```

```text
FOTO material higiene
```

No es imprescindible automatizar todo al inicio. Puede empezar como un canal supervisado por coordinación, pero debe poder convertirse en reportes dentro del sistema.

Canales posibles:

- WhatsApp Business;
- Telegram;
- email;
- formulario móvil;
- PWA.

---

# 10. Estados del punto de recogida

## 10.1. Estados públicos

- **Abierto**
- **Abierto solo con cita**
- **Solo categorías prioritarias**
- **Saturado**
- **Cerrado temporalmente**
- **Cerrado definitivamente**
- **Pendiente de recogida**
- **Estado no confirmado**

## 10.2. Estados internos

- necesita voluntarios;
- necesita cajas;
- necesita transporte;
- necesita clasificación;
- necesita responsable;
- tiene incidencia;
- posible material no autorizado;
- posible fraude;
- exceso de material no prioritario.

## 10.3. Recordatorio de estado

Cada cierto tiempo, por ejemplo cada 4 horas, el sistema debe preguntar:

> ¿Tu punto sigue aceptando material?

Si no hay respuesta, el punto puede pasar a:

> Estado no confirmado

Esto evita que un punto aparezca como activo cuando ya no lo está.

---

# 11. Botón crítico: “Parar entregas”

Debe existir un botón muy visible:

```text
🔴 Parar entregas
```

Al pulsarlo:

1. El punto pasa a rojo.
2. Se oculta como punto activo en el mapa público.
3. Se muestra aviso: “No llevar más material a este punto”.
4. Se avisa a coordinación.
5. Se bloquean nuevas citas.
6. Se crea recomendación de recogida.
7. Se avisa a voluntarios asignados.
8. Se permite seguir enviando fotos e incidencias.

Esta función es crítica para evitar saturación.

---

# 12. Flujo “Necesito recogida”

## 12.1. Tipo de material

```text
¿Qué necesitas retirar?

[ Bolsas sueltas ]
[ Cajas ]
[ Palés ]
[ Mixto sin clasificar ]
[ Material prioritario ]
[ Material no aceptado ]
[ No lo sé ]
```

## 12.2. Volumen

```text
¿Cuánto volumen?

[ Cabe en coche ]
[ Cabe en furgoneta ]
[ Hace falta camión ]
[ No lo sé ]
```

## 12.3. Urgencia

```text
¿Urgencia?

[ Hoy ]
[ 24 h ]
[ 48 h ]
[ Cuando se pueda ]
```

## 12.4. Foto obligatoria

Para pedir recogida debe adjuntarse al menos una foto.

---

# 13. Flujo “Incidencia”

## 13.1. Tipos de incidencia

```text
¿Qué ocurre?

[ Punto saturado ]
[ Gente dejando material fuera ]
[ Material no permitido ]
[ Medicamentos ]
[ Alimentos caducados ]
[ Discusión / conflicto ]
[ Sospecha de fraude ]
[ Falta de voluntarios ]
[ Falta de transporte ]
[ Riesgo de seguridad ]
[ Otro ]
```

## 13.2. Nivel de gravedad

- Leve
- Importante
- Urgente

## 13.3. Reglas automáticas

- Si se marca **medicamentos**, se crea incidencia sanitaria.
- Si se marca **punto saturado**, se recomienda cambiar estado a rojo.
- Si se marca **riesgo de seguridad**, se alerta a coordinación de forma prioritaria.
- Si se marca **fraude**, se envía a cola antifraude.

---

# 14. Semáforo de categorías

Cada punto debe tener instrucciones simples:

```text
Higiene: 🟢 aceptar
Pañales: 🟢 aceptar
Baterías: 🟡 aceptar poco
Ropa: 🔴 no aceptar
Medicamentos: ⛔ prohibido
Agua: 🔴 no aceptar
Alimentos: 🟡 solo lista cerrada
```

Significado:

- 🟢 Aceptar
- 🟡 Aceptar con limitaciones
- 🔴 No aceptar ahora
- ⛔ Prohibido / canal especial

El responsable del punto no debe decidir desde cero. Debe seguir instrucciones actualizadas.

---

# 15. Catálogo de material

## 15.1. Aceptable con validación

- kits de higiene cerrados;
- pañales;
- compresas;
- linternas;
- baterías externas;
- radios;
- mantas térmicas nuevas;
- lonas;
- filtros de agua;
- pastillas potabilizadoras;
- guantes de trabajo;
- mascarillas;
- sacos de dormir nuevos;
- material de limpieza;
- herramientas manuales.

## 15.2. Canal especializado

- medicamentos;
- material sanitario;
- leche infantil;
- productos perecederos;
- equipos eléctricos;
- drones;
- equipos de radio;
- combustible;
- productos químicos;
- equipos de rescate;
- generadores.

## 15.3. No aceptado por defecto

- ropa usada sin clasificar;
- alimentos caseros;
- agua embotellada para envío internacional;
- medicamentos sueltos;
- productos caducados;
- juguetes usados;
- muebles;
- material sin etiquetar;
- mezclas de productos en bolsas;
- donaciones anónimas en efectivo;
- material sin destino asignado.

---

# 16. Registro de donación en especie

## 16.1. Campos mínimos

- tipo de material;
- cantidad aproximada;
- estado;
- foto;
- municipio;
- contacto;
- disponibilidad para entrega.

## 16.2. Respuesta automática

El sistema debe responder con una de estas salidas:

- aceptado;
- aceptado solo con validación;
- no aceptado;
- pendiente de revisión;
- canal especializado.

## 16.3. Ejemplos

### Medicamentos

Respuesta:

> Actualmente no se aceptan medicamentos por canales ciudadanos. Los medicamentos requieren trazabilidad, conservación, control de caducidad y canal sanitario autorizado.

### Ropa usada

Respuesta:

> En este momento no se acepta ropa usada salvo petición expresa. Este material puede saturar la logística y retrasar la ayuda prioritaria.

### Higiene infantil

Respuesta:

> Material potencialmente aceptable. Te asignaremos punto de entrega si existe necesidad activa y capacidad logística.

---

# 17. Registro de voluntariado

## 17.1. Campos recomendados

- nombre;
- teléfono;
- email;
- municipio;
- disponibilidad;
- vehículo;
- carnet de conducir;
- idiomas;
- experiencia logística;
- experiencia sanitaria;
- formación en emergencias;
- tareas aceptadas;
- consentimiento de datos;
- aceptación de normas.

## 17.2. Tareas posibles

- clasificación de material;
- carga y descarga;
- atención telefónica;
- verificación de campañas;
- reparto local;
- administración;
- traducción;
- redes sociales;
- conducción;
- soporte sanitario solo con titulación;
- soporte psicológico solo con titulación;
- logística avanzada.

## 17.3. Reglas

- No permitir autodesplazamientos sin tarea.
- No mostrar ubicaciones sensibles hasta asignación.
- No permitir tareas sanitarias sin validación.
- Generar turnos con cupo.
- Registrar check-in y check-out.
- Permitir baja rápida del turno.

---

# 18. Cola de revisión para coordinación

La coordinación debe recibir reportes como tarjetas simples.

Cada tarjeta debe mostrar:

- foto;
- punto;
- hora;
- usuario;
- nota;
- audio si existe;
- estado del punto;
- sugerencia automática;
- botones rápidos.

Botones de clasificación:

```text
[ Saturación ]
[ Recogida ]
[ Material útil ]
[ Material no aceptado ]
[ Medicamentos ]
[ Incidencia ]
[ Ignorar ]
[ Pedir más info ]
```

Objetivo:

> Convertir información caótica en decisiones operativas.

---

# 19. Trazabilidad mínima viable

No se debe intentar trazar cada artículo desde el primer día.  
Debe trazarse por lotes.

## 19.1. Qué es un lote

Ejemplos:

- “10 cajas de higiene del punto X”
- “1 palé mixto sin clasificar”
- “15 bolsas de ropa no prioritaria”
- “3 cajas de pañales”
- “material sanitario pendiente de validación”

## 19.2. Datos del lote

- ID;
- QR;
- fotos;
- punto de origen;
- categoría aproximada;
- cantidad aproximada;
- estado;
- ubicación actual;
- responsable;
- fecha;
- destino provisional si existe.

## 19.3. Estados del lote

```text
Recibido
Pendiente de clasificar
Clasificado
Bloqueado
Pendiente de recogida
En transporte
En almacén
Descartado
Entregado
```

---

# 20. Gestión logística

## 20.1. Entidades logísticas

- punto de recogida;
- almacén;
- lote;
- caja;
- palé;
- expedición;
- transportista;
- destino;
- receptor;
- documento;
- incidencia.

## 20.2. Funciones mínimas

- crear lote;
- generar etiqueta QR;
- agrupar cajas;
- agrupar palés;
- crear manifiesto;
- asignar transporte;
- registrar salida;
- registrar llegada;
- registrar incidencias;
- cerrar expedición.

## 20.3. Bloqueo de expedición

No se puede crear expedición si falta:

- destino;
- receptor;
- responsable;
- listado de contenido;
- peso o volumen aproximado;
- documentación;
- autorización de salida;
- capacidad de recepción.

---

# 21. Antifraude y verificación

## 21.1. Campañas económicas

Cada campaña debe mostrar:

- entidad promotora;
- CIF/NIF o identificador;
- responsable;
- web oficial;
- cuenta bancaria o enlace;
- destino de fondos;
- fecha de creación;
- estado de verificación;
- entidad verificadora.

Estados:

- verificada;
- pendiente;
- no verificada;
- sospechosa;
- retirada.

## 21.2. Alertas de riesgo

Marcar como riesgo:

- cuentas personales;
- Bizum personal;
- efectivo;
- campañas sin responsable;
- recogida de medicamentos;
- uso de logos no autorizado;
- promesas tipo “sale un avión mañana”;
- enlaces acortados;
- duplicados;
- campañas con urgencia extrema y poca información.

## 21.3. Reporte ciudadano

Debe existir un formulario para reportar:

- campaña dudosa;
- punto no autorizado;
- petición de efectivo;
- recogida de medicamentos;
- perfil falso;
- uso indebido de logos;
- envío no confirmado.

---

# 22. Panel de mando

## 22.1. Indicadores principales

- iniciativas registradas;
- iniciativas autorizadas;
- puntos activos;
- puntos saturados;
- puntos no confirmados;
- voluntarios registrados;
- voluntarios asignados;
- reportes pendientes;
- fotos pendientes de revisión;
- solicitudes de recogida;
- incidencias abiertas;
- lotes pendientes;
- expediciones creadas;
- campañas sospechosas;
- donaciones rechazadas o reconducidas.

## 22.2. Alertas

- punto saturado;
- punto sin actualizar;
- exceso de ropa;
- medicamentos detectados;
- recogida sin salida;
- almacén saturado;
- campaña viral no verificada;
- necesidad crítica sin cobertura;
- transporte sin documentación;
- destino no confirmado;
- pico de voluntarios sin tareas.

---

# 23. Modo emergencia: pausar recogidas

Debe existir una acción central:

```text
Pausar recogidas de material
```

Al activarla:

- se ocultan puntos de recogida activos;
- se bloquean nuevas citas;
- se muestra aviso público;
- se permite solo registro de ofrecimientos;
- se avisa a responsables de puntos;
- se avisa a voluntarios;
- se genera informe de saturación.

Mensaje público recomendado:

> Temporalmente se pausan las recogidas de material para evitar saturación logística. No lleves material a ningún punto no autorizado. La forma más eficaz de ayudar ahora es esperar a que se publique una necesidad concreta o a recibir nuevas instrucciones.

---

# 24. Funciones del MVP

## 24.1. Día 1: contención

- landing pública;
- instrucciones de ayuda;
- campañas verificadas;
- formulario de iniciativas;
- formulario de ofrecimiento de material;
- formulario de voluntariado;
- panel admin básico;
- estados manuales;
- exportación CSV.

## 24.2. Día 2: operación básica

- alta de puntos;
- validación de puntos;
- mapa/listado de puntos;
- estado semáforo;
- categorías aceptadas;
- envío de fotos;
- incidencias;
- solicitudes de recogida;
- cola de revisión.

## 24.3. Día 3: trazabilidad y logística

- lotes simples;
- QR;
- expediciones;
- manifiestos;
- alertas;
- dashboard;
- reportes;
- gestión de saturación.

---

# 25. Funcionalidades que no deben entrar al inicio

Evitar en el MVP:

- app móvil nativa;
- marketplace complejo;
- chat interno avanzado;
- pagos propios;
- trazabilidad blockchain;
- inventario detallado por unidad;
- IA como decisión final;
- foros públicos;
- comentarios abiertos;
- perfiles sociales;
- gamificación del voluntariado.

El sistema debe ser sobrio, rápido y operativo.

---

# 26. Arquitectura técnica recomendada

## 26.1. Opción rápida

- Frontend: Next.js / React.
- Backend: Supabase, Firebase, Laravel, Symfony o Django.
- Base de datos: PostgreSQL.
- Mapas: Leaflet + OpenStreetMap.
- QR: generación simple.
- Archivos: almacenamiento S3 compatible.
- Notificaciones: email y WhatsApp manual/integrable.
- Hosting: Vercel + Supabase o VPS.
- Exportación: CSV/Excel.

## 26.2. Opción robusta

- Backend: Symfony, Laravel o Django.
- PostgreSQL.
- Redis para colas.
- S3 compatible para fotos/documentos.
- Panel admin: EasyAdmin, Filament, Django Admin o React Admin.
- API REST.
- Auditoría de cambios.
- Workers para notificaciones.

## 26.3. Requisito importante

Debe ser **web responsive o PWA**, no app nativa en primera fase.

---

# 27. Requisitos de usabilidad

La interfaz operativa debe cumplir:

- botones grandes;
- pocos textos;
- acciones de una pantalla;
- posibilidad de “no lo sé”;
- subida de fotos comprimidas;
- audio opcional;
- geolocalización automática;
- autoguardado;
- funcionamiento con mala conexión;
- modo claro;
- iconos comprensibles;
- sin tablas en móvil;
- sin menús profundos;
- sin inventario complejo.

---

# 28. Funcionamiento con mala conexión

La aplicación debe permitir:

- guardar reportes sin conexión;
- subir fotos cuando vuelva la conexión;
- comprimir imágenes;
- reducir consumo de datos;
- usar formularios mínimos;
- recibir instrucciones simples;
- evitar dependencia excesiva de mapas;
- usar WhatsApp como respaldo.

---

# 29. Modelo de datos inicial

## 29.1. Organization

- id
- name
- type
- tax_id
- contact_person
- phone
- email
- website
- social_links
- verification_status
- notes

## 29.2. CollectionPoint

- id
- organization_id
- name
- address
- municipality
- province
- coordinates
- opening_hours
- accepted_categories
- capacity_m3
- capacity_pallets
- saturation_status
- public_status
- responsible_person
- phone
- status
- last_update_at

## 29.3. Report

- id
- collection_point_id
- user_id
- type
- category
- approximate_volume
- text_note
- audio_url
- photo_urls
- location
- priority
- status
- created_at
- reviewed_at

## 29.4. Need

- id
- title
- category
- priority
- requested_quantity
- unit
- fulfilled_quantity
- destination
- requesting_org_id
- validator_org_id
- expiry_date
- conditions
- status

## 29.5. DonationOffer

- id
- donor_type
- donor_contact
- category
- item
- quantity
- photos
- location
- status
- matched_need_id
- assigned_collection_point_id
- qr_code
- notes

## 29.6. Lot

- id
- campaign_id
- collection_point_id
- category
- content_description
- quantity
- weight
- volume
- status
- qr_code
- current_location
- photos

## 29.7. Shipment

- id
- origin
- destination
- carrier
- departure_date
- arrival_date
- manifest
- status
- documents
- incidents

## 29.8. Volunteer

- id
- name
- contact
- municipality
- skills
- availability
- vehicle
- validated_skills
- assigned_shift_id
- status

## 29.9. Incident

- id
- type
- severity
- related_entity_type
- related_entity_id
- description
- reported_by
- status
- resolution

## 29.10. Campaign

- id
- name
- type
- organizer_id
- verification_status
- description
- start_date
- end_date
- public_visibility
- destination
- allowed_items
- forbidden_items
- status

---

# 30. Reglas de negocio imprescindibles

1. Nada se publica sin responsable.
2. Nada se recoge sin categoría autorizada.
3. Nada se transporta sin destino confirmado.
4. Nada sanitario se acepta sin canal sanitario.
5. Nada económico se canaliza a cuentas no verificadas.
6. Todo punto tiene capacidad y estado.
7. Toda entrega debe tener cita o QR, salvo modo emergencia controlado.
8. Todo lote debe tener trazabilidad mínima.
9. Todo voluntario debe estar asignado a una tarea.
10. Toda campaña puede cerrarse centralizadamente.
11. Toda iniciativa espontánea debe poder registrarse, aunque no se autorice.
12. El sistema debe poder decir “esto no hace falta ahora”.
13. La ausencia de actualización debe degradar el estado público del punto.
14. La saturación debe cerrar automáticamente nuevas entregas.
15. La categoría “medicamentos” debe activar bloqueo especial.

---

# 31. Casuísticas importantes

## 31.1. Restaurante venezolano quiere abrir punto

Flujo:

1. Registra iniciativa.
2. Declara capacidad.
3. Declara horario.
4. Sube fotos del espacio.
5. Acepta normas.
6. Espera validación.

Resultados posibles:

- aprobado como punto de recogida;
- aprobado solo como punto informativo;
- aprobado con categorías limitadas;
- rechazado por falta de capacidad;
- pendiente de revisión.

## 31.2. Ciudadano quiere donar medicamentos

Respuesta automática:

> No se aceptan medicamentos por canales ciudadanos. Los medicamentos requieren trazabilidad, conservación, control de caducidad y canal sanitario autorizado.

## 31.3. Grupo anuncia un contenedor

Debe poder reportarse.

Datos:

- enlace o captura;
- responsable;
- municipio;
- material solicitado;
- cuenta de pago;
- fecha de salida;
- entidad receptora;
- transportista;
- documentación.

Estados:

- pendiente;
- verificada;
- no verificada;
- sospechosa;
- alerta pública.

## 31.4. Ayuntamiento quiere colaborar

Puede tener perfil institucional.

Funciones:

- publicar punto municipal;
- ceder espacio;
- registrar voluntarios;
- emitir avisos locales;
- ver iniciativas del municipio;
- coordinar con administración superior;
- exportar datos.

## 31.5. Empresa ofrece gran cantidad de producto

Debe ir por flujo B2B/logístico, no ciudadano.

Campos:

- producto;
- cantidad;
- embalaje;
- paletización;
- ubicación;
- transporte incluido;
- documentación;
- caducidad;
- condiciones;
- contacto logístico.

## 31.6. Voluntario sanitario quiere ayudar

Debe validarse:

- titulación;
- colegiación si aplica;
- experiencia;
- seguro;
- entidad sanitaria receptora;
- misión concreta.

No debe asignarse automáticamente.

---

# 32. Mensajes automáticos recomendados

## 32.1. Material no solicitado

> Gracias por querer ayudar. En este momento no estamos aceptando este tipo de material porque puede saturar la logística y retrasar la ayuda prioritaria. La forma más eficaz de colaborar ahora es esperar a que se publique una necesidad concreta.

## 32.2. Apertura de punto

> Para evitar duplicidades y acumulación de material sin salida, todos los puntos de recogida deben estar registrados y validados. Completa los datos de capacidad, horario, responsable y categorías aceptadas. No publiques el punto hasta recibir validación.

## 32.3. Medicamentos

> No se aceptan medicamentos por canales ciudadanos. Los medicamentos requieren trazabilidad, conservación, control de caducidad y canal sanitario autorizado. Consulta únicamente campañas sanitarias verificadas.

## 32.4. Punto saturado

> Este punto está temporalmente cerrado por saturación. No lleves más material. Consulta otros puntos disponibles o espera a que se publique una necesidad concreta.

## 32.5. Pausa general de recogidas

> Temporalmente se han pausado las recogidas de material para evitar saturación logística. No lleves material a puntos no autorizados. La forma más eficaz de ayudar ahora es esperar a que se publique una necesidad concreta o a recibir nuevas instrucciones.

---

# 33. Priorización MoSCoW

## Must have

- portal público;
- campañas verificadas;
- formulario de iniciativas;
- registro de puntos;
- estado semáforo;
- envío de fotos;
- incidencias;
- solicitud de recogida;
- panel de revisión;
- categorías aceptadas/no aceptadas;
- botón “parar entregas”;
- exportación CSV.

## Should have

- QR para lotes;
- mapa de puntos;
- voluntariado con turnos;
- alertas antifraude;
- historial de estados;
- WhatsApp supervisado;
- dashboard básico;
- lotes simples;
- manifiestos básicos.

## Could have

- IA para preclasificar fotos;
- OCR de etiquetas;
- audio transcrito;
- integración WhatsApp avanzada;
- notificaciones push;
- optimización de rutas;
- panel público de transparencia.

## Won’t have al inicio

- app nativa;
- blockchain;
- pagos propios;
- marketplace;
- inventario unitario;
- red social;
- gamificación;
- automatismos críticos sin revisión humana.

---

# 34. Backlog inicial por épicas

## Épica 1: Portal público

Historias:

- Como ciudadano, quiero saber cómo ayudar sin crear problemas.
- Como ciudadano, quiero ver campañas verificadas.
- Como ciudadano, quiero saber qué materiales no se aceptan.
- Como ciudadano, quiero encontrar puntos autorizados.

## Épica 2: Registro de iniciativas

Historias:

- Como asociación, quiero registrar una iniciativa.
- Como coordinador, quiero validar o rechazar iniciativas.
- Como coordinador, quiero detectar duplicados.
- Como administrador, quiero bloquear iniciativas sospechosas.

## Épica 3: Puntos de recogida

Historias:

- Como responsable, quiero cambiar el estado de mi punto.
- Como responsable, quiero indicar saturación.
- Como responsable, quiero ver qué puedo aceptar.
- Como coordinador, quiero cerrar un punto saturado.

## Épica 4: Reportes rápidos

Historias:

- Como responsable, quiero enviar una foto en menos de 20 segundos.
- Como responsable, quiero reportar una incidencia.
- Como responsable, quiero solicitar recogida.
- Como coordinador, quiero revisar fotos pendientes.

## Épica 5: Logística mínima

Historias:

- Como coordinador, quiero crear lotes simples.
- Como coordinador, quiero generar QR.
- Como coordinador, quiero crear expediciones.
- Como coordinador, quiero bloquear transporte sin destino.

## Épica 6: Voluntariado

Historias:

- Como voluntario, quiero registrarme.
- Como coordinador, quiero asignar turnos.
- Como voluntario, quiero saber dónde y cuándo acudir.
- Como coordinador, quiero evitar voluntarios sin tarea.

## Épica 7: Antifraude

Historias:

- Como ciudadano, quiero reportar una campaña sospechosa.
- Como coordinador, quiero verificar campañas.
- Como administrador, quiero marcar campañas como no verificadas.
- Como ciudadano, quiero consultar si una campaña es oficial.

---

# 35. Definición de éxito del MVP

El MVP será útil si consigue:

- reducir puntos espontáneos no registrados;
- reconducir donaciones no útiles;
- detectar puntos saturados;
- cerrar recogidas a tiempo;
- obtener fotos y estado real del terreno;
- registrar iniciativas antes de que se descontrolen;
- canalizar voluntarios a tareas concretas;
- evitar recogida de medicamentos;
- detectar campañas económicas sospechosas;
- mantener una visión operativa de la situación.

---

# 36. Frase de producto

> Plataforma rápida para transformar solidaridad espontánea en ayuda útil, coordinada y trazable, reduciendo saturación logística, duplicidades y riesgos operativos.

---

# 37. Regla de oro final

> **La aplicación no debe intentar que una persona desbordada trabaje como un gestor logístico. Debe permitirle enviar señales simples, y que la coordinación convierta esas señales en decisiones.**

