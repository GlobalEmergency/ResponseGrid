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

    // server-action messages
    default_address: 'Sin dirección',
    intake_paused: 'El alta está en pausa en esta emergencia. Inténtalo más tarde.',
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
    administration: 'Administración',
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

    // Menú de opciones (cabecera compacta en móvil)
    menu_options: 'Opciones',
    menu_language: 'Idioma',
    menu_how_it_works: 'Cómo funciona',
    menu_verify: 'Verificar una campaña',

    // Tarjetas de métricas
    metric_tile_open: 'Necesidades abiertas',
    metric_tile_points: 'Puntos activos',
    metric_tile_covered: 'Cubiertas',
    metric_tile_queue: 'En cola',

    // Subtítulos de "¿Cómo quieres ayudar?"
    help_offer_subtitle: 'Almacén · transporte · espacio',
    help_volunteer_subtitle: 'Disponibilidad y habilidades',
    help_petition_subtitle: 'Solicitar material validado',
    help_transport_subtitle: 'Carretera · marítimo · aéreo',

    // Qué NO hacer ahora
    dont_do_heading: 'Qué NO hacer ahora',
    dont_do_intro: 'Evita saturar la logística y los riesgos en zona.',

    // Puntos / pie
    points_count: '{count} verificados',
    footer_verify: '🛡 ¿Es de fiar esta campaña? Verifícala',

    // Metrics
    metrics_heading: 'Resumen del operativo',
    metrics_caption: 'Cifras globales de la emergencia',
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
    action_offer_transport: 'Ofrezco transporte',
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

    // Explorador segmentado (Puntos | Necesidades)
    tab_points: 'Puntos',
    tab_needs: 'Necesidades',
    explore_heading: 'En el mapa',
    explore_aria: 'Puntos activos y necesidades validadas',

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
    footer_my_shipments: 'Mis expediciones',
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
    err_invalid_credentials: 'Credenciales incorrectas.',
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

    // server-action messages
    err_all_fields_required: 'Todos los campos son obligatorios.',
    err_password_too_short: 'La contraseña debe tener al menos 8 caracteres.',
    err_email_exists: 'Ese email ya está registrado.',
    err_signup_failed: 'Error al crear la cuenta. Inténtalo de nuevo.',
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
    // Destinatario final (#60)
    final_recipient_label: 'Destinatario final',
    // Contacto oficial (#64)
    meta_contact_official: 'Contacto oficial:',
    no_official_contact: 'Sin contacto oficial',
  },

  resource_detail: {
    back: 'Volver a la emergencia',
    needs_heading: 'Necesidades de este destinatario',
    needs_empty: 'Este destinatario no tiene necesidades publicadas.',
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

  // ── NearbyNeeds (#57) ─────────────────────────────────────────────────────
  nearby_needs: {
    button_find: 'Ver necesidades cerca de mí',
    button_clear: 'Volver a la lista',
    loading: 'Buscando necesidades cercanas…',
    geo_error: 'No pudimos obtener tu ubicación. Comprueba los permisos del navegador.',
    geo_error_dismiss: 'Cerrar',
    showing_nearby: '{n} necesidades cercanas',
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

    // server-action messages
    err_invalid_type: 'Tipo de recurso no válido.',
    err_invalid_stage: 'Etapa no válida.',
    err_name_too_short: 'El nombre debe tener al menos 2 caracteres.',
    err_location_required: 'Selecciona una ubicación.',
    err_register_failed: 'Error al registrar. Inténtalo de nuevo.',
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

    // server-action messages
    err_title_too_short: 'El título debe tener al menos 2 caracteres.',
    err_invalid_priority: 'Prioridad no válida.',
    err_location_required: 'Selecciona una ubicación.',
    err_items_required: 'Añade al menos un artículo.',
    err_invalid_items: 'Revisa los artículos: cada uno necesita nombre, cantidad y categoría.',
    err_submit_failed: 'Error al enviar la petición. Inténtalo de nuevo.',
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

    // server-action messages
    err_invalid_category: 'Categoría no válida.',
    err_description_too_short: 'Describe el material (al menos 2 caracteres).',
    err_invalid_quantity: 'La cantidad debe ser un número entero positivo.',
    err_location_required: 'Selecciona una ubicación.',
    err_submit_failed: 'Error al enviar la oferta. Inténtalo de nuevo.',
  },

  // ── Ofrecer transporte (#105) ─────────────────────────────────────────────
  ofrecerTransporte: {
    page_title: 'Ofrezco transporte',
    page_subtitle: '{emergencyName} · Pon tu capacidad de transporte a disposición del operativo.',
    meta_title: 'Ofrezco transporte — {emergencyName} · ResponseGrid',
    meta_description: 'Ofrece capacidad de transporte para mover material en {emergencyName}.',

    intro:
      'Indica cuánta carga puedes mover y por qué zona. Coordinación casará tu capacidad con los envíos que la necesiten.',

    // Modo de transporte
    mode_label: 'Modo de transporte',
    mode_road: 'Carretera',
    mode_sea: 'Marítimo',
    mode_air: 'Aéreo',

    // Capacidad
    capacity_legend: 'Capacidad de carga',
    capacity_hint: 'Indica al menos peso o volumen.',
    weight_label: 'Peso (kg)',
    weight_placeholder: 'Ej. 1500',
    volume_label: 'Volumen (m³)',
    volume_placeholder: 'Ej. 12',

    // Cobertura
    coverage_label: '¿Qué zona o ruta cubres?',
    coverage_placeholder: 'Ej. Caracas → La Guaira, o Estado Vargas',

    // Ventana de disponibilidad
    window_legend: 'Disponibilidad',
    window_from_label: 'Desde',
    window_to_label: 'Hasta',

    // Restricciones
    constraints_legend: 'Condiciones de la carga',
    constraint_refrigerated: 'Refrigerado',
    constraint_hazmat: 'Mercancías peligrosas',
    constraint_fragile: 'Frágil',

    // Notas
    notes_label: 'Notas adicionales',
    notes_placeholder: 'Ej. Salida diaria a las 08:00',

    submit: 'Publicar capacidad',
    submitting: 'Publicando…',
    success_message:
      'Capacidad de transporte publicada. Coordinación la tendrá en cuenta para los envíos de esta emergencia.',
    success_offer_again: 'Publicar otra capacidad',
    error_fallback: 'Error al publicar la capacidad',

    // server-action messages
    err_invalid_mode: 'Selecciona un modo de transporte válido.',
    err_capacity_required: 'Indica al menos peso (kg) o volumen (m³).',
    err_capacity_invalid: 'El peso y el volumen deben ser números positivos.',
    err_coverage_required: 'Indica la zona o ruta que cubres.',
    err_window_invalid: 'La fecha de fin debe ser posterior a la de inicio.',
    err_submit_failed: 'Error al publicar la capacidad. Inténtalo de nuevo.',
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

    // server-action messages
    err_name_too_short: 'El nombre debe tener al menos 2 caracteres.',
    err_contact_too_short: 'El contacto debe tener al menos 2 caracteres.',
    err_municipality_too_short: 'El municipio debe tener al menos 2 caracteres.',
    err_invalid_availability: 'Disponibilidad no válida.',
    err_invalid_vehicle: 'Tipo de vehículo no válido.',
    err_consent_required: 'Debes aceptar el consentimiento para registrarte como voluntario.',
    err_intake_paused: 'Esta emergencia no está aceptando voluntarios en este momento (en pausa).',
    err_consent_data_required: 'Debes aceptar el consentimiento de tratamiento de datos para registrarte.',
    err_register_failed: 'Error al registrar. Inténtalo de nuevo.',
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

    // server-action messages
    err_invalid_type: 'Selecciona un tipo de parte válido.',
    err_invalid_priority: 'Selecciona una prioridad válida.',
    err_note_required: 'La nota no puede estar vacía.',
    err_no_permission: 'No tienes permisos para enviar partes en esta emergencia.',
    err_submit_failed: 'No se pudo enviar el parte. Inténtalo de nuevo.',
    err_no_permission_review: 'No tienes permisos para revisar este parte.',
    err_mark_reviewed_failed: 'No se pudo marcar como revisado. Inténtalo de nuevo.',
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
      'Hay tres esquemas. Identifica cuál acepta cada endpoint antes de integrar.',
    auth_read_t: 'Lectura — sin token',
    auth_read_b:
      'Los endpoints de consulta (emergencias, puntos públicos, necesidades públicas) no requieren credenciales. Si solo quieres mostrar datos, no necesitas autenticarte.',
    auth_write_t: 'Escritura — token Bearer',
    auth_write_b:
      'Para crear necesidades, ofertas o puntos necesitas una cuenta de usuario. Regístrate o haz login y recibirás un accessToken (JWT) que envías en la cabecera Authorization: Bearer <token>.',
    auth_sa_t: 'Cuentas de servicio — cabecera x-api-key',
    auth_sa_b:
      'Para integraciones máquina-a-máquina existen las cuentas de servicio. Un administrador crea la cuenta y emite una clave (rh_live_…) que viaja en la cabecera x-api-key (no como Bearer). Con ella el llamante puede introspeccionar su identidad y permisos: GET /service-accounts/me.',
    auth_note:
      'Una clave x-api-key autentica al principal de la cuenta de servicio, pero no sustituye al Bearer en los endpoints de escritura documentados (necesidades, ofertas y puntos): estos esperan un JWT de cuenta de usuario y responden 401 ante una API key. Una cuenta de servicio solo puede actuar dentro de sus grants (por defecto, ninguno), así que sin permisos explícitos su clave no habilita escritura.',

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

  // ── Utility + account pages ────────────────────────────────────────────────
  offline: {
    title: 'Sin conexión',
    body: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo. Los borradores que hayas iniciado se conservan para cuando vuelvas a estar en línea.',
    retry: 'Reintentar',
  },

  auth_complete: {
    connecting: 'Conectando…',
  },

  organizaciones: {
    meta_title: 'Mis organizaciones — ResponseGrid',
    meta_description: 'Gestión de organizaciones en ResponseGrid.',
    back: '← Inicio',
    title: 'Mis organizaciones',
    subtitle: 'Organizaciones a las que perteneces.',
    list_heading: 'Organizaciones',
    empty_title: 'Aún no perteneces a ninguna organización.',
    empty_description: 'Crea una a continuación o pide que te añadan a una existente.',
    create_heading: 'Crear organización',
    form_error: 'Error al crear la organización',
    f_name: 'Nombre',
    f_name_ph: 'Cruz Roja España',
    f_type: 'Tipo',
    f_type_ph: 'Selecciona un tipo…',
    f_type_ngo: 'ONG',
    f_type_company: 'Empresa',
    f_type_public: 'Administración pública',
    f_type_association: 'Asociación',
    f_type_transport: 'Operador de transporte',
    f_type_other: 'Otra',
    f_taxid: 'NIF / CIF',
    f_email: 'Email de contacto',
    f_email_ph: 'contacto@org.es',
    creating: 'Creando…',

    // server-action messages
    err_name_type_required: 'El nombre y el tipo son obligatorios.',
    err_create_failed: 'Error al crear la organización. Inténtalo de nuevo.',
    err_email_required: 'El email es obligatorio.',
    err_owner_only: 'Solo el propietario puede gestionar miembros.',
    err_user_not_found: 'No existe un usuario con ese email.',
    err_already_member: 'Este usuario ya es miembro de la organización.',
    err_add_member_failed: 'Error al añadir el miembro. Inténtalo de nuevo.',
    err_owner_cannot_remove_self: 'El propietario no puede eliminarse a sí mismo.',
    err_remove_member_failed: 'Error al eliminar el miembro. Inténtalo de nuevo.',
  },

  org_detail: {
    meta_title: 'Organización — ResponseGrid',
    back: '← Mis organizaciones',
    fallback_title: 'Organización',
    members_heading: 'Miembros',
    role_owner: 'Propietario',
    role_member: 'Miembro',
    add_heading: 'Añadir miembro',
    only_owner: 'Solo el propietario puede añadir o eliminar miembros.',
    add_error: 'Error al añadir el miembro',
    add_success: 'Miembro añadido correctamente.',
    add_email_label: 'Email del usuario a añadir',
    add_email_ph: 'usuario@ejemplo.com',
    adding: 'Añadiendo…',
    add_submit: 'Añadir',
    remove_label: 'Quitar miembro',
    removing: 'Quitando…',
    remove_submit: 'Quitar',
  },

  notificaciones: {
    meta_title: 'Notificaciones — ResponseGrid',
    meta_description: 'Tus notificaciones en ResponseGrid.',
    back: '← Inicio',
    title: 'Notificaciones',
    title_unread: 'Notificaciones ({count} sin leer)',
    heading_sr: 'Tus notificaciones',
    aria_list: 'Lista de notificaciones',
    empty_title: 'No tienes notificaciones todavía.',
    empty_description: 'Cuando haya novedades en tus emergencias o recursos aparecerán aquí.',
    mark_all_label: 'Marcar todas las notificaciones como leídas',
    marking: 'Marcando…',
    mark_all: 'Marcar todas como leídas',
    item_read_aria: 'Notificación leída',
    item_unread_aria: 'Notificación no leída',
    mark_read_label: 'Marcar como leída',
    mark_read: 'Marcar leída',

    // server-action messages
    err_mark_read_forbidden: 'No puedes marcar esta notificación como leída.',
    err_not_found: 'Notificación no encontrada.',
    err_mark_read_failed: 'No se pudo marcar la notificación. Inténtalo de nuevo.',
    err_mark_all_read_failed: 'No se pudieron marcar todas las notificaciones. Inténtalo de nuevo.',
  },

  account: {
    // Shared
    emergency_not_found: 'Emergencia no encontrada · ResponseGrid',
    saving: 'Guardando…',
    processing: 'Procesando…',

    // Mi voluntariado — metadata + header
    vol_meta_title: 'Mi voluntariado — {name} · ResponseGrid',
    vol_meta_description: 'Gestiona tu participación como voluntario en {name}.',
    vol_title: 'Mi voluntariado',
    vol_subtitle: 'Tu perfil y las tareas en las que participas.',

    profile_heading: 'Tu perfil',
    profile_card_aria: 'Tu perfil de voluntario',
    not_registered_title: 'Aún no estás apuntado como voluntario.',
    not_registered_description:
      'Regístrate para que el equipo de coordinación pueda contactarte y asignarte tareas.',
    register_cta: 'Apuntarme como voluntario',
    status_aria: 'Estado: {status}',
    skills_heading: 'Habilidades',
    availability_label: 'Disponibilidad:',
    vehicle_label: 'Vehículo:',
    edit_profile_cta: 'Editar mis datos',

    vol_status_available: 'Disponible',
    vol_status_assigned: 'Asignado',
    vol_status_inactive: 'Inactivo',

    skill_driving: 'Conducción',
    skill_medical: 'Sanitario',
    skill_logistics: 'Logística',
    skill_cooking: 'Cocina',
    skill_languages: 'Idiomas',
    skill_admin: 'Administración',
    skill_general: 'General',

    availability_immediate: 'Inmediata',
    availability_this_week: 'Esta semana',
    availability_flexible: 'Flexible',

    vehicle_none: 'Ninguno',
    vehicle_car: 'Coche',
    vehicle_van: 'Furgoneta',
    vehicle_truck: 'Camión',

    tasks_heading: 'Mis tareas',
    tasks_list_aria: 'Tus tareas asignadas',
    no_tasks_title: 'No tienes tareas asignadas aún.',
    no_tasks_description:
      'El equipo de coordinación te asignará tareas cuando las haya disponibles.',

    task_card_aria: 'Tarea: {name}',
    task_status_label: 'Estado de la tarea:',
    required_skill_label: 'Habilidad requerida:',
    location_label: 'Lugar:',
    updated_success: 'Actualizado correctamente.',
    check_in_cta: 'Check-in — Empezar tarea',
    check_out_cta: 'Check-out — Marcar como terminada',
    task_completed_thanks: 'Tarea completada. ¡Gracias por tu colaboración!',

    task_status_open: 'Abierta',
    task_status_in_progress: 'En progreso',
    task_status_completed: 'Completada',
    task_status_cancelled: 'Cancelada',

    assignment_status_assigned: 'Asignado',
    assignment_status_checked_in: 'En curso',
    assignment_status_checked_out: 'Finalizado',
    assignment_status_aria: 'Estado de asignación: {status}',

    check_in_forbidden: 'No tienes permisos para hacer check-in en esta tarea.',
    check_in_failed: 'No se pudo hacer check-in. Inténtalo de nuevo.',
    check_out_forbidden: 'No tienes permisos para hacer check-out en esta tarea.',
    check_out_failed: 'No se pudo hacer check-out. Inténtalo de nuevo.',

    // Mis puntos — metadata + header
    points_meta_title: 'Mis puntos — {name} · ResponseGrid',
    points_meta_description: 'Gestiona el estado operativo de tus puntos en {name}.',
    points_title: 'Mis puntos',
    points_subtitle: 'Actualiza el estado operativo de los puntos que has registrado.',
    points_list_heading: 'Tus puntos registrados',
    points_list_aria: 'Tus puntos registrados',
    no_points_title: 'Aún no tienes puntos registrados.',
    no_points_description: 'Cuando registres un recurso en esta emergencia aparecerá aquí.',
    point_card_aria: 'Punto: {name}',
    report_incident_cta: 'Reportar incidencia',

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

    current_label: 'Actual:',
    change_status_label: 'Cambiar estado',
    status_invalid: 'Estado no válido.',
    error_unknown: 'Error desconocido',
    status_updated_success: 'Estado actualizado correctamente.',
    save_status_cta: 'Guardar estado',

    public_status_active: 'Operativo',
    public_status_saturated: 'Saturado',
    public_status_paused: 'En pausa',
    public_status_closed: 'Cerrado',

    update_status_forbidden: 'No tienes permisos para cambiar el estado de este punto.',
    update_status_failed: 'No se pudo actualizar el estado. Inténtalo de nuevo.',

    // Mis expediciones (transportista) — metadata + header + lista
    ship_meta_title: 'Mis expediciones — {name} · ResponseGrid',
    ship_meta_description: 'Las expediciones que tienes asignadas en {name}.',
    ship_title: 'Mis expediciones',
    ship_subtitle: 'Los envíos que tienes asignados como transportista.',
    ship_list_label: 'Lista de mis expediciones',
    ship_empty_title: 'No tienes expediciones asignadas.',
    ship_empty_description:
      'Cuando coordinación te asigne un envío aparecerá aquí para que lo marques en tránsito y confirmes la entrega.',
  },

  admin: {
    back: '← Inicio',

    // Acreditaciones
    acc_meta_title: 'Acreditaciones — Admin · ResponseGrid',
    acc_meta_description: 'Gestión de acreditaciones de organizaciones.',
    acc_title: 'Acreditaciones',
    acc_subtitle: 'Gestión de acreditaciones de organizaciones. Solo administradores.',
    acc_manual_note: 'Nota: el ID de organización debe introducirse manualmente (no hay listado global de organizaciones disponible).',
    acc_list_heading: 'Acreditaciones vigentes ({count})',
    acc_empty_title: 'No hay acreditaciones vigentes.',
    acc_empty_description: 'Usa el formulario de abajo para conceder la primera.',
    acc_scope_global: 'Global',
    acc_scope_emergency: 'Emergencia: {id}',
    acc_org_label: 'Org:',
    acc_scope_label: 'Alcance:',
    acc_evidence_label: 'Evidencia:',
    acc_granted_label: 'Concedida:',
    acc_grant_heading: 'Conceder acreditación',
    acc_form_success: 'Acreditación concedida correctamente.',
    acc_f_org_label: 'ID de organización',
    acc_f_org_ph: 'UUID de la organización',
    acc_f_scope_legend: 'Alcance',
    acc_f_scope_global: 'Global (válida para todas las emergencias)',
    acc_f_scope_emergency: 'Esta emergencia (emergencia específica)',
    acc_f_emergency_label: 'ID de emergencia',
    acc_f_emergency_ph: 'UUID de la emergencia',
    acc_f_evidence_label: 'Evidencia (opcional)',
    acc_f_evidence_ph: 'URL o referencia documental',
    acc_f_granting: 'Concediendo…',
    acc_f_submit: 'Conceder acreditación',
    acc_revoking: 'Revocando…',
    acc_revoke: 'Revocar',
    acc_err_org_required: 'El ID de organización es obligatorio.',
    acc_err_emergency_required: 'El ID de emergencia es obligatorio para el alcance "Esta emergencia".',
    acc_err_grant_forbidden: 'No tienes permisos para conceder acreditaciones.',
    acc_err_invalid: 'Datos inválidos. Comprueba el ID de organización y el alcance.',
    acc_err_grant_generic: 'Error al conceder la acreditación. Inténtalo de nuevo.',
    acc_err_revoke_forbidden: 'No tienes permisos para revocar esta acreditación.',
    acc_err_revoke_generic: 'Error al revocar la acreditación. Inténtalo de nuevo.',

    // Auditoría
    audit_meta_title: 'Registro de auditoría — Admin · ResponseGrid',
    audit_meta_description: 'Registro de actividad del sistema. Solo administradores.',
    audit_title: 'Registro de auditoría',
    audit_subtitle: 'Actividad registrada en el sistema. Solo administradores.',
    audit_total_one: '{count} entrada en total',
    audit_total_other: '{count} entradas en total',
    audit_total_filtered: ' (filtrado)',
    audit_filters_aria: 'Filtros',
    audit_recent_heading: 'Entradas recientes',
    audit_empty_title: 'No hay entradas de auditoría.',
    audit_empty_filtered: 'Prueba a cambiar o eliminar los filtros.',
    audit_empty_description: 'El registro de auditoría está vacío.',
    audit_col_action: 'Acción',
    audit_col_actor: 'Actor',
    audit_col_entity: 'Entidad',
    audit_col_request: 'Petición',
    audit_col_status: 'Estado',
    audit_col_date: 'Fecha',
    audit_pagination_aria: 'Paginación del registro',
    audit_prev: '← Anterior',
    audit_next: 'Siguiente →',
    audit_range: '{from}–{to} de {total}',
    audit_type_all: 'Todos los tipos',
    audit_type_resource: 'Recurso',
    audit_type_need: 'Necesidad',
    audit_type_emergency: 'Emergencia',
    audit_type_offer: 'Oferta',
    audit_type_report: 'Reporte',
    audit_type_volunteer: 'Voluntario',
    audit_type_organization: 'Organización',
    audit_type_accreditation: 'Acreditación',
    audit_type_template: 'Plantilla',
    audit_filters_group_aria: 'Filtros del registro de auditoría',
    audit_entity_type_label: 'Tipo de entidad',
    audit_entity_type_aria: 'Filtrar por tipo de entidad',
    audit_emergency_id_label: 'ID de emergencia',
    audit_emergency_id_ph: 'UUID de emergencia…',
    audit_emergency_id_aria: 'Filtrar por ID de emergencia',
    audit_card_actor: 'Actor:',
    audit_card_entity: 'Entidad:',
  },

  templates: {
    // Page chrome
    meta_title: 'Plantillas de emergencia — Admin · ResponseGrid',
    meta_description: 'Gestión de plantillas de emergencia.',
    title: 'Plantillas de emergencia',
    subtitle: 'Crea plantillas reutilizables para nuevas emergencias. Solo administradores.',
    list_heading: 'Plantillas disponibles ({count})',
    empty_title: 'No hay plantillas todavía.',
    empty_description: 'Usa el formulario de abajo para crear la primera plantilla.',
    new_heading: 'Nueva plantilla',
    create_from_heading: 'Crear emergencia desde plantilla',
    inheritance_note: 'La nueva emergencia heredará la lista «qué no llevar» y el comunicado por defecto de la plantilla.',
    // Create-template form
    f_name_label: 'Nombre de la plantilla',
    f_name_ph: 'Ej: Terremoto básico',
    f_description_label: 'Descripción',
    f_description_ph: 'Describe cuándo usar esta plantilla',
    f_dont_bring_label: 'Qué NO llevar (una línea por ítem)',
    f_dont_bring_ph: 'Ropa usada sin clasificar\nMedicamentos sin validación\nAlimentos caseros',
    f_announcement_label: 'Comunicado por defecto (opcional)',
    f_announcement_ph: 'Texto que aparecerá como comunicado inicial de la emergencia',
    f_submit: 'Crear plantilla',
    f_submitting: 'Creando…',
    // Create-from-template form
    cf_success: 'Emergencia creada. Redirigiendo…',
    cf_template_label: 'Plantilla',
    cf_template_ph: 'Selecciona una plantilla',
    cf_name_label: 'Nombre de la emergencia',
    cf_name_ph: 'Ej: Terremoto Valencia 2026',
    cf_slug_label: 'Slug (URL)',
    cf_slug_ph: 'Ej: terremoto-valencia-2026',
    cf_slug_title: 'Solo letras minúsculas, números y guiones',
    cf_country_label: 'Código de país (ISO 3166-1 alpha-2)',
    cf_country_ph: 'Ej: ES',
    cf_submit: 'Crear emergencia desde plantilla',
    cf_submitting: 'Creando emergencia…',
    cf_no_templates: 'Crea al menos una plantilla antes de usarla aquí.',
    // Delete button
    delete: 'Eliminar',
    deleting: 'Eliminando…',
    // Server-action results
    err_name_required: 'El nombre es obligatorio.',
    err_description_required: 'La descripción es obligatoria.',
    err_dont_bring_empty: 'La lista "qué no llevar" debe tener al menos un ítem.',
    err_no_permission_create: 'No tienes permisos para crear plantillas.',
    err_invalid_data: 'Datos inválidos. Revisa los campos.',
    err_create_failed: 'Error al crear la plantilla. Inténtalo de nuevo.',
    ok_created: 'Plantilla creada correctamente.',
    err_no_permission_delete: 'No tienes permisos para eliminar esta plantilla.',
    err_not_found: 'Plantilla no encontrada.',
    err_delete_failed: 'Error al eliminar la plantilla. Inténtalo de nuevo.',
    err_template_required: 'Debes seleccionar una plantilla.',
    err_emergency_name_required: 'El nombre de la emergencia es obligatorio.',
    err_slug_required: 'El slug es obligatorio.',
    err_country_required: 'El código de país es obligatorio.',
    err_no_permission_create_emergency: 'No tienes permisos para crear emergencias.',
    err_invalid_slug_country: 'Datos inválidos. Verifica el slug y el código de país.',
    err_create_emergency_failed: 'Error al crear la emergencia. Inténtalo de nuevo.',
  },

  coord: {
    meta_not_found: 'Emergencia no encontrada · ResponseGrid',
    dashboard_meta_title: 'Coordinación — {name} · ResponseGrid',
    dashboard_meta_description: 'Panel de coordinación de {name}.',
    reports_meta_title: 'Reportes de campo — {name} · ResponseGrid',
    reports_meta_description: 'Cola de partes de campo de {name}.',
    volunteers_meta_title: 'Voluntarios y tareas — {name} · ResponseGrid',
    volunteers_meta_description: 'Gestión de voluntarios y tareas de coordinación de {name}.',

    dashboard_title: 'Panel de coordinación',
    logout: 'Salir',
    link_volunteers: 'Voluntarios y tareas',
    link_reports: 'Reportes de campo',
    back_coordination: 'Coordinación',

    resources_heading: 'Recursos pendientes',
    resources_empty_title: 'No hay recursos pendientes de revisión.',
    resources_empty_description: 'Cuando alguien registre un recurso aparecerá aquí.',
    resources_list_label: 'Cola de recursos',

    needs_heading: 'Peticiones pendientes',
    needs_empty_title: 'No hay peticiones pendientes de validación.',
    needs_empty_description: 'Las peticiones ciudadanas aparecerán aquí cuando lleguen.',
    needs_list_label: 'Cola de peticiones',

    offers_heading: 'Ofertas de material',
    offers_empty_title: 'No hay ofertas de material pendientes.',
    offers_empty_description: 'Las ofertas de donantes aparecerán aquí para que puedas asignarlas a necesidades validadas.',
    offers_list_label: 'Cola de ofertas de material',

    expired_heading: 'Peticiones caducadas',
    expired_empty_title: 'No hay peticiones caducadas.',
    expired_empty_description: 'Las peticiones cuya fecha de validez haya vencido aparecerán aquí para que puedas renovarlas.',
    expired_list_label: 'Peticiones caducadas',

    reports_title: 'Reportes de campo',
    reports_filter_heading: 'Filtrar',
    reports_filter_all: 'Todos',
    reports_filter_clear: 'Limpiar filtros',
    reports_received_heading: 'Partes recibidos',
    reports_empty_title: 'No hay partes con los filtros seleccionados.',
    reports_empty_description: 'Ajusta los filtros o espera a que los voluntarios envíen partes de campo.',
    reports_list_label: 'Lista de partes de campo',
    reports_status_open: 'Abiertos',
    reports_status_reviewed: 'Revisados',
    reports_status_closed: 'Cerrados',

    volunteers_title: 'Voluntarios y tareas',
    roster_heading: 'Roster de voluntarios',
    roster_empty_title: 'No hay voluntarios con los filtros seleccionados.',
    roster_empty_description: 'Ajusta los filtros o espera a que se registren voluntarios en esta emergencia.',
    roster_list_label: 'Lista de voluntarios',
    tasks_heading: 'Tareas',
    tasks_empty_title: 'Todavía no hay tareas.',
    tasks_empty_description: 'Crea la primera tarea con el formulario de arriba.',
    tasks_list_label: 'Lista de tareas',

    processing: 'Procesando…',
    cancelling: 'Cancelando…',
    saving: 'Guardando…',
    save: 'Guardar',
    error_unknown: 'Error desconocido',
    optional: '(opcional)',
    priority_label: 'Prioridad',
    expired_at_label: 'Caducó',

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

    priority_low: 'Baja',
    priority_medium: 'Media',
    priority_high: 'Alta',
    priority_urgent: 'Urgente',

    skill_driving: 'Conducción',
    skill_medical: 'Sanitario',
    skill_logistics: 'Logística',
    skill_cooking: 'Cocina',
    skill_languages: 'Idiomas',
    skill_admin: 'Administración',
    skill_general: 'General',

    availability_immediate: 'Inmediata',
    availability_this_week: 'Esta semana',
    availability_flexible: 'Flexible',

    vehicle_none: 'Sin vehículo',
    vehicle_car: 'Coche',
    vehicle_van: 'Furgoneta',
    vehicle_truck: 'Camión',

    need_card_label: 'Petición: {title}',
    need_validate: 'Validar',

    expired_card_label: 'Petición caducada: {title}',
    expired_renew: 'Renovar',
    expired_renewing: 'Renovando…',

    resource_card_label: 'Recurso: {name}',
    resource_verify_publish: 'Verificar y publicar',
    resource_type_collection_point: 'Punto de recogida',
    resource_type_delivery_point: 'Punto de entrega',
    resource_type_collection_and_delivery: 'Recogida y entrega',
    resource_type_warehouse: 'Almacén',
    resource_type_transport: 'Transporte',
    resource_type_supplier: 'Proveedor',
    resource_type_venue: 'Local / Espacio',
    resource_stage_origin: 'Origen',
    resource_stage_intermediate: 'Intermedio',
    resource_stage_destination: 'Destino',

    offer_card_label: 'Oferta: {description}',
    offer_status_open: 'Abierta',
    offer_status_matched: 'Asignada',
    offer_status_fulfilled: 'Entregada',
    offer_status_cancelled: 'Cancelada',
    offer_directed_indicator: 'Oferta dirigida a una necesidad específica',
    offer_select_need_label: 'Seleccionar necesidad para asignar',
    offer_select_need_placeholder: 'Selecciona una necesidad…',
    offer_select_need_error: 'Selecciona una necesidad para asignar.',
    offer_confirm_directed: 'Confirmar asignación a la necesidad dirigida',
    offer_assign: 'Asignar a necesidad',
    offer_cancel: 'Cancelar oferta',
    offer_mark_delivered: 'Marcar como entregada',

    // ── Detalle (drawer) ─────────────────────────────────────────────
    drawer_close: 'Cerrar',
    drawer_open_need: 'Ver detalle de la petición: {title}',
    drawer_open_resource: 'Ver detalle del recurso: {name}',
    drawer_open_offer: 'Ver detalle de la oferta: {description}',
    detail_section_items: 'Artículos solicitados',
    detail_section_location: 'Ubicación',
    detail_section_meta: 'Detalles',
    detail_section_action: 'Acción',
    detail_field_description: 'Descripción',
    detail_field_priority: 'Prioridad',
    detail_field_status: 'Estado',
    detail_field_category: 'Categoría',
    detail_field_quantity: 'Cantidad',
    detail_field_address: 'Dirección',
    detail_field_coords: 'Coordenadas',
    detail_field_requester_org: 'Organización solicitante',
    detail_field_managing_org: 'Organización gestora',
    detail_field_required_skill: 'Habilidad requerida',
    detail_field_requested_count: 'Personas necesarias',
    detail_field_linked_resource: 'Recurso / destinatario vinculado',
    detail_field_created: 'Creada',
    detail_field_expiry: 'Validez',
    detail_field_type: 'Tipo',
    detail_field_stage: 'Etapa',
    detail_field_accepts: 'Acepta',
    detail_field_contact: 'Contacto',
    detail_field_schedule: 'Horario',
    detail_field_manager: 'Responsable',
    detail_field_verification: 'Verificación',
    detail_field_public_status: 'Estado público',
    detail_field_city: 'Ciudad',
    detail_field_country: 'País',
    detail_field_source: 'Fuente',
    detail_field_donor_org: 'Organización donante',
    detail_field_donor_user: 'Donante',
    detail_field_notes: 'Notas',
    detail_field_target_need: 'Necesidad dirigida',
    detail_field_matched_need: 'Necesidad asignada',
    detail_field_recipient_type: 'Tipo de destinatario',
    detail_field_is_final_recipient: 'Destinatario final de la ayuda',
    detail_value_yes: 'Sí',
    detail_value_none: '—',
    detail_item_line: '{name}: {quantity}{unit}',
    detail_status_pending: 'Pendiente',
    detail_status_validated: 'Validada',
    detail_status_rejected: 'Rechazada',
    detail_status_fulfilled: 'Cumplida',
    public_status_hidden: 'Oculto',
    public_status_active: 'Activo',
    public_status_saturated: 'Saturado',
    public_status_paused: 'Pausado',
    public_status_closed: 'Cerrado',
    detail_reject_unavailable:
      'El rechazo de peticiones aún no está disponible.',

    // ── Página de coordinación según permisos ─────────────────────────
    your_role_heading: 'Tu rol en esta emergencia',
    role_emergency_coordinator: 'Coordinador/a',
    role_emergency_verifier: 'Verificador/a',
    role_platform_admin: 'Administrador/a de plataforma',
    role_platform_operator: 'Operador/a de plataforma',
    no_actionable_queues_title: 'No tienes colas asignadas en esta emergencia.',
    no_actionable_queues_description:
      'Tu rol no incluye permisos de validación, verificación o asignación aquí.',
    queue_view_detail: 'Ver detalle',

    // ── Sub-navegación / hub / buscador (#117) ────────────────────────
    tab_overview: 'Resumen',
    tab_resources: 'Recursos',
    tab_needs: 'Peticiones',
    tab_offers: 'Ofertas',
    tab_shipments: 'Expediciones',
    tab_volunteers: 'Voluntarios',
    tab_reports: 'Reportes',
    tabs_aria: 'Secciones de coordinación',

    hub_sections_label: 'Secciones de coordinación',
    hub_count_aria: 'pendientes',
    hub_resources_label: 'Recursos por verificar',
    hub_resources_description: 'Revisa y publica los puntos pendientes.',
    hub_needs_label: 'Peticiones por validar',
    hub_needs_description: 'Valida las peticiones ciudadanas entrantes.',
    hub_offers_label: 'Ofertas de material',
    hub_offers_description: 'Casa ofertas de donantes con necesidades validadas.',
    hub_volunteers_label: 'Voluntarios y tareas',
    hub_volunteers_description: 'Coordina el roster y asigna tareas.',
    hub_reports_label: 'Reportes de campo',
    hub_reports_description: 'Revisa los partes enviados desde el terreno.',
    hub_shipments_label: 'Expediciones',
    hub_shipments_description: 'Planifica y sigue los envíos de material entre puntos.',
    hub_shipments_count_aria: 'en curso',

    search_placeholder: 'Buscar…',
    search_aria: 'Buscar',
    search_clear: 'Limpiar búsqueda',

    pagination_prev: 'Anterior',
    pagination_next: 'Siguiente',
    pagination_summary: 'Página {page} de {pages} · {total} resultados',

    resource_type_filter_label: 'Tipo',
    resource_type_filter_aria: 'Filtrar por tipo de recurso',
    resource_type_filter_all: 'Todos los tipos',

    offers_filter_group_label: 'Filtros de ofertas',
    offers_filter_category_label: 'Categoría',
    offers_filter_category_aria: 'Filtrar por categoría',
    offers_filter_category_all: 'Todas las categorías',
    offers_filter_status_label: 'Estado',
    offers_filter_status_aria: 'Filtrar por estado',
    offers_filter_status_all: 'Todos los estados',

    resources_section_meta_title: 'Recursos — Coordinación de {name} · ResponseGrid',
    resources_section_meta_description: 'Cola de verificación de recursos de {name}.',
    resources_no_match_title: 'Sin recursos para esta búsqueda.',
    resources_no_match_description:
      'Prueba con otros términos o cambia el filtro de tipo.',

    needs_section_meta_title: 'Peticiones — Coordinación de {name} · ResponseGrid',
    needs_section_meta_description: 'Cola de validación de peticiones de {name}.',
    needs_no_match_title: 'Sin peticiones para esta búsqueda.',
    needs_no_match_description: 'Prueba con otros términos o ajusta los filtros.',

    offers_section_meta_title: 'Ofertas — Coordinación de {name} · ResponseGrid',
    offers_section_meta_description: 'Cola de ofertas de material de {name}.',
    offers_no_match_title: 'Sin ofertas para estos filtros.',
    offers_no_match_description:
      'Ajusta la categoría o el estado para ver más ofertas.',

    controls_heading: 'Controles de la emergencia',
    controls_intake_heading: 'Estado de la recogida',
    controls_intake_paused: 'Recogida pausada.',
    controls_intake_resumed: 'Recogida reanudada.',
    controls_pause: '⏸ Pausar recogida',
    controls_resume: '▶ Reanudar recogida',
    controls_unknown_action: 'Acción no reconocida.',
    controls_announcement_heading: 'Comunicado oficial',
    controls_announcement_published: 'Comunicado publicado.',
    controls_announcement_empty: 'El comunicado no puede estar vacío.',
    controls_announcement_label: 'Texto del comunicado oficial',
    controls_announcement_placeholder: 'Escribe aquí el comunicado oficial para los ciudadanos…',
    controls_announcement_publish: 'Publicar comunicado',
    controls_announcement_publishing: 'Publicando…',

    task_form_label: 'Crear nueva tarea',
    task_form_heading: 'Nueva tarea',
    task_created: 'Tarea creada correctamente.',
    task_field_title: 'Título',
    task_title_placeholder: 'Ej. Distribuir agua en zona 3',
    task_field_description: 'Descripción',
    task_description_placeholder: 'Describe la tarea con detalle…',
    task_field_skill: 'Habilidad requerida (opcional)',
    task_skill_none: 'Sin habilidad requerida',
    task_location_legend: 'Ubicación (opcional)',
    task_field_address: 'Dirección',
    task_address_placeholder: 'Calle Mayor 1, Valencia',
    task_field_latitude: 'Latitud',
    task_field_longitude: 'Longitud',
    task_creating: 'Creando tarea…',
    task_create: 'Crear tarea',

    report_card_label: 'Parte: {type}',
    report_type_incident: 'Incidencia',
    report_type_stock: 'Stock',
    report_type_status: 'Estado',
    report_type_other: 'Otro',
    report_status_open: 'Abierto',
    report_status_reviewed: 'Revisado',
    report_status_closed: 'Cerrado',
    report_photos_label: 'Fotos del parte',
    report_photo_view_label: 'Ver foto a tamaño completo',
    report_photo_alt: 'Foto del parte',
    report_point_label: 'Punto',
    report_author_label: 'Autor',
    report_marking: 'Marcando…',
    report_mark_reviewed: 'Marcar revisado',
    report_reviewed: 'Parte revisado.',

    task_card_label: 'Tarea: {title}',
    task_status_open: 'Abierta',
    task_status_in_progress: 'En curso',
    task_status_completed: 'Completada',
    task_status_cancelled: 'Cancelada',
    assignment_status_assigned: 'Asignado',
    assignment_status_checked_in: 'En zona',
    assignment_status_checked_out: 'Completó',
    task_required_skill_label: 'Habilidad requerida',
    task_location_label: 'Ubicación',
    task_assigned_volunteers: 'Voluntarios asignados',
    task_assignments_list_label: 'Asignaciones de voluntarios',
    task_unassign: 'Quitar',
    task_unassign_label: 'Quitar voluntario',
    task_select_volunteer_error: 'Selecciona un voluntario para asignar.',
    task_assign_select_label: 'Seleccionar voluntario para asignar',
    task_assign_placeholder: 'Asignar voluntario…',
    task_assigning: 'Asignando…',
    task_assign: 'Asignar voluntario',
    task_completing: 'Completando…',
    task_complete: 'Completar',
    task_cancel: 'Cancelar',

    volunteer_card_label: 'Voluntario: {name}',
    volunteer_status_available: 'Disponible',
    volunteer_status_assigned: 'Asignado',
    volunteer_status_inactive: 'Inactivo',
    volunteer_skills_label: 'Habilidades',
    volunteer_availability_label: 'Disponibilidad',
    volunteer_vehicle_label: 'Vehículo',
    volunteer_change_status_label: 'Cambiar estado',
    volunteer_invalid_status: 'Estado no válido.',

    roster_filter_group_label: 'Filtros del roster',
    roster_filter_skill_field: 'Habilidad',
    roster_filter_skill_aria: 'Filtrar por habilidad',
    roster_filter_skill_all: 'Todas las habilidades',
    roster_filter_availability_field: 'Disponibilidad',
    roster_filter_availability_aria: 'Filtrar por disponibilidad',
    roster_filter_availability_all: 'Cualquier disponibilidad',
    roster_filter_vehicle_field: 'Vehículo',
    roster_filter_vehicle_aria: 'Filtrar por vehículo',
    roster_filter_vehicle_all: 'Cualquier vehículo',
    roster_filter_status_field: 'Estado',
    roster_filter_status_aria: 'Filtrar por estado',
    roster_filter_status_all: 'Todos los estados',

    suggestion_card_label: 'Voluntario sugerido: {name}',
    suggestion_has_vehicle: 'Con vehículo',
    suggestion_select_label: 'Seleccionar a {name}',
    suggestion_deselect_label: 'Deseleccionar a {name}',
    suggestion_selected: 'Seleccionado',
    suggestion_select: 'Seleccionar',

    personnel_panel_label: 'Panel de personal para: {title}',
    personnel_need_heading: 'Necesidad de personal',
    personnel_people_count_one: '{count} persona',
    personnel_people_count_other: '{count} personas',
    personnel_suggestions_heading: 'Voluntarios disponibles con este perfil',
    personnel_suggestions_empty: 'No hay voluntarios disponibles con la habilidad requerida en este momento.',
    personnel_suggestions_list_label: 'Sugerencias de voluntarios',
    personnel_success_title: 'Tarea creada correctamente',
    personnel_success_body_unassigned: 'La tarea ha sido creada.',
    personnel_success_body_assigned: 'La tarea ha sido creada y los voluntarios seleccionados han sido asignados.',
    personnel_success_hint: 'Puedes verla en el panel de Voluntarios y tareas.',
    personnel_creating: 'Creando tarea…',
    personnel_create_and_assign: 'Crear tarea y asignar ({count})',
    personnel_create_unassigned: 'Crear tarea sin asignar',

    personnel_fields_heading: 'Personal sanitario — detalle',
    personnel_fields_skill_label: 'Habilidad requerida',
    personnel_fields_skill_unspecified: 'Sin especificar',
    personnel_fields_skill_medical: 'Sanitario / Primeros auxilios',
    personnel_fields_skill_general: 'General / Apoyo',
    personnel_fields_specialty_label: 'Especialidad',
    personnel_fields_specialty_placeholder: 'Ej. médico urgencias pediátricas',
    personnel_fields_count_label: 'Personas necesarias',

    // ── Expediciones / Shipment (#106) ────────────────────────────────
    shipments_heading: 'Expediciones',
    shipments_list_label: 'Lista de expediciones',
    shipments_empty_title: 'Todavía no hay expediciones.',
    shipments_empty_description:
      'Crea una expedición para mover material entre puntos de la emergencia.',
    shipments_no_match_title: 'Sin expediciones con este estado.',
    shipments_no_match_description: 'Cambia el filtro de estado para ver más.',
    shipments_section_meta_title:
      'Expediciones — Coordinación de {name} · ResponseGrid',
    shipments_section_meta_description:
      'Planificación y seguimiento de envíos de material de {name}.',

    shipments_filter_group_label: 'Filtros de expediciones',
    shipments_filter_status_label: 'Estado',
    shipments_filter_status_aria: 'Filtrar por estado',
    shipments_filter_status_all: 'Todos los estados',

    ship_route: '{origin} → {destination}',
    ship_drawer_open: 'Ver detalle de la expedición: {route}',
    ship_section_route: 'Ruta',
    ship_section_items: 'Carga',
    ship_section_assignment: 'Asignación',
    ship_field_origin: 'Origen',
    ship_field_destination: 'Destino',
    ship_field_items: 'Artículos',
    ship_field_manifest: 'Manifiesto',
    ship_field_capacity: 'Capacidad asignada',
    ship_field_carrier: 'Transportista',

    ship_status_planned: 'Planificada',
    ship_status_assigned: 'Asignada',
    ship_status_in_transit: 'En tránsito',
    ship_status_delivered: 'Entregada',
    ship_status_failed: 'Fallida',
    ship_status_cancelled: 'Cancelada',

    ship_carrier_volunteer: 'Voluntario',
    ship_carrier_organization: 'Organización',

    ship_mode_road: 'Carretera',
    ship_mode_sea: 'Marítimo',
    ship_mode_air: 'Aéreo',

    // Lifecycle actions
    ship_assign_select_label: 'Seleccionar capacidad para asignar',
    ship_assign_placeholder: 'Selecciona una capacidad…',
    ship_assign_none: 'No hay capacidades disponibles',
    ship_assign_cta: 'Asignar capacidad',
    ship_mark_in_transit: 'Marcar en tránsito',
    ship_confirm_delivery: 'Confirmar entrega',
    ship_cancel: 'Cancelar expedición',

    // Crear expedición
    ship_create_cta: '+ Crear expedición',
    ship_create_title: 'Nueva expedición',
    ship_create_submit: 'Crear expedición',
    ship_creating: 'Creando…',
    ship_select_resource_placeholder: 'Selecciona un punto…',
    ship_items_legend: 'Carga',
    ship_item_description_label: 'Descripción del artículo',
    ship_item_description_placeholder: 'Ej. Cajas de agua',
    ship_item_quantity_label: 'Cantidad',
    ship_item_quantity_placeholder: 'Cantidad',
    ship_item_unit_label: 'Unidad',
    ship_item_unit_placeholder: 'Unidad',
    ship_item_add: '+ Añadir artículo',
    ship_item_remove: 'Quitar',
    ship_manifest_placeholder: 'Notas del manifiesto: carga frágil, instrucciones…',

    // Capacidades disponibles (read-only, #105)
    cap_heading: 'Capacidades disponibles',
    cap_subtitle: 'Transporte ofrecido para esta emergencia. Asígnalo desde una expedición.',
    cap_list_label: 'Lista de capacidades de transporte',
    cap_empty_title: 'No hay capacidades de transporte.',
    cap_empty_description:
      'Cuando alguien ofrezca transporte para esta emergencia aparecerá aquí.',
    cap_field_capacity: 'Capacidad:',
    cap_field_coverage: 'Cobertura:',
    cap_field_window: 'Ventana:',
    cap_status_available: 'Disponible',
    cap_status_reserved: 'Reservada',
    cap_status_withdrawn: 'Retirada',
    cap_filter_group_label: 'Filtros de capacidades',
    cap_filter_mode_label: 'Modo',
    cap_filter_mode_aria: 'Filtrar por modo de transporte',
    cap_filter_mode_all: 'Todos los modos',
    cap_filter_status_label: 'Estado',
    cap_filter_status_aria: 'Filtrar por estado',
    cap_filter_status_all: 'Todos los estados',

    // server-action messages
    err_no_permission_match: 'No tienes permisos para asignar esta oferta.',
    err_offer_not_open: 'La oferta no está en estado abierto.',
    err_not_found_offer_need: 'Oferta o necesidad no encontrada.',
    err_match_failed: 'No se pudo asignar la oferta. Inténtalo de nuevo.',
    err_no_permission_fulfill: 'No tienes permisos para marcar esta oferta como entregada.',
    err_offer_not_assigned: 'La oferta no está en estado asignado.',
    err_fulfill_failed: 'No se pudo marcar la oferta como entregada.',
    err_no_permission_cancel: 'No tienes permisos para cancelar esta oferta.',
    err_offer_cannot_cancel: 'La oferta no puede cancelarse en su estado actual.',
    err_cancel_failed: 'No se pudo cancelar la oferta.',
    err_verify_failed: 'No se pudo verificar el recurso. Inténtalo de nuevo.',
    err_publish_resource_failed: 'Recurso verificado pero no se pudo publicar. Contacta al administrador.',
    err_validate_failed: 'No se pudo validar la petición. Inténtalo de nuevo.',
    err_no_permission_renew: 'No tienes permisos para renovar esta petición.',
    err_request_not_found: 'Petición no encontrada.',
    err_renew_failed: 'No se pudo renovar la petición. Inténtalo de nuevo.',
    err_no_permission_pause: 'No tienes permisos para pausar esta emergencia.',
    err_already_paused: 'La emergencia ya está en pausa.',
    err_pause_failed: 'No se pudo pausar la emergencia. Inténtalo de nuevo.',
    err_no_permission_resume: 'No tienes permisos para reanudar esta emergencia.',
    err_not_paused: 'La emergencia no está en pausa.',
    err_resume_failed: 'No se pudo reanudar la emergencia. Inténtalo de nuevo.',
    err_no_permission_announce: 'No tienes permisos para publicar comunicados en esta emergencia.',
    err_announce_failed: 'No se pudo publicar el comunicado. Inténtalo de nuevo.',
    err_no_permission_create_task: 'No tienes permisos para crear tareas desde esta necesidad.',
    err_need_not_found: 'Necesidad no encontrada.',
    err_create_task_failed: 'No se pudo crear la tarea. Inténtalo de nuevo.',
    vol_err_no_permission_status: 'No tienes permisos para cambiar el estado de este voluntario.',
    vol_err_not_found: 'Voluntario no encontrado.',
    vol_err_update_status_failed: 'No se pudo actualizar el estado. Inténtalo de nuevo.',
    vol_err_title_required: 'El título es obligatorio.',
    vol_err_description_required: 'La descripción es obligatoria.',
    vol_err_no_permission_create: 'No tienes permisos para crear tareas en esta emergencia.',
    vol_err_create_failed: 'No se pudo crear la tarea. Inténtalo de nuevo.',
    vol_err_no_permission_assign: 'No tienes permisos para asignar voluntarios.',
    vol_err_task_or_volunteer_not_found: 'Tarea o voluntario no encontrado.',
    vol_err_already_assigned: 'El voluntario ya está asignado o la tarea no admite más asignaciones.',
    vol_err_assign_failed: 'No se pudo asignar el voluntario. Inténtalo de nuevo.',
    vol_err_no_permission_unassign: 'No tienes permisos para quitar voluntarios.',
    vol_err_task_not_found: 'Tarea no encontrada.',
    vol_err_not_assigned: 'El voluntario no estaba asignado a esta tarea.',
    vol_err_unassign_failed: 'No se pudo quitar el voluntario. Inténtalo de nuevo.',
    vol_err_no_permission_complete: 'No tienes permisos para completar esta tarea.',
    vol_err_already_cancelled: 'La tarea ya está cancelada.',
    vol_err_complete_failed: 'No se pudo completar la tarea. Inténtalo de nuevo.',
    vol_err_no_permission_cancel: 'No tienes permisos para cancelar esta tarea.',
    vol_err_already_completed: 'La tarea ya está completada.',
    vol_err_cancel_failed: 'No se pudo cancelar la tarea. Inténtalo de nuevo.',

    // Expediciones (#106) — server-action messages
    ship_err_endpoints_required: 'Selecciona origen y destino.',
    ship_err_same_endpoint: 'El origen y el destino deben ser distintos.',
    ship_err_items_required: 'Añade al menos un artículo a la carga.',
    ship_err_quantity_invalid: 'Las cantidades deben ser números positivos.',
    ship_err_capacity_required: 'Selecciona una capacidad para asignar.',
    ship_err_no_permission_create: 'No tienes permisos para crear expediciones.',
    ship_err_create_failed: 'No se pudo crear la expedición. Inténtalo de nuevo.',
    ship_err_no_permission_assign: 'No tienes permisos para asignar capacidad.',
    ship_err_no_permission_act: 'No tienes permisos para actualizar esta expedición.',
    ship_err_no_permission_cancel: 'No tienes permisos para cancelar esta expedición.',
    ship_err_not_found: 'Expedición no encontrada.',
    ship_err_not_planned: 'La expedición ya no está en estado planificada.',
    ship_err_not_assigned: 'La expedición no está en estado asignada.',
    ship_err_not_in_transit: 'La expedición no está en tránsito.',
    ship_err_cannot_cancel: 'La expedición no puede cancelarse en su estado actual.',
    ship_err_assign_failed: 'No se pudo asignar la capacidad. Inténtalo de nuevo.',
    ship_err_transit_failed: 'No se pudo marcar en tránsito. Inténtalo de nuevo.',
    ship_err_deliver_failed: 'No se pudo confirmar la entrega. Inténtalo de nuevo.',
    ship_err_cancel_failed: 'No se pudo cancelar la expedición. Inténtalo de nuevo.',
  },

  // Shared leaf-component strings
  ui: {
    freshness_verify: 'Verifica antes de actuar',
    or_continue_with: 'O continúa con',
    continue_with: 'Continuar con {provider}',
    on_behalf_of: '¿En nombre de quién?',
    as_individual: 'A título particular',
    template_dont_bring_items: '{count} ítems «qué no llevar»',
    created: 'Creada',
    search_address: 'Buscar dirección',
    address_placeholder: 'Calle Mayor 1, Madrid…',
    searching: 'Buscando…',
    geocode_results: 'Resultados de geocodificación',
    map_showing: 'Mapa mostrando: {address}',
    photos_optional: 'Fotos (opcional)',
    select_images: 'Seleccionar imágenes',
    uploading: 'Subiendo…',
    attached_photos: 'Fotos adjuntas',
    remove: 'Eliminar',
    remove_photo: 'Eliminar foto {name}',
    photo_upload_error: 'Error al subir la foto.',
    photo_no_url: 'No se recibió URL de la foto.',
    photo_network_error: 'Error de red al subir la foto.',
    map_kind_resource: 'Recurso',
    map_kind_need: 'Petición',
    map_accepts: 'Acepta:',
    map_approx_location: 'Ubicación aproximada',
    map_no_locations: 'Aún no hay ubicaciones en el mapa.',
  },

  nav: {
    panel: 'Panel',
    coordination: 'Coordinación',
    administration: 'Administración',
    account_section: 'Mi cuenta',
    notifications: 'Notificaciones',
    my_groups: 'Mis grupos',
    my_orgs: 'Mis organizaciones',
    my_permissions: 'Mis permisos',
    logout: 'Cerrar sesión',
    admin_chip: 'Admin',
    open_menu: 'Abrir menú',
    close_menu: 'Cerrar menú',
    nav_aria: 'Navegación principal',
    emergency_context: 'Operativo',
    exit_emergency: 'Salir del operativo',
  },

  panel: {
    meta_title: 'Panel — ResponseGrid',
    meta_description: 'Tu panel personal en ResponseGrid.',
    title: 'Tu panel',
    subtitle: 'Todo lo que gestionas, en un sitio.',
    emergencies_heading: 'Mis emergencias',
    emergencies_empty: 'No participas en ninguna emergencia activa.',
    enter_coordination: 'Ir a coordinación',
    groups_heading: 'Mis grupos',
    groups_empty: 'No perteneces a ningún grupo.',
    group_pending: 'Pendiente',
    group_approved: 'Aprobado',
    view_group: 'Ver grupo',
    orgs_heading: 'Mis organizaciones',
    orgs_empty: 'No perteneces a ninguna organización.',
    view_org: 'Ver organización',
    quick_actions_heading: 'Accesos rápidos',
    qa_administration: 'Administración',
    qa_notifications: 'Notificaciones',
    qa_explore: 'Ver emergencias',
  },
};

export type Messages = typeof es;
