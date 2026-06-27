/**
 * Spanish (default) translations.
 * Keys are in camelCase namespaced by feature/surface.
 */
export const es = {
  // ── Common ───────────────────────────────────────────────────────────────
  common: {
    reliefhub: 'ReliefHub',
    loading: 'Cargando…',
    back: '←',
    optional: '(opcional)',
    required: '*',
    sending: 'Enviando…',
    submit: 'Enviar',
    saving: 'Guardando…',
    back_to_emergency: 'Volver a la emergencia',
    language: 'Idioma',
    es: 'ES',
    en: 'EN',
  },

  // ── Home page ─────────────────────────────────────────────────────────────
  home: {
    title: 'ReliefHub',
    subtitle: 'Coordinación de recursos en emergencias.',
    active_emergencies: 'Emergencias activas',
    no_emergencies_title: 'No hay emergencias activas en este momento.',
    no_emergencies_description: 'Cuando se active una emergencia aparecerá aquí.',
    emergency_status_active: 'Activa',
    my_orgs: 'Mis organizaciones',
    notifications: 'Notificaciones',
    notifications_with_count: 'Notificaciones ({count})',
    coordination_access: 'Acceso coordinación',
    admin: 'Admin',
    templates: 'Plantillas',
    audit: 'Auditoría',
    aria_emergency_list: 'Lista de emergencias activas',
    meta_title: 'ReliefHub — Emergencias activas',
    meta_description:
      'Plataforma de coordinación de ayuda en emergencias. Consulta las emergencias activas y cómo puedes colaborar.',
  },

  // ── Emergency landing (e/[slug]) ──────────────────────────────────────────
  emergency: {
    back_all: '← Todas las emergencias',
    official_source: 'Fuente oficial · ReliefHub',
    status_active: 'Emergencia activa',
    status_active_aria: 'Estado: emergencia activa',

    // Metrics
    metrics_heading: 'Resumen',
    metric_needs_open: 'Peticiones abiertas',
    metric_needs_closed: 'Peticiones cerradas',
    metric_resources_active: 'Puntos logísticos activos',
    metric_resources_pending: 'Pendientes de validar',

    // "Qué NO llevar"
    dont_bring_heading: 'Qué NO llevar ahora',
    dont_bring_intro:
      'Enviar material sin coordinar satura la cadena logística y puede bloquear la llegada de ayuda profesional.',
    dont_bring_items: [
      'Ropa usada sin clasificar ni empaquetar.',
      'Medicamentos — deben canalizarse a través de la vía sanitaria autorizada.',
      'Agua embotellada para envío internacional.',
      'Alimentos caseros o con fecha de caducidad próxima.',
      'Material sin destino o punto receptor asignado.',
      'No acudas por tu cuenta a la zona afectada.',
    ],

    // "¿Cómo quieres colaborar?"
    actions_heading: '¿Cómo quieres colaborar?',
    action_offer_resource: 'Ofrecer un recurso',
    action_submit_petition: 'Poner una petición',
    action_donate: 'Donar material',
    action_volunteer: 'Apuntarme como voluntario',
    action_report_damage: '🏚 Reportar daños estructurales',
    action_find_family: 'Buscar familiar',
    actions_paused:
      'El alta de recursos y peticiones está en pausa. Consulta la información disponible y vuelve más tarde.',

    // Active points
    points_heading: 'Puntos activos',
    points_empty_title: 'Aún no hay puntos activos.',
    points_empty_description:
      'En cuanto se verifiquen puntos logísticos aparecerán aquí. Mientras tanto, puedes ofrecer un recurso o consultar las necesidades validadas.',
    points_aria_label: 'Puntos activos verificados',

    // Validated needs
    needs_heading: 'Necesidades validadas',
    needs_empty_title: 'Aún no hay necesidades publicadas.',
    needs_priority_label: 'Prioridad:',
    needs_offer_button: 'Ofrecer para esta necesidad',
    needs_aria_label: 'Necesidades validadas',

    // Map
    map_heading: 'Mapa de la emergencia',
    map_legend_active: 'Operativo',
    map_legend_saturated: 'Saturado',
    map_legend_paused: 'En pausa',
    map_legend_need: 'Petición',
    map_legend_damage_collapsed: 'Colapsada',
    map_legend_damage_severe: 'Daño grave',
    map_legend_damage_moderate: 'Daño moderado',
    map_damage_toggle_show: 'Mostrar daños',
    map_damage_toggle_hide: 'Ocultar daños',
    map_user_location_notice: 'Tu ubicación no se publica ni se comparte.',

    // Privacy (F09)
    privacy_approximate_location: 'Coordenadas aproximadas — verifica la dirección por teléfono antes de trasladarte.',

    // Footer links
    footer_my_points: 'Mis puntos',
    footer_my_volunteer: 'Mi voluntariado',
    footer_my_search: 'Mi búsqueda',
    footer_report: 'Reportar',
    footer_coordination: 'Acceso de coordinación',

    // Category labels
    category_hygiene: 'Higiene',
    category_water: 'Agua',
    category_food: 'Alimentos',
    category_medical: 'Sanitario',
    category_shelter: 'Refugio',
    category_tools: 'Herramientas',
    category_other: 'Otro',
    category_medicines: '💊 Medicamentos',
    category_medical_equipment: '🩺 Equipos médicos',
    category_medical_supplies: '📦 Insumos médicos',
    category_medical_personnel: '🧑‍⚕️ Personal sanitario',

    // Priority labels
    priority_low: 'Baja',
    priority_medium: 'Media',
    priority_high: 'Alta',
    priority_urgent: 'Urgente',
  },

  // ── StatusBanner ──────────────────────────────────────────────────────────
  status_banner: {
    paused_title: '⏸ Recogidas en pausa — solo información',
    paused_body:
      'En este momento no se admiten nuevas altas de recursos ni peticiones. Consulta la información disponible y vuelve más tarde.',
    closed_title: '🔒 Emergencia cerrada',
    closed_body: 'Esta emergencia ha concluido. Ya no se aceptan recursos ni peticiones.',
  },

  // ── AnnouncementCard ──────────────────────────────────────────────────────
  announcement: {
    official_label: 'Comunicado oficial',
    last_updated: 'Última actualización:',
    aria_label: 'Comunicado oficial',
  },

  // ── Login page ────────────────────────────────────────────────────────────
  login: {
    title: 'Iniciar sesión',
    subtitle: 'Accede a tu cuenta para continuar.',
    demo_label: 'Credenciales demo',
    demo_email_label: 'Email:',
    demo_email: 'coord@reliefhub.org',
    demo_password_label: 'Contraseña:',
    demo_password: 'coord1234',
    email_label: 'Correo electrónico',
    password_label: 'Contraseña',
    submit: 'Entrar',
    submitting: 'Entrando…',
    no_account: '¿No tienes cuenta?',
    create_account: 'Crear cuenta',
    error_fallback: 'Error al iniciar sesión',
    meta_title: 'Iniciar sesión — ReliefHub',
    meta_description: 'Inicia sesión en ReliefHub.',
  },

  // ── Signup page ───────────────────────────────────────────────────────────
  signup: {
    title: 'Crear cuenta',
    subtitle: 'Únete a ReliefHub para coordinar recursos en emergencias.',
    name_label: 'Nombre completo',
    email_label: 'Correo electrónico',
    password_label: 'Contraseña',
    password_hint: '(mín. 8 caracteres)',
    submit: 'Crear cuenta',
    submitting: 'Creando cuenta…',
    already_account: '¿Ya tienes cuenta?',
    login_link: 'Inicia sesión',
    error_fallback: 'Error al crear la cuenta',
    meta_title: 'Crear cuenta — ReliefHub',
    meta_description: 'Regístrate en ReliefHub para coordinar emergencias.',
  },

  // ── Needs filter ──────────────────────────────────────────────────────────
  needs_filter: {
    aria_label: 'Filtros de peticiones',
    category_label: 'Categoría',
    priority_label: 'Prioridad',
    all_categories: 'Todas las categorías',
    all_priorities: 'Todas las prioridades',
    aria_filter_category: 'Filtrar por categoría',
    aria_filter_priority: 'Filtrar por prioridad',
  },

  // ── PublicResourceCard ────────────────────────────────────────────────────
  resource_card: {
    type_collection_point: 'Punto de recogida',
    type_delivery_point: 'Punto de entrega',
    type_collection_and_delivery: 'Recogida y entrega',
    type_warehouse: 'Almacén',
    type_transport: 'Transporte',
    type_supplier: 'Proveedor',
    type_venue: 'Local / Espacio',
    stage_origin: 'Origen',
    stage_intermediate: 'Intermedio',
    stage_destination: 'Destino',
  },

  // ── VerificationBadge ─────────────────────────────────────────────────────
  verification_badge: {
    official: 'Oficial',
    verified: 'Verificado',
    unverified: 'Sin verificar',
    aria_prefix: 'Nivel de confianza:',
  },

  // ── StatusLight ───────────────────────────────────────────────────────────
  status_light: {
    active: 'Operativo',
    saturated: 'Saturado',
    paused: 'En pausa',
    closed: 'Cerrado',
    hidden: 'Oculto',
    aria_prefix: 'Estado operativo:',
  },

  // ── DraftRestoredBanner ───────────────────────────────────────────────────
  draft_restored: 'Borrador restaurado',

  // ── Registrar form ────────────────────────────────────────────────────────
  registrar: {
    page_title: 'Ofrecer un recurso',
    page_subtitle: '{emergencyName} · Rellena el formulario. Te validaremos antes de activarte.',
    meta_title: 'Ofrecer un recurso — {emergencyName} · ReliefHub',
    meta_description: 'Regístrate como recurso disponible para {emergencyName}.',

    type_label: 'Tipo de recurso',
    stage_label: 'Etapa',
    name_label: 'Nombre',
    name_placeholder: 'Ej. Cruz Roja Madrid',
    description_label: 'Descripción',
    description_placeholder: 'Información adicional sobre el recurso…',
    location_label: 'Ubicación',

    type_collection_point: 'Punto de recogida',
    type_delivery_point: 'Punto de entrega',
    type_collection_and_delivery: 'Recogida y entrega',
    type_warehouse: 'Almacén',
    type_transport: 'Transporte',
    type_supplier: 'Proveedor',
    type_venue: 'Local / Espacio',

    stage_origin: 'Origen',
    stage_intermediate: 'Intermedio',
    stage_destination: 'Destino',

    select_type_placeholder: 'Selecciona un tipo…',
    select_stage_placeholder: 'Selecciona una etapa…',

    submit: 'Registrar recurso',
    submitting: 'Enviando…',
    success_message:
      'Gracias, quedas registrado. No recibas material ni publiques nada hasta que te validemos.',
    success_register_another: 'Registrar otro recurso',
    error_fallback: 'Error al registrar el recurso',
  },

  // ── Petición form ─────────────────────────────────────────────────────────
  peticion: {
    page_title: 'Poner una petición',
    page_subtitle: '{emergencyName} · Describe la necesidad para que el equipo de coordinación pueda validarla.',
    meta_title: 'Poner una petición — {emergencyName} · ReliefHub',
    meta_description: 'Registra una necesidad de ayuda para {emergencyName}.',

    title_label: 'Título',
    title_placeholder: 'Ej. Mantas térmicas para familias',
    description_label: 'Descripción',
    description_placeholder:
      'Detalla la necesidad para que la coordinación pueda valorarla…',
    priority_label: 'Prioridad',
    location_label: 'Ubicación',

    priority_low: 'Baja',
    priority_medium: 'Media',
    priority_high: 'Alta',
    priority_urgent: 'Urgente',

    select_priority_placeholder: 'Selecciona una prioridad…',

    submit: 'Enviar petición',
    submitting: 'Enviando…',
    success_message:
      'Gracias, tu petición se ha registrado y será revisada por el equipo de coordinación.',
    success_send_another: 'Enviar otra petición',
    error_fallback: 'Error al enviar la petición',

    // Items field
    items_heading: 'Artículos',
    items_add: '+ Añadir artículo',
    item_number: 'Artículo {n}',
    item_remove: 'Eliminar artículo {n}',
    item_remove_label: 'Quitar',
    item_name_label: 'Nombre',
    item_name_placeholder: 'Ej. Mantas térmicas',
    item_quantity_label: 'Cantidad',
    item_unit_label: 'Unidad',
    item_unit_opt: '(opt.)',
    item_unit_placeholder: 'cajas, litros…',
    item_category_label: 'Categoría',

    category_hygiene: 'Higiene',
    category_water: 'Agua',
    category_food: 'Alimentos',
    category_medical: 'Sanitario',
    category_shelter: 'Refugio',
    category_tools: 'Herramientas',
    category_other: 'Otro',
    category_medicines: '💊 Medicamentos',
    category_medical_equipment: '🩺 Equipos médicos',
    category_medical_supplies: '📦 Insumos médicos',
    category_medical_personnel: '🧑‍⚕️ Personal sanitario',
  },

  // ── Donar form ────────────────────────────────────────────────────────────
  donar: {
    page_title: 'Donar material',
    page_subtitle: '{emergencyName} · Describe el material que puedes aportar.',
    meta_title: 'Donar material — {emergencyName} · ReliefHub',
    meta_description: 'Ofrece material de ayuda para {emergencyName}.',

    directed_offer_label: 'Ofreces para:',
    category_label: 'Categoría del material',
    description_label: 'Descripción del material',
    description_placeholder: 'Ej. Sacos de arroz de 25 kg',
    quantity_label: 'Cantidad',
    quantity_placeholder: '50',
    unit_label: 'Unidad',
    unit_placeholder: 'Ej. sacos, litros, cajas',
    location_label: 'Ubicación del material',
    notes_label: 'Notas adicionales',
    notes_placeholder: 'Ej. Disponible de lunes a viernes por la mañana',

    select_category_placeholder: 'Selecciona una categoría…',

    category_food: 'Alimentos',
    category_water: 'Agua',
    category_hygiene: 'Higiene',
    category_medical: 'Sanitario',
    category_shelter: 'Refugio',
    category_tools: 'Herramientas',
    category_other: 'Otro',

    submit: 'Donar material',
    submitting: 'Enviando…',
    success_message:
      '¡Gracias! Tu oferta ha sido recibida. El equipo de coordinación la revisará y te contactará si es necesario.',
    success_donate_again: 'Hacer otra oferta',
    error_fallback: 'Error al enviar la oferta',
  },

  // ── Voluntario form ───────────────────────────────────────────────────────
  voluntario: {
    page_title: 'Apuntarme como voluntario',
    page_subtitle: '{emergencyName} · Rellena tus datos para unirte al equipo de voluntariado.',
    meta_title: 'Apuntarme como voluntario — {emergencyName} · ReliefHub',
    meta_description: 'Regístrate como voluntario para colaborar en {emergencyName}.',

    already_registered:
      'Ya estás apuntado como voluntario. Puedes actualizar tus datos a continuación.',
    name_label: 'Nombre completo',
    name_placeholder: 'Ej. Ana García',
    contact_label: 'Contacto (email o teléfono)',
    contact_placeholder: 'Ej. ana@ejemplo.com o 612 345 678',
    municipality_label: 'Municipio',
    municipality_placeholder: 'Ej. Valencia',
    skills_legend: 'Habilidades',
    availability_label: 'Disponibilidad',
    vehicle_label: 'Vehículo disponible',
    consent_text:
      'Acepto el tratamiento de mis datos personales para la coordinación de esta emergencia, conforme a la normativa vigente de protección de datos (GDPR). Los datos serán usados exclusivamente para la gestión del voluntariado.',

    skill_driving: 'Conducción',
    skill_medical: 'Sanitario / Primeros auxilios',
    skill_logistics: 'Logística',
    skill_cooking: 'Cocina',
    skill_languages: 'Idiomas',
    skill_admin: 'Administración',
    skill_general: 'General / Apoyo',

    availability_immediate: 'Inmediata',
    availability_this_week: 'Esta semana',
    availability_flexible: 'Flexible',

    vehicle_none: 'Ninguno',
    vehicle_car: 'Coche',
    vehicle_van: 'Furgoneta',
    vehicle_truck: 'Camión',

    select_availability_placeholder: 'Selecciona tu disponibilidad…',
    select_vehicle_placeholder: 'Selecciona tipo de vehículo…',

    submit_new: 'Apuntarme como voluntario',
    submit_update: 'Actualizar datos',
    submitting: 'Guardando…',
    success_new:
      '¡Gracias! Quedas registrado como voluntario. El equipo de coordinación se pondrá en contacto contigo.',
    success_update: '¡Datos actualizados! Tu perfil de voluntario ha sido guardado.',
    view_volunteering: 'Ver mi voluntariado',
  },

  // ── Buscar familiar (reunificación) ──────────────────────────────────────
  buscar_familiar: {
    page_title: 'Buscar familiar',
    page_subtitle:
      '{emergencyName} · Si buscas a alguien, rellena el formulario. Personal autorizado gestionará tu solicitud.',
    meta_title: 'Buscar familiar — {emergencyName} · ReliefHub',
    meta_description:
      'Registra una búsqueda de familiar en {emergencyName}. Datos estrictamente privados.',

    // Section headings
    person_section: 'Datos de la persona buscada',
    reporter_section: 'Tus datos de contacto',
    consent_section: 'Consentimiento',

    // Person fields
    first_name_label: 'Nombre',
    first_name_placeholder: 'Ej. María',
    last_name_label: 'Apellido(s)',
    last_name_placeholder: 'Ej. García López',
    document_id_label: 'Documento de identidad (DNI/NIE/Pasaporte)',
    document_id_placeholder: 'Ej. 12345678A',
    approximate_age_label: 'Edad aproximada',
    approximate_age_placeholder: 'Ej. 45',
    last_known_location_label: 'Última ubicación conocida',
    last_known_location_placeholder: 'Ej. Calle Mayor 10, Valencia',
    description_label: 'Descripción física / ropa',
    description_placeholder:
      'Rasgos físicos, ropa que llevaba en el último momento que se le vio…',

    // Reporter fields
    reporter_name_label: 'Tu nombre completo',
    reporter_name_placeholder: 'Ej. Juan García',
    reporter_phone_label: 'Tu teléfono de contacto',
    reporter_phone_placeholder: 'Ej. 612 345 678',
    reporter_email_label: 'Tu correo electrónico',
    reporter_email_placeholder: 'Ej. juan@ejemplo.com',

    // Consent
    consent_text:
      'Acepto el tratamiento de mis datos personales y los de la persona buscada para la gestión de esta solicitud de reunificación familiar, conforme al RGPD. Los datos serán usados exclusivamente por personal autorizado de la emergencia.',

    // Submission
    submit: 'Enviar solicitud',
    submitting: 'Enviando…',

    // Errors
    error_paused:
      'Esta emergencia está en pausa y no acepta nuevas solicitudes en este momento.',
    error_consent: 'Debes aceptar el consentimiento de tratamiento de datos.',
    error_fallback: 'Error al enviar la solicitud. Inténtalo de nuevo.',

    // Success
    success_title: 'Solicitud registrada',
    success_body:
      'Tu solicitud ha sido registrada. El personal autorizado la revisará y se pondrá en contacto contigo a través de los datos facilitados.',
    success_privacy:
      'Recuerda: los datos son estrictamente privados y solo accesibles para el personal autorizado de la emergencia.',
    back_to_emergency: 'Volver a la emergencia',
  },

  // ── Mi búsqueda (vista personal) ─────────────────────────────────────────
  mi_busqueda: {
    page_title: 'Mi búsqueda',
    meta_title: 'Mi búsqueda — {emergencyName} · ReliefHub',
    no_reports_title: 'No tienes búsquedas registradas.',
    no_reports_description:
      'Si registraste una búsqueda sin iniciar sesión, no podrás verla aquí.',
    report_id_label: 'Ref.',
    person_label: 'Persona buscada',
    status_label: 'Estado',
    submitted_label: 'Enviada el',
    sightings_label: 'Avistamientos',
    no_sightings: 'Sin avistamientos aún.',
    sighting_at: 'Avistado en',
  },

  // ── Coordinación / reunificación ─────────────────────────────────────────
  coord_reunificacion: {
    page_title: 'Reunificación familiar',
    meta_title: 'Reunificación — {emergencyName} · ReliefHub',
    queue_heading: 'Cola de solicitudes',
    filter_label: 'Filtrar por estado',
    filter_all: 'Todos los estados',
    search_heading: 'Buscar por documento',
    search_placeholder: 'Nº documento (DNI, NIE, Pasaporte…)',
    search_button: 'Buscar',
    search_no_results: 'No se encontraron coincidencias.',
    col_name: 'Persona',
    col_document: 'Documento',
    col_age: 'Edad aprox.',
    col_status: 'Estado',
    col_date: 'Fecha',
    col_actions: 'Acciones',
    view_detail: 'Ver detalle',
    empty_queue: 'No hay solicitudes con este estado.',

    // Detail
    detail_heading: 'Detalle de la solicitud',
    back_to_queue: '← Volver a la cola',
    person_section: 'Persona buscada',
    reporter_section: 'Datos del solicitante',
    sightings_section: 'Avistamientos',
    no_sightings: 'Sin avistamientos registrados.',
    change_status_heading: 'Cambiar estado',
    add_sighting_heading: 'Registrar avistamiento',

    // Status change form
    new_status_label: 'Nuevo estado',
    match_note_label: 'Nota de cruce (opcional)',
    match_note_placeholder: 'Ej. Confirmado en hospital La Fe…',
    save_status: 'Guardar estado',
    saving_status: 'Guardando…',
    status_updated: 'Estado actualizado correctamente.',

    // Sighting form
    sighting_location_label: 'Lugar del avistamiento',
    sighting_location_placeholder: 'Ej. Plaza Mayor, Valencia',
    sighting_note_label: 'Nota',
    sighting_note_placeholder: 'Describe lo que se vio…',
    add_sighting_submit: 'Añadir avistamiento',
    adding_sighting: 'Añadiendo…',
    sighting_added: 'Avistamiento registrado.',

    error_fallback: 'Error al procesar la acción. Inténtalo de nuevo.',
  },

  // ── Reportar form ─────────────────────────────────────────────────────────
  reportar: {
    page_title: 'Enviar parte de campo',
    meta_title: 'Enviar parte — {emergencyName} · ReliefHub',
    meta_description: 'Envía un parte de campo para {emergencyName}.',

    type_label: 'Tipo',
    priority_label: 'Prioridad',
    note_label: 'Nota',
    note_placeholder: 'Describe la incidencia, estado o stock…',
    related_point_label: 'Punto relacionado (opcional)',
    general_no_point: 'General (sin punto específico)',

    type_incident: 'Incidencia',
    type_stock: 'Stock',
    type_status: 'Estado',
    type_other: 'Otro',
    type_structural_damage: '🏚 Daños estructurales',
    type_trapped_persons: '🆘 Personas atrapadas',

    priority_low: 'Baja',
    priority_medium: 'Media',
    priority_high: 'Alta',
    priority_urgent: 'Urgente',

    select_type_placeholder: 'Selecciona un tipo…',
    select_priority_placeholder: 'Selecciona una prioridad…',

    submit: 'Enviar parte',
    submitting: 'Enviando…',
    success_message: 'Parte enviado correctamente. El coordinador lo revisará en breve.',
    success_send_another: 'Enviar otro parte',
    error_fallback: 'Error al enviar el parte',
  },
};

export type Messages = typeof es;
