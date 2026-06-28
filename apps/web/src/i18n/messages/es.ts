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
      resources_developers: 'API para desarrolladores',
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
    my_permissions: 'Mis permisos',
    groups: 'Mis grupos',
    admin_permissions: 'Permisos y roles',
    admin_api_keys: 'API keys',
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

    // Subtítulos de "¿Cómo quieres ayudar?"
    help_offer_subtitle: 'Almacén · transporte · espacio',
    help_volunteer_subtitle: 'Disponibilidad y habilidades',
    help_petition_subtitle: 'Solicitar material validado',

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
    map_user_location_notice: 'Tu ubicación no se publica ni se comparte.',

    // Privacy (F09)
    privacy_approximate_location: 'Coordenadas aproximadas — verifica la dirección por teléfono antes de trasladarte.',

    // Footer links
    footer_my_points: 'Mis puntos',
    footer_my_volunteer: 'Mi voluntariado',
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

  // ── Nearby points ("Puntos cerca de ti") ─────────────────────────────────
  nearby_points: {
    button_find: 'Ver puntos cerca de mí',
    button_clear: 'Volver a la lista',
    loading: 'Buscando puntos cercanos…',
    geo_error: 'No pudimos obtener tu ubicación. Comprueba los permisos del navegador.',
    geo_error_dismiss: 'Cerrar',
    showing_nearby: '{n} puntos cercanos',
    privacy_note: 'Tu ubicación solo se usa en tu navegador para ordenar por cercanía; no se guarda.',
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
      'Privacidad por diseño: pedimos los datos mínimos, las ubicaciones sensibles se publican con coordenadas aproximadas y los datos personales (como los datos de contacto de quienes ofrecen o solicitan ayuda) nunca se exponen. Datos alojados en la UE, conforme al RGPD.',
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

  // ── Página: API para desarrolladores (/docs) ──────────────────────────────
  docs: {
    meta_title: 'API para desarrolladores — ResponseGrid',
    meta_description:
      'Documentación de la API pública de ResponseGrid: consulta sin login los puntos logísticos verificados y las necesidades validadas de cada emergencia para construir mapas y servicios sobre la fuente de la verdad.',
    overline: 'API para desarrolladores',
    h1: 'Construye sobre la fuente de la verdad',
    lead:
      'La API pública de ResponseGrid te da acceso, sin login, a los puntos logísticos verificados y a las necesidades validadas de cada emergencia. Está pensada para que cualquier proyecto —un mapa, un buscador, un panel— consuma datos oficiales y en tiempo real en vez de duplicarlos.',

    toc_heading: 'En esta página',
    nav_intro: 'Visión general',
    nav_concepts: 'Conceptos',
    nav_auth: 'Autenticación',
    nav_quickstart: 'Inicio rápido: un mapa de puntos',
    nav_emergencies: 'Listar emergencias',
    nav_resources: 'Puntos logísticos (lectura)',
    nav_needs: 'Necesidades (lectura)',
    nav_enums: 'Estados y categorías',
    nav_write: 'Aportar datos (con token)',
    nav_practices: 'Buenas prácticas',
    nav_license: 'Licencia y atribución',
    nav_links: 'Referencia y enlaces',

    // Visión general
    intro_heading: 'Visión general',
    intro_p1:
      'ResponseGrid coordina la ayuda durante una catástrofe: publica los puntos logísticos verificados, recoge y valida las necesidades, y lo mantiene todo en un mapa en tiempo real. Esta API expone esa misma información para que la integres en tu propio producto.',
    intro_p2:
      'El objetivo es que no haya cien mapas distintos contradiciéndose: tú consumes los datos verificados y nosotros somos la fuente de la verdad. Solo se publica lo que la coordinación local ha validado, así que lo que lees ya está depurado.',
    base_url_heading: 'URL base',
    base_url_note:
      'La URL base depende del despliegue; usa la que te indiquemos para producción. Los ejemplos de esta página usan esta instancia.',
    overview_format_label: 'Formato',
    overview_format_value: 'JSON sobre HTTPS. Todas las respuestas son UTF-8.',
    overview_read_label: 'Lectura',
    overview_read_value: 'Pública, sin autenticación. Todos los GET de esta sección son anónimos.',
    overview_write_label: 'Escritura',
    overview_write_value: 'Requiere un token JWT (Bearer). Ver «Aportar datos».',
    overview_scope_label: 'Ámbito',
    overview_scope_value: 'Todo cuelga de una emergencia, identificada por su UUID o su slug.',
    overview_license_label: 'Licencia de datos',
    overview_license_value: 'CC BY-SA 4.0 — atribución obligatoria + compartir igual.',

    // Conceptos
    concepts_heading: 'Conceptos',
    concepts_intro:
      'Cuatro ideas bastan para consumir la API con criterio:',
    concept_emergency_t: 'Emergencia',
    concept_emergency_b:
      'El contenedor de todo. Tiene un nombre, un slug legible (p. ej. «venezuela»), país y estado (activa / en pausa / cerrada). Cada punto y cada necesidad pertenece a una emergencia.',
    concept_resource_t: 'Punto logístico',
    concept_resource_b:
      'Un sitio físico: punto de recogida o de entrega, almacén, transporte, proveedor o local. Trae nombre, ubicación (dirección + coordenadas), qué acepta, contacto, horario y un semáforo de estado operativo.',
    concept_need_t: 'Necesidad',
    concept_need_b:
      'Lo que se pide en el terreno (agua, alimentos, material sanitario, personal…), con prioridad e ítems. Públicamente solo se exponen las necesidades validadas por coordinación.',
    concept_trust_t: 'Niveles de confianza',
    concept_trust_b:
      'Cada punto lleva un nivel: en cola (aún no fiable), verificado (validado por la coordinación local) u oficial (organización acreditada). La API pública solo devuelve puntos verificados u oficiales: por eso es fuente de la verdad.',

    // Autenticación
    auth_heading: 'Autenticación',
    auth_intro:
      'Hay dos planos. Distínguelos antes de integrar.',
    auth_read_t: 'Lectura — sin token',
    auth_read_b:
      'Los endpoints de consulta (emergencias, puntos públicos, necesidades públicas) no requieren credenciales. Si solo quieres mostrar datos, no necesitas autenticarte.',
    auth_write_t: 'Escritura — token Bearer',
    auth_write_b:
      'Para crear necesidades, ofertas o puntos necesitas una cuenta. Regístrate o haz login y recibirás un accessToken (JWT) que envías en la cabecera Authorization: Bearer <token>.',

    // Inicio rápido
    qs_heading: 'Inicio rápido: un mapa de puntos',
    qs_intro:
      'El caso más común: pintar en un mapa dónde se puede recoger o entregar ayuda. Tres llamadas y listo.',
    qs_step1: 'Elige una emergencia: lista las activas y quédate con su id (o resuelve el slug).',
    qs_step2: 'Pide sus puntos públicos paginando (hasta 100 por página).',
    qs_step3: 'Pinta un marcador por cada punto y coloréalo según su estado.',
    qs_note:
      'Consume la API desde tu backend (servidor a servidor). Las peticiones desde el navegador de otro dominio están sujetas a la lista CORS de la API; si tu app es solo-cliente, haz de proxy desde tu servidor.',

    // Listar emergencias
    e_heading: 'Listar emergencias',
    e_intro:
      'Devuelve las emergencias activas. Úsalo para obtener el emergencyId que necesitan el resto de llamadas.',
    e_byslug:
      'Si ya conoces el slug (lo ves en la URL pública, p. ej. /e/venezuela), puedes resolver la emergencia directamente:',
    e_fields:
      'Cada emergencia incluye id, name, slug, country, status, announcement (comunicado oficial o null), dontBringList (qué NO llevar) y updatedAt.',

    // Puntos logísticos (lectura) — estrella
    r_heading: 'Puntos logísticos (lectura)',
    r_intro:
      'El endpoint principal. Devuelve, paginados, los puntos publicados de una emergencia: solo los verificados u oficiales y visibles. Es lo que pintarías en un mapa.',
    r_params_heading: 'Parámetros de consulta',
    r_param_page: 'Página, empezando en 1.',
    r_param_limit: 'Elementos por página. Por defecto 50, máximo 100.',
    r_param_category: 'Filtra por categoría que el punto acepta (slug, p. ej. water, food).',
    r_param_country: 'Filtra por país tal y como lo guarda el origen (p. ej. VE o «Venezuela»).',
    r_response_heading: 'Respuesta',
    r_response_intro:
      'Un objeto paginado: items (los puntos), total, page y limit.',
    r_fields_heading: 'Campos públicos de un punto',
    r_fields_intro:
      'La información pública es mínima pero suficiente para ubicar y decidir: nombre, dónde está, qué acepta y en qué estado opera.',
    r_facets_heading: 'Facetas (para construir filtros)',
    r_facets_intro:
      'Si necesitas montar filtros en tu interfaz, este endpoint te da los recuentos por categoría y por país de los puntos visibles, sin tener que descargarlos todos.',

    // Necesidades (lectura)
    n_heading: 'Necesidades (lectura)',
    n_intro:
      'Devuelve las necesidades validadas de una emergencia. Útil para mostrar qué hace falta y dónde. Acepta filtros por categoría (category) y prioridad (priority).',
    n_privacy:
      'Privacidad: algunas necesidades exponen coordenadas aproximadas (locationSensitivity: "approximate") para no revelar el domicilio de quien pide. No intentes desofuscarlas; trátalas como orientativas.',
    n_fields:
      'Cada necesidad incluye id, title, description, location, locationSensitivity, priority, items (con name, quantity, unit y category), status, createdAt, expiresAt y lastVerifiedAt.',

    // Estados y categorías
    enums_heading: 'Estados y categorías',
    enums_intro:
      'Valores que verás en las respuestas. Muéstralos a tus usuarios en lugar de inventar los tuyos: así tu app habla el mismo idioma que el resto del ecosistema.',
    enum_status_heading: 'Estado operativo (semáforo)',
    enum_status_intro: 'El campo publicStatus de cada punto:',
    status_active: 'Operativo y aceptando ayuda.',
    status_saturated: 'Desbordado: mejor no llevar más material ahora.',
    status_paused: 'En pausa temporal.',
    status_closed: 'Cerrado.',
    enum_verification_heading: 'Nivel de confianza',
    enum_verification_intro: 'El campo verificationLevel (la API pública solo devuelve los dos últimos):',
    verification_unverified: 'En cola, sin validar (no aparece en la API pública).',
    verification_verified: 'Validado por la coordinación local.',
    verification_official: 'Publicado por una organización acreditada.',
    enum_type_heading: 'Tipo de punto',
    enum_type_intro: 'El campo type:',
    enum_stage_heading: 'Rol en la cadena',
    enum_stage_intro: 'El campo stage: origin (origen), intermediate (intermedio) o destination (destino).',
    enum_category_heading: 'Categorías',
    enum_category_intro: 'Usadas en accepts (puntos), en items[].category (necesidades) y como filtro category.',
    enum_priority_heading: 'Prioridad',
    enum_priority_intro: 'El campo priority de las necesidades: low, medium, high, urgent.',

    // Aportar datos
    w_heading: 'Aportar datos (con token)',
    w_intro:
      'Además de leer, puedes alimentar la plataforma desde tu integración: dar de alta necesidades, ofertas de material (entregas) o puntos logísticos. Estas operaciones requieren un token (ver Autenticación).',
    w_moderation_note:
      'Importante: lo que envías no se publica al instante. Las necesidades nacen como «pendientes» y los puntos como «sin verificar»; la coordinación local los valida antes de que aparezcan en los endpoints públicos. Es lo que mantiene la calidad de la fuente.',
    w_auth_step: 'Primero, consigue un token:',
    w_need_t: 'Crear una necesidad',
    w_need_b: 'Mínimo: title, priority, location e items (al menos uno). Devuelve el id creado.',
    w_offer_t: 'Ofrecer material (entrega)',
    w_offer_b:
      'Una donación, general o dirigida a una necesidad concreta (targetNeedId). Mínimo: category, description, quantity y location. Si la emergencia no acepta altas (en pausa/cerrada) responde 409.',
    w_resource_t: 'Registrar un punto logístico',
    w_resource_b:
      'Mínimo: type, stage, name y location. Opcional: accepts, contact, schedule, country, city. Nace sin verificar hasta que coordinación lo publica.',

    // Buenas prácticas
    bp_heading: 'Buenas prácticas',
    bp_cache_t: 'Cachea y consulta con cabeza',
    bp_cache_b:
      'No martillees la API: pagina, cachea las respuestas y refresca cada pocos minutos. Usa updatedAt, lastVerifiedAt y externalUpdatedAt para saber qué tan fresco es un dato.',
    bp_attribution_t: 'Cita la fuente (obligatorio)',
    bp_attribution_b:
      'No es solo cortesía: la licencia de los datos (CC BY-SA 4.0) te obliga a atribuir a ResponseGrid / Global Emergency y a enlazar de vuelta. Tienes el texto listo para pegar en «Licencia y atribución».',
    bp_canonical_t: 'Respeta los niveles de confianza',
    bp_canonical_b:
      'Muestra a tus usuarios el verificationLevel y el publicStatus. Un punto «oficial y operativo» no es lo mismo que uno «verificado y saturado»: esa señal es justo el valor que aportamos.',
    bp_privacy_t: 'Cuida la privacidad',
    bp_privacy_b:
      'Trata las ubicaciones aproximadas como tales y no cruces datos para reidentificar a personas. La ayuda va antes que el dato bonito.',
    bp_cors_t: 'Llama desde tu servidor',
    bp_cors_b:
      'Los GET públicos son anónimos, pero la API restringe el CORS de navegador a orígenes permitidos. Consume servidor a servidor o haz de proxy desde tu backend.',

    // Licencia y atribución
    license_heading: 'Licencia y atribución',
    license_intro:
      'Los datos que devuelve la API se publican bajo Creative Commons Reconocimiento-CompartirIgual 4.0 (CC BY-SA 4.0). Puedes usarlos, redistribuirlos y adaptarlos —incluso con fines comerciales— siempre que cumplas dos condiciones. (Es la licencia de los datos; el código del proyecto tiene su propia licencia.)',
    license_attribution_t: 'Atribución obligatoria',
    license_attribution_b:
      'Da crédito a ResponseGrid / Global Emergency, indica la licencia y enlaza de vuelta a la fuente. El crédito debe estar visible allá donde muestres los datos.',
    license_sharealike_t: 'Compartir igual',
    license_sharealike_b:
      'Si mezclas, transformas o construyes una base de datos a partir de estos datos y la distribuyes, debes publicarla bajo esta misma licencia, CC BY-SA 4.0.',
    license_snippet_intro: 'Texto de atribución listo para pegar:',
    license_full_link: 'Texto legal completo de la licencia',

    // Referencia y enlaces
    links_heading: 'Referencia y enlaces',
    links_swagger_t: 'Referencia interactiva (Swagger)',
    links_swagger_b: 'Explora y prueba todos los endpoints en vivo.',
    links_openapi_t: 'Especificación OpenAPI',
    links_openapi_b: 'El JSON de OpenAPI, para generar clientes o importar en tus herramientas.',
    links_client_t: 'Cliente TypeScript tipado',
    links_client_b:
      'Paquete @reliefhub/api-client (openapi-fetch): tipos y autocompletado para consumir la API desde TypeScript.',

    // Tablas
    th_field: 'Campo',
    th_type: 'Tipo',
    th_desc: 'Descripción',
    th_param: 'Parámetro',
    th_value: 'Valor',

    // Descripciones de campos del punto
    f_id: 'Identificador único del punto.',
    f_name: 'Nombre del centro o punto.',
    f_type: 'Tipo de punto (ver «Tipo de punto»).',
    f_stage: 'Rol en la cadena: origen, intermedio o destino.',
    f_description: 'Descripción libre. Puede ser null.',
    f_location: 'Dirección y coordenadas (latitude, longitude).',
    f_status: 'Estado operativo: el semáforo (active, saturated, paused, closed).',
    f_verification: 'Nivel de confianza: verified u official.',
    f_accepts: 'Categorías que el punto acepta (p. ej. ["water","food"]).',
    f_contact: 'Teléfono o contacto del punto. Puede ser null.',
    f_schedule: 'Horario de atención. Puede ser null.',
    f_manager: 'Persona responsable. Puede ser null.',
    f_source: 'Origen del dato cuando procede de una fuente externa. Puede ser null.',
    f_freshness: 'Fecha (ISO 8601) de la última actualización en el origen. Puede ser null.',
    f_country: 'País tal y como lo guarda el origen (a menudo el nombre completo). Puede ser null.',
    f_city: 'Ciudad. Puede ser null.',
    f_owner: 'Organización propietaria del punto. Puede ser null.',

    cta_heading: '¿Construyes algo con esto?',
    cta_body: 'Empieza por las emergencias activas y trae sus puntos públicos. Cítanos como fuente y enlaza de vuelta.',
    cta_button: 'Ver emergencias activas',

    copy: 'Copiar',
    copied: 'Copiado',
  },
};

export type Messages = typeof es;
