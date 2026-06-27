/**
 * Spanish (default) translations.
 * Keys are in camelCase namespaced by feature/surface.
 */
export const es = {
  // ── Common ───────────────────────────────────────────────────────────────
  common: {
    reliefhub: 'ResponseGrid',
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

    // Footer global de Global Emergency (compartido por todas las páginas)
    footer: {
      project_of: 'Un proyecto de',
      org: 'Global Emergency',
      tagline:
        'Plataforma open source de coordinación de ayuda en emergencias. Información oficial, verificada y en tiempo real.',
      nav_heading: 'Navegación',
      nav_home: 'Inicio',
      nav_emergencies: 'Emergencias activas',
      nav_orgs: 'Organizaciones',
      nav_coordination: 'Acceso de coordinación',
      resources_heading: 'Recursos',
      resources_about: 'Sobre nosotros',
      resources_how: 'Cómo funciona',
      resources_transparency: 'Transparencia',
      resources_verify: 'Verificar una campaña',
      legal_heading: 'Legal',
      privacy: 'Privacidad',
      terms: 'Términos y condiciones',
      copyright: '© {year} Global Emergency · Código abierto (MIT)',
      built_by: 'Hecho por voluntarios',
      aria_label: 'Pie de página',
    },
  },

  // ── Home page ─────────────────────────────────────────────────────────────
  home: {
    title: 'ResponseGrid',
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
    aria_secondary_nav: 'Navegación secundaria',
    enter_operation: 'Entrar al operativo',
    active_count: '{count} en curso',
    closed_label: 'Cerrada · informe disponible',

    // Hero
    hero_h1: 'Coordina la ayuda en emergencias, sin saturar la logística',
    hero_subtitle:
      'ResponseGrid conecta a ciudadanía, organizaciones y coordinación durante una catástrofe: publica puntos verificados, valida necesidades reales y casa ofertas de material con quien las pide. Información oficial, en tiempo real.',
    hero_cta_emergencies: 'Ver emergencias activas',
    hero_cta_donate: 'Donar',

    // Cómo funciona
    how_it_works_heading: 'Cómo funciona',
    step1_title: 'Registras lo que ofreces',
    step1_body: 'Captamos tu ofrecimiento al instante. Nada se publica hasta validarse.',
    step2_title: 'Coordinación verifica',
    step2_body: 'Coordinadores locales validan cada punto, campaña y necesidad.',
    step3_title: 'Se convierte en ayuda útil',
    step3_body: 'Tus señales se vuelven decisiones, sin desplazamientos inútiles.',

    // La confianza es el producto
    trust_heading: 'La confianza es el producto',
    trust_intro: 'Cada recurso y campaña muestra su nivel de verificación.',
    trust_unverified: 'En cola · no llevar material',
    trust_verified: 'Validado por coordinación local',
    trust_official: 'Organización acreditada',

    // Accesos de cuenta (barra secundaria del home)
    account_heading: 'Tu cuenta',

    meta_title: 'ResponseGrid — Emergencias activas',
    meta_description:
      'Plataforma de coordinación de ayuda en emergencias. Consulta las emergencias activas y cómo puedes colaborar.',
  },

  // ── Emergency landing (e/[slug]) ──────────────────────────────────────────
  emergency: {
    back_all: '← Todas las emergencias',
    official_source: 'Fuente oficial · ResponseGrid',
    status_active: 'Emergencia activa',
    status_active_aria: 'Estado: emergencia activa',

    // Banda oficial — cabecera
    header_overline: 'Operativo de emergencia',
    header_status_active: 'Operativo activo',
    header_status_paused: 'En pausa',
    header_status_closed: 'Cerrada',

    // Tarjetas de métricas
    metric_tile_open: 'Necesidades abiertas',
    metric_tile_points: 'Puntos activos',
    metric_tile_covered: 'Cubiertas',
    metric_tile_queue: 'En cola',

    // Lo más eficaz ahora
    effective_overline: 'Lo más eficaz ahora',
    effective_title: 'Dona dinero a entidades verificadas',
    effective_cta: 'Ver campañas verificadas',

    // Subtítulos de "¿Cómo quieres ayudar?"
    help_offer_subtitle: 'Almacén · transporte · espacio',
    help_volunteer_subtitle: 'Disponibilidad y habilidades',
    help_petition_subtitle: 'Solicitar material validado',
    help_report_title: 'Reportar daños o personas atrapadas',

    // Buscar familiar
    family_title: 'Buscar a un familiar',
    family_subtitle: 'Datos privados · solo personal autorizado',

    // Qué NO hacer ahora
    dont_do_heading: 'Qué NO hacer ahora',
    dont_do_intro: 'Evita saturar la logística y los riesgos en zona.',

    // Puntos / pie
    points_count: '{count} verificados',
    footer_verify: '🛡 ¿Es de fiar esta campaña? Verifícala',

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
    source: 'Global Emergency',
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
    meta_title: 'Iniciar sesión — ResponseGrid',
    meta_description: 'Inicia sesión en ResponseGrid.',
  },

  // ── Signup page ───────────────────────────────────────────────────────────
  signup: {
    title: 'Crear cuenta',
    subtitle: 'Únete a ResponseGrid para coordinar recursos en emergencias.',
    name_label: 'Nombre completo',
    email_label: 'Correo electrónico',
    password_label: 'Contraseña',
    password_hint: '(mín. 8 caracteres)',
    submit: 'Crear cuenta',
    submitting: 'Creando cuenta…',
    already_account: '¿Ya tienes cuenta?',
    login_link: 'Inicia sesión',
    error_fallback: 'Error al crear la cuenta',
    meta_title: 'Crear cuenta — ResponseGrid',
    meta_description: 'Regístrate en ResponseGrid para coordinar emergencias.',
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
    // Rich card extras
    accepts_label: 'Acepta',
    meta_contact: 'Contacto:',
    meta_schedule: 'Horario:',
    meta_manager: 'Responsable:',
    meta_source: 'Fuente:',
    // aria-label for the card article element
    aria_label: 'Punto activo: {name}',
  },

  // ── ResourceList ──────────────────────────────────────────────────────────
  resource_list: {
    aria_label: 'Puntos activos verificados',
    showing: 'Mostrando {shown} de {total}',
    search_results: '{n} resultados',
    load_more: 'Cargar más',
    loading: 'Cargando…',
    load_more_error: 'No se pudo cargar más. Reintentar',
  },

  // ── ResourceFilterBar ─────────────────────────────────────────────────────
  resource_filter: {
    aria_label: 'Filtros de puntos activos',
    category_label: 'Categoría',
    country_label: 'País',
    search_label: 'Buscar',
    search_placeholder: 'Buscar por nombre, ciudad…',
    all_categories: 'Todas',
    all_countries: 'Todos',
    active_filters_label: 'Filtros activos',
    remove_filter: 'Quitar filtro {label}',
    group_venezuela: 'Venezuela',
    group_diaspora: 'Diáspora',
    group_other: 'Otros',
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
    meta_title: 'Ofrecer un recurso — {emergencyName} · ResponseGrid',
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
    meta_title: 'Poner una petición — {emergencyName} · ResponseGrid',
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
    meta_title: 'Donar material — {emergencyName} · ResponseGrid',
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
    meta_title: 'Apuntarme como voluntario — {emergencyName} · ResponseGrid',
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
    meta_title: 'Buscar familiar — {emergencyName} · ResponseGrid',
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
    meta_title: 'Mi búsqueda — {emergencyName} · ResponseGrid',
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
    meta_title: 'Reunificación — {emergencyName} · ResponseGrid',
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
    meta_title: 'Enviar parte — {emergencyName} · ResponseGrid',
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

  // ── Página: Sobre nosotros (/sobre) ───────────────────────────────────────
  about: {
    meta_title: 'Sobre nosotros — ResponseGrid, un proyecto de Global Emergency',
    meta_description:
      'ResponseGrid es la plataforma open source de Global Emergency para coordinar ayuda en emergencias: puntos verificados, necesidades reales, voluntariado y mapa en tiempo real.',
    overline: 'Sobre nosotros',
    h1: 'Coordinamos la ayuda para que llegue donde de verdad hace falta',
    lead:
      'ResponseGrid es una plataforma libre y sin ánimo de lucro de Global Emergency. Conecta a la ciudadanía, las organizaciones y la coordinación durante una catástrofe para que cada esfuerzo sea útil, verificado y sin saturar la logística.',
    stat_open: 'Código abierto',
    stat_open_value: 'MIT',
    stat_realtime: 'Información en tiempo real',
    stat_realtime_value: '24/7',
    stat_data: 'Datos alojados en la UE',
    stat_data_value: 'RGPD',
    mission_heading: 'Nuestra misión',
    mission_body:
      'Que la ayuda llegue antes y mejor. Reducimos el ruido, evitamos desplazamientos inútiles y damos a la coordinación una imagen real de necesidades, recursos y voluntariado sobre un único mapa.',
    how_heading: 'Cómo lo hacemos',
    how_body:
      'Publicamos solo puntos y campañas verificados por coordinación local, validamos las necesidades reales y casamos las ofertas de material con quien las pide. Toda la información es oficial y en tiempo real.',
    open_heading: 'Open source y de los voluntarios',
    open_body:
      'El código es abierto (licencia MIT) y está hecho y mantenido por personas voluntarias. Cualquiera puede auditarlo, mejorarlo o desplegarlo para su territorio.',
    ge_heading: 'Parte de Global Emergency',
    ge_body:
      'ResponseGrid es uno de los proyectos de Global Emergency, una iniciativa que democratiza el acceso a tecnología profesional para Protección Civil y los servicios de emergencia.',
    ge_link: 'Conoce Global Emergency',
    cta_heading: '¿Quieres ayudar ahora?',
    cta_body: 'Consulta las emergencias activas y descubre cómo puedes colaborar.',
    cta_button: 'Ver emergencias activas',
  },

  // ── Página: Cómo funciona (/como-funciona) ────────────────────────────────
  how_page: {
    meta_title: 'Cómo funciona — ResponseGrid',
    meta_description:
      'Así funciona ResponseGrid: registras lo que ofreces, la coordinación local lo verifica y se convierte en ayuda útil. Información oficial y en tiempo real, sin saturar la logística.',
    overline: 'Cómo funciona',
    h1: 'De tu ofrecimiento a ayuda útil, en tres pasos',
    lead:
      'ResponseGrid ordena el caos de una emergencia: capta señales, las valida y las convierte en decisiones. Nada se publica hasta que la coordinación local lo verifica.',
    step1_title: 'Registras lo que ofreces',
    step1_body:
      'Ofreces un recurso (almacén, transporte, espacio), te apuntas como voluntario o pones una necesidad. Captamos tu señal al instante; nada se publica sin validar.',
    step2_title: 'La coordinación verifica',
    step2_body:
      'Coordinadores locales validan cada punto, campaña y necesidad. Las organizaciones acreditadas obtienen el sello oficial. La confianza es el producto.',
    step3_title: 'Se convierte en ayuda útil',
    step3_body:
      'Las necesidades validadas se casan con ofertas de material y voluntariado, todo sobre un mapa en tiempo real. Sin desplazamientos inútiles ni cadenas logísticas saturadas.',
    trust_heading: 'Tres niveles de confianza',
    trust_intro: 'Cada recurso y campaña muestra siempre su nivel de verificación:',
    trust_unverified: 'En cola — aún no llevar material.',
    trust_verified: 'Validado por coordinación local.',
    trust_official: 'Organización acreditada (oficial).',
    cta_heading: 'Empieza a colaborar',
    cta_body: 'Mira las emergencias activas y elige cómo ayudar.',
    cta_button: 'Ver emergencias activas',
  },

  // ── Página: Transparencia (/transparencia) ────────────────────────────────
  transparency: {
    meta_title: 'Transparencia — ResponseGrid',
    meta_description:
      'Transparencia en ResponseGrid: verificación antes de publicar, datos protegidos en la UE (RGPD), código abierto bajo licencia MIT y gobernanza abierta por voluntarios.',
    overline: 'Transparencia',
    h1: 'Transparencia y confianza, por diseño',
    lead:
      'Trabajamos en emergencias, donde la información errónea cuesta tiempo y vidas. Por eso explicamos abiertamente cómo verificamos, cómo tratamos los datos y cómo se gobierna el proyecto.',
    verify_heading: 'Verificamos antes de publicar',
    verify_body:
      'Ningún punto, campaña o necesidad se hace público sin que la coordinación local lo valide. Las organizaciones se acreditan para obtener el sello oficial, y cada acción queda auditada.',
    data_heading: 'Tus datos, protegidos',
    data_body:
      'Privacidad por diseño: pedimos los datos mínimos, las ubicaciones sensibles se publican con coordenadas aproximadas y los datos personales (como documentos de reunificación familiar) nunca se exponen. Datos alojados en la UE, conforme al RGPD.',
    license_heading: 'Código abierto (MIT)',
    license_body:
      'Todo el código es público y está bajo licencia MIT. Cualquiera puede auditarlo, contribuir o desplegarlo. Sin cajas negras: lo que ves es lo que hace.',
    governance_heading: 'Gobernanza abierta',
    governance_body:
      'ResponseGrid es un proyecto de Global Emergency, mantenido por voluntarios. Las decisiones y la hoja de ruta se debaten en abierto en el repositorio público.',
    legal_heading: 'Documentos legales',
    legal_body: 'Consulta las políticas comunes de todos los proyectos de Global Emergency:',
    cta_heading: 'Revisa el código',
    cta_body: 'Todo el proyecto es público y auditable en GitHub.',
    cta_button: 'Ver en GitHub',
  },

  // ── Página: Verificar una campaña (/verificar) ────────────────────────────
  verify_page: {
    meta_title: 'Cómo verificar una campaña — ResponseGrid',
    meta_description:
      'Antes de donar o llevar material, aprende a verificar una campaña de emergencia: niveles de confianza, sello oficial y señales de alerta para evitar fraudes.',
    overline: 'Verificar una campaña',
    h1: '¿Es de fiar esta campaña? Aprende a verificarla',
    lead:
      'En una emergencia proliferan las llamadas a la ayuda, y no todas son fiables. ResponseGrid marca cada campaña y punto con su nivel de confianza para que sepas en quién confiar.',
    levels_heading: 'Los niveles de confianza',
    level_unverified_title: 'En cola',
    level_unverified_body: 'Recién creada, aún sin validar. No lleves material todavía: espera a que se verifique.',
    level_verified_title: 'Verificada',
    level_verified_body: 'Validada por la coordinación local de la emergencia. Información fiable y actualizada.',
    level_official_title: 'Oficial',
    level_official_body: 'Publicada por una organización acreditada. El máximo nivel de confianza.',
    steps_heading: 'Cómo comprobarla en 4 pasos',
    step1: 'Mira el sello de confianza en la ficha de la campaña o el punto.',
    step2: 'Comprueba que la emergencia esté activa y con comunicado oficial.',
    step3: 'Antes de trasladarte, confirma la dirección por teléfono (las ubicaciones sensibles son aproximadas).',
    step4: 'Dona dinero a entidades verificadas; evita el material no solicitado.',
    warning_heading: 'Señales de alerta',
    warning_body:
      'Desconfía de campañas sin verificar que piden dinero por canales privados, datos bancarios por mensajería o envíos a direcciones sin punto receptor asignado. Ante la duda, no actúes y avisa a coordinación.',
    cta_heading: 'Consulta las campañas verificadas',
    cta_body: 'Entra en una emergencia activa y filtra por puntos y campañas verificados.',
    cta_button: 'Ver emergencias activas',
  },
};

export type Messages = typeof es;
