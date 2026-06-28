/**
 * English translations.
 * Must match the shape of `es` (enforced via `satisfies Messages`).
 */
import type { Messages } from './es';

export const en = {
  common: {
    reliefhub: 'ResponseGrid',
    loading: 'Loading…',
    back: '←',
    optional: '(optional)',
    required: '*',
    sending: 'Sending…',
    submit: 'Submit',
    saving: 'Saving…',
    back_to_emergency: 'Back to emergency',
    language: 'Language',
    es: 'ES',
    en: 'EN',

    // Global Emergency global footer (shared by every page)
    footer: {
      project_of: 'A project by',
      org: 'Global Emergency',
      tagline:
        'Open-source platform for coordinating emergency aid. Official, verified information, in real time.',
      nav_heading: 'Navigation',
      nav_home: 'Home',
      nav_emergencies: 'Active emergencies',
      nav_orgs: 'Organisations',
      nav_coordination: 'Coordination access',
      resources_heading: 'Resources',
      resources_about: 'About us',
      resources_how: 'How it works',
      resources_transparency: 'Transparency',
      resources_verify: 'Verify a campaign',
      resources_developers: 'Developer API',
      legal_heading: 'Legal',
      privacy: 'Privacy',
      terms: 'Terms & conditions',
      copyright: '© {year} Global Emergency · Open source (MIT)',
      built_by: 'Built by volunteers',
      aria_label: 'Footer',
    },
  },

  home: {
    title: 'ResponseGrid',
    subtitle: 'Emergency resource coordination.',
    active_emergencies: 'Active emergencies',
    no_emergencies_title: 'No active emergencies at the moment.',
    no_emergencies_description: 'When an emergency is activated it will appear here.',
    emergency_status_active: 'Active',
    my_orgs: 'My organizations',
    notifications: 'Notifications',
    notifications_with_count: 'Notifications ({count})',
    coordination_access: 'Coordination access',
    admin: 'Admin',
    templates: 'Templates',
    audit: 'Audit',
    aria_emergency_list: 'List of active emergencies',
    aria_secondary_nav: 'Secondary navigation',
    enter_operation: 'Enter the operation',
    active_count: '{count} ongoing',
    closed_label: 'Closed · report available',

    // Hero
    hero_h1: 'Coordinate emergency aid without overloading logistics',
    hero_subtitle:
      'ResponseGrid connects citizens, organisations and coordinators during a disaster: it publishes verified points, validates real needs and matches supply offers with those who request them. Official information, in real time.',
    hero_cta_emergencies: 'View active emergencies',
    hero_cta_donate: 'Donate',

    // How it works
    how_it_works_heading: 'How it works',
    step1_title: 'You register what you offer',
    step1_body: 'We capture your offer instantly. Nothing is published until it is validated.',
    step2_title: 'Coordination verifies',
    step2_body: 'Local coordinators validate every point, campaign and need.',
    step3_title: 'It becomes useful aid',
    step3_body: 'Your signals turn into decisions, without pointless trips.',

    // Trust is the product
    trust_heading: 'Trust is the product',
    trust_intro: 'Every resource and campaign shows its verification level.',
    trust_unverified: 'In queue · do not bring supplies',
    trust_verified: 'Validated by local coordination',
    trust_official: 'Accredited organisation',

    // Account access (home secondary bar)
    account_heading: 'Your account',

    meta_title: 'ResponseGrid — Active emergencies',
    meta_description:
      'Emergency aid coordination platform. Check active emergencies and how you can help.',
  },

  emergency: {
    back_all: '← All emergencies',
    official_source: 'Official source · ResponseGrid',
    status_active: 'Active emergency',
    status_active_aria: 'Status: active emergency',

    // Banda oficial — header
    header_overline: 'Emergency operation',
    header_status_active: 'Active operation',
    header_status_paused: 'Paused',
    header_status_closed: 'Closed',

    // Metric tiles
    metric_tile_open: 'Open needs',
    metric_tile_points: 'Active points',
    metric_tile_covered: 'Covered',
    metric_tile_queue: 'In queue',

    // Most effective now
    effective_overline: 'Most effective right now',
    effective_title: 'Donate money to verified organisations',
    effective_cta: 'View verified campaigns',

    // "How do you want to help?" subtitles
    help_offer_subtitle: 'Warehouse · transport · space',
    help_volunteer_subtitle: 'Availability and skills',
    help_petition_subtitle: 'Request validated supplies',
    help_report_title: 'Report damage or trapped people',

    // Family search
    family_title: 'Search for a relative',
    family_subtitle: 'Private data · authorised personnel only',

    // What NOT to do
    dont_do_heading: 'What NOT to do right now',
    dont_do_intro: 'Avoid overloading logistics and on-site risks.',

    // Points / footer
    points_count: '{count} verified',
    footer_verify: '🛡 Is this campaign trustworthy? Verify it',

    metrics_heading: 'Summary',
    metric_needs_open: 'Open requests',
    metric_needs_closed: 'Closed requests',
    metric_resources_active: 'Active logistics points',
    metric_resources_pending: 'Pending validation',

    dont_bring_heading: "What NOT to bring right now",
    dont_bring_intro:
      'Sending uncoordinated supplies overloads the logistics chain and may block professional aid from getting through.',
    dont_bring_items: [
      'Used clothing that is not sorted or packaged.',
      'Medications — these must go through the authorised health channel.',
      'Bottled water for international shipping.',
      'Home-cooked food or items close to their expiry date.',
      'Supplies with no assigned destination or receiving point.',
      'Do not go to the affected area on your own.',
    ],

    actions_heading: 'How do you want to help?',
    action_offer_resource: 'Offer a resource',
    action_submit_petition: 'Submit a request',
    action_donate: 'Donate supplies',
    action_volunteer: 'Sign up as a volunteer',
    action_report_damage: '🏚 Report structural damage',
    actions_paused:
      'Resource and request registration is paused. Check the available information and come back later.',

    points_heading: 'Active points',
    points_empty_title: 'No active points yet.',
    points_empty_description:
      'Once logistics points are verified they will appear here. In the meantime you can offer a resource or check the validated needs.',
    points_aria_label: 'Verified active points',

    needs_heading: 'Validated needs',
    needs_empty_title: 'No published needs yet.',
    needs_priority_label: 'Priority:',
    needs_offer_button: 'Offer for this need',
    needs_aria_label: 'Validated needs',

    map_heading: 'Emergency map',
    map_legend_active: 'Operational',
    map_legend_saturated: 'Saturated',
    map_legend_paused: 'Paused',
    map_legend_need: 'Request',
    map_legend_damage_collapsed: 'Collapsed',
    map_legend_damage_severe: 'Severe damage',
    map_legend_damage_moderate: 'Moderate damage',
    map_damage_toggle_show: 'Show damage',
    map_damage_toggle_hide: 'Hide damage',
    map_user_location_notice: 'Your location is not published or shared.',

    // Privacy (F09)
    privacy_approximate_location: 'Approximate coordinates — verify the address by phone before travelling.',

    footer_my_points: 'My points',
    footer_my_volunteer: 'My volunteering',
    footer_my_search: 'My search',
    footer_report: 'Report',
    footer_coordination: 'Coordination access',

    category_hygiene: 'Hygiene',
    category_water: 'Water',
    category_food: 'Food',
    category_medical: 'Medical',
    category_shelter: 'Shelter',
    category_tools: 'Tools',
    category_other: 'Other',
    category_medicines: '💊 Medicines',
    category_medical_equipment: '🩺 Medical equipment',
    category_medical_supplies: '📦 Medical supplies',
    category_medical_personnel: '🧑‍⚕️ Medical personnel',

    priority_low: 'Low',
    priority_medium: 'Medium',
    priority_high: 'High',
    priority_urgent: 'Urgent',
  },

  status_banner: {
    paused_title: '⏸ Collection paused — information only',
    paused_body:
      'New resource and request registrations are not accepted right now. Check the available information and come back later.',
    closed_title: '🔒 Emergency closed',
    closed_body: 'This emergency has concluded. Resources and requests are no longer accepted.',
  },

  announcement: {
    official_label: 'Official announcement',
    last_updated: 'Last updated:',
    aria_label: 'Official announcement',
    source: 'Global Emergency',
  },

  login: {
    title: 'Sign in',
    subtitle: 'Sign in to your account to continue.',
    demo_label: 'Demo credentials',
    demo_email_label: 'Email:',
    demo_email: 'coord@reliefhub.org',
    demo_password_label: 'Password:',
    demo_password: 'coord1234',
    email_label: 'Email address',
    password_label: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    no_account: "Don't have an account?",
    create_account: 'Create account',
    error_fallback: 'Login error',
    meta_title: 'Sign in — ResponseGrid',
    meta_description: 'Sign in to ResponseGrid.',
  },

  signup: {
    title: 'Create account',
    subtitle: 'Join ResponseGrid to coordinate emergency resources.',
    name_label: 'Full name',
    email_label: 'Email address',
    password_label: 'Password',
    password_hint: '(min. 8 characters)',
    submit: 'Create account',
    submitting: 'Creating account…',
    already_account: 'Already have an account?',
    login_link: 'Sign in',
    error_fallback: 'Error creating account',
    meta_title: 'Create account — ResponseGrid',
    meta_description: 'Sign up to ResponseGrid to coordinate emergencies.',
  },

  needs_filter: {
    aria_label: 'Request filters',
    category_label: 'Category',
    priority_label: 'Priority',
    all_categories: 'All categories',
    all_priorities: 'All priorities',
    aria_filter_category: 'Filter by category',
    aria_filter_priority: 'Filter by priority',
  },

  resource_card: {
    type_collection_point: 'Collection point',
    type_delivery_point: 'Delivery point',
    type_collection_and_delivery: 'Collection and delivery',
    type_warehouse: 'Warehouse',
    type_transport: 'Transport',
    type_supplier: 'Supplier',
    type_venue: 'Venue / Space',
    stage_origin: 'Origin',
    stage_intermediate: 'Intermediate',
    stage_destination: 'Destination',
    // Rich card extras
    accepts_label: 'Accepts',
    meta_contact: 'Contact:',
    meta_schedule: 'Hours:',
    meta_manager: 'Manager:',
    meta_source: 'Source:',
    // aria-label for the card article element
    aria_label: 'Active point: {name}',
  },

  resource_list: {
    aria_label: 'Verified active points',
    showing: 'Showing {shown} of {total}',
    search_results: '{n} results',
    load_more: 'Load more',
    loading: 'Loading…',
    load_more_error: 'Could not load more. Retry',
  },

  // ── ResourceFilterBar ─────────────────────────────────────────────────────
  resource_filter: {
    aria_label: 'Active points filters',
    category_label: 'Category',
    country_label: 'Country',
    search_label: 'Search',
    search_placeholder: 'Search by name, city…',
    all_categories: 'All',
    all_countries: 'All',
    active_filters_label: 'Active filters',
    remove_filter: 'Remove filter {label}',
    group_venezuela: 'Venezuela',
    group_diaspora: 'Diaspora',
    group_other: 'Other',
  },

  // ── Nearby points ─────────────────────────────────────────────────────────
  nearby_points: {
    button_find: 'Find points near me',
    button_clear: 'Back to list',
    loading: 'Looking for nearby points…',
    geo_error: 'Could not get your location. Check your browser permissions.',
    geo_error_dismiss: 'Dismiss',
    showing_nearby: '{n} nearby points',
    privacy_note: 'Your location is only used in your browser to sort by proximity; it is never stored.',
  },

  verification_badge: {
    official: 'Official',
    verified: 'Verified',
    unverified: 'Unverified',
    aria_prefix: 'Trust level:',
  },

  status_light: {
    active: 'Operational',
    saturated: 'Saturated',
    paused: 'Paused',
    closed: 'Closed',
    hidden: 'Hidden',
    aria_prefix: 'Operational status:',
  },

  draft_restored: 'Draft restored',

  registrar: {
    page_title: 'Offer a resource',
    page_subtitle: '{emergencyName} · Fill in the form. We will validate you before activating.',
    meta_title: 'Offer a resource — {emergencyName} · ResponseGrid',
    meta_description: 'Register as an available resource for {emergencyName}.',

    type_label: 'Resource type',
    stage_label: 'Stage',
    name_label: 'Name',
    name_placeholder: 'e.g. Red Cross Madrid',
    description_label: 'Description',
    description_placeholder: 'Additional information about the resource…',
    location_label: 'Location',

    type_collection_point: 'Collection point',
    type_delivery_point: 'Delivery point',
    type_collection_and_delivery: 'Collection and delivery',
    type_warehouse: 'Warehouse',
    type_transport: 'Transport',
    type_supplier: 'Supplier',
    type_venue: 'Venue / Space',

    stage_origin: 'Origin',
    stage_intermediate: 'Intermediate',
    stage_destination: 'Destination',

    select_type_placeholder: 'Select a type…',
    select_stage_placeholder: 'Select a stage…',

    submit: 'Register resource',
    submitting: 'Sending…',
    success_message:
      'Thank you, you are registered. Do not receive materials or publish anything until we validate you.',
    success_register_another: 'Register another resource',
    error_fallback: 'Error registering resource',
  },

  peticion: {
    page_title: 'Submit a request',
    page_subtitle: '{emergencyName} · Describe the need so the coordination team can validate it.',
    meta_title: 'Submit a request — {emergencyName} · ResponseGrid',
    meta_description: 'Register an aid need for {emergencyName}.',

    title_label: 'Title',
    title_placeholder: 'e.g. Thermal blankets for families',
    description_label: 'Description',
    description_placeholder:
      'Detail the need so coordination can evaluate it…',
    priority_label: 'Priority',
    location_label: 'Location',

    priority_low: 'Low',
    priority_medium: 'Medium',
    priority_high: 'High',
    priority_urgent: 'Urgent',

    select_priority_placeholder: 'Select a priority…',

    submit: 'Submit request',
    submitting: 'Sending…',
    success_message:
      'Thank you, your request has been registered and will be reviewed by the coordination team.',
    success_send_another: 'Submit another request',
    error_fallback: 'Error submitting request',

    items_heading: 'Items',
    items_add: '+ Add item',
    item_number: 'Item {n}',
    item_remove: 'Remove item {n}',
    item_remove_label: 'Remove',
    item_name_label: 'Name',
    item_name_placeholder: 'e.g. Thermal blankets',
    item_quantity_label: 'Quantity',
    item_unit_label: 'Unit',
    item_unit_opt: '(opt.)',
    item_unit_placeholder: 'boxes, litres…',
    item_category_label: 'Category',

    category_hygiene: 'Hygiene',
    category_water: 'Water',
    category_food: 'Food',
    category_medical: 'Medical',
    category_shelter: 'Shelter',
    category_tools: 'Tools',
    category_other: 'Other',
    category_medicines: '💊 Medicines',
    category_medical_equipment: '🩺 Medical equipment',
    category_medical_supplies: '📦 Medical supplies',
    category_medical_personnel: '🧑‍⚕️ Medical personnel',
  },

  donar: {
    page_title: 'Donate supplies',
    page_subtitle: '{emergencyName} · Describe the supplies you can provide.',
    meta_title: 'Donate supplies — {emergencyName} · ResponseGrid',
    meta_description: 'Offer aid supplies for {emergencyName}.',

    directed_offer_label: 'Offering for:',
    category_label: 'Supply category',
    description_label: 'Supply description',
    description_placeholder: 'e.g. 25 kg rice bags',
    quantity_label: 'Quantity',
    quantity_placeholder: '50',
    unit_label: 'Unit',
    unit_placeholder: 'e.g. bags, litres, boxes',
    location_label: 'Supply location',
    notes_label: 'Additional notes',
    notes_placeholder: 'e.g. Available Monday to Friday in the morning',

    select_category_placeholder: 'Select a category…',

    category_food: 'Food',
    category_water: 'Water',
    category_hygiene: 'Hygiene',
    category_medical: 'Medical',
    category_shelter: 'Shelter',
    category_tools: 'Tools',
    category_other: 'Other',

    submit: 'Donate supplies',
    submitting: 'Sending…',
    success_message:
      'Thank you! Your offer has been received. The coordination team will review it and contact you if needed.',
    success_donate_again: 'Make another offer',
    error_fallback: 'Error submitting offer',
  },

  voluntario: {
    page_title: 'Sign up as a volunteer',
    page_subtitle: '{emergencyName} · Fill in your details to join the volunteering team.',
    meta_title: 'Sign up as a volunteer — {emergencyName} · ResponseGrid',
    meta_description: 'Register as a volunteer to help with {emergencyName}.',

    already_registered:
      'You are already signed up as a volunteer. You can update your details below.',
    name_label: 'Full name',
    name_placeholder: 'e.g. Ana García',
    contact_label: 'Contact (email or phone)',
    contact_placeholder: 'e.g. ana@example.com or +34 612 345 678',
    municipality_label: 'Municipality',
    municipality_placeholder: 'e.g. Valencia',
    skills_legend: 'Skills',
    availability_label: 'Availability',
    vehicle_label: 'Available vehicle',
    consent_text:
      'I consent to the processing of my personal data for the coordination of this emergency, in accordance with applicable data protection regulations (GDPR). Data will be used exclusively for volunteering management.',

    skill_driving: 'Driving',
    skill_medical: 'Medical / First aid',
    skill_logistics: 'Logistics',
    skill_cooking: 'Cooking',
    skill_languages: 'Languages',
    skill_admin: 'Administration',
    skill_general: 'General / Support',

    availability_immediate: 'Immediate',
    availability_this_week: 'This week',
    availability_flexible: 'Flexible',

    vehicle_none: 'None',
    vehicle_car: 'Car',
    vehicle_van: 'Van',
    vehicle_truck: 'Truck',

    select_availability_placeholder: 'Select your availability…',
    select_vehicle_placeholder: 'Select vehicle type…',

    submit_new: 'Sign up as a volunteer',
    submit_update: 'Update details',
    submitting: 'Saving…',
    success_new:
      'Thank you! You are registered as a volunteer. The coordination team will get in touch with you.',
    success_update: 'Details updated! Your volunteer profile has been saved.',
    view_volunteering: 'View my volunteering',
  },

  reportar: {
    page_title: 'Submit field report',
    meta_title: 'Submit report — {emergencyName} · ResponseGrid',
    meta_description: 'Submit a field report for {emergencyName}.',

    type_label: 'Type',
    priority_label: 'Priority',
    note_label: 'Note',
    note_placeholder: 'Describe the incident, status or stock…',
    related_point_label: 'Related point (optional)',
    general_no_point: 'General (no specific point)',

    type_incident: 'Incident',
    type_stock: 'Stock',
    type_status: 'Status',
    type_other: 'Other',

    priority_low: 'Low',
    priority_medium: 'Medium',
    priority_high: 'High',
    priority_urgent: 'Urgent',

    select_type_placeholder: 'Select a type…',
    select_priority_placeholder: 'Select a priority…',

    submit: 'Submit report',
    submitting: 'Sending…',
    success_message: 'Report submitted successfully. The coordinator will review it shortly.',
    success_send_another: 'Submit another report',
    error_fallback: 'Error submitting report',
  },

  // ── Page: About us (/sobre) ───────────────────────────────────────────────
  about: {
    meta_title: 'About us — ResponseGrid, a project by Global Emergency',
    meta_description:
      'ResponseGrid is Global Emergency’s open-source platform for coordinating emergency aid: verified points, real needs, volunteers and a real-time map.',
    overline: 'About us',
    h1: 'We coordinate aid so it reaches where it’s truly needed',
    lead:
      'ResponseGrid is a free, non-profit platform by Global Emergency. It connects citizens, organisations and coordinators during a disaster so every effort is useful, verified and doesn’t overload logistics.',
    stat_open: 'Open source',
    stat_open_value: 'MIT',
    stat_realtime: 'Real-time information',
    stat_realtime_value: '24/7',
    stat_data: 'Data hosted in the EU',
    stat_data_value: 'GDPR',
    mission_heading: 'Our mission',
    mission_body:
      'For aid to arrive sooner and better. We cut the noise, avoid pointless trips and give coordination a true picture of needs, resources and volunteers on a single map.',
    how_heading: 'How we do it',
    how_body:
      'We publish only points and campaigns verified by local coordination, validate real needs and match supply offers with those who request them. All information is official and in real time.',
    open_heading: 'Open source, built by volunteers',
    open_body:
      'The code is open (MIT licence) and built and maintained by volunteers. Anyone can audit it, improve it or deploy it for their own region.',
    ge_heading: 'Part of Global Emergency',
    ge_body:
      'ResponseGrid is one of Global Emergency’s projects, an initiative that democratises access to professional technology for Civil Protection and emergency services.',
    ge_link: 'Discover Global Emergency',
    cta_heading: 'Want to help now?',
    cta_body: 'Check the active emergencies and find out how you can contribute.',
    cta_button: 'View active emergencies',
  },

  // ── Page: How it works (/como-funciona) ───────────────────────────────────
  how_page: {
    meta_title: 'How it works — ResponseGrid',
    meta_description:
      'How ResponseGrid works: you register what you offer, local coordination verifies it, and it becomes useful aid. Official, real-time information without overloading logistics.',
    overline: 'How it works',
    h1: 'From your offer to useful aid, in three steps',
    lead:
      'ResponseGrid brings order to the chaos of an emergency: it captures signals, validates them and turns them into decisions. Nothing is published until local coordination verifies it.',
    step1_title: 'You register what you offer',
    step1_body:
      'You offer a resource (warehouse, transport, space), sign up as a volunteer or post a need. We capture your signal instantly; nothing is published unvalidated.',
    step2_title: 'Coordination verifies',
    step2_body:
      'Local coordinators validate every point, campaign and need. Accredited organisations earn the official badge. Trust is the product.',
    step3_title: 'It becomes useful aid',
    step3_body:
      'Validated needs are matched with supply offers and volunteers, all on a real-time map. No pointless trips or overloaded supply chains.',
    trust_heading: 'Three levels of trust',
    trust_intro: 'Every resource and campaign always shows its verification level:',
    trust_unverified: 'In queue — do not bring supplies yet.',
    trust_verified: 'Validated by local coordination.',
    trust_official: 'Accredited organisation (official).',
    cta_heading: 'Start contributing',
    cta_body: 'See the active emergencies and choose how to help.',
    cta_button: 'View active emergencies',
  },

  // ── Page: Transparency (/transparencia) ───────────────────────────────────
  transparency: {
    meta_title: 'Transparency — ResponseGrid',
    meta_description:
      'Transparency at ResponseGrid: verification before publishing, data protected in the EU (GDPR), open source under the MIT licence and open governance by volunteers.',
    overline: 'Transparency',
    h1: 'Transparency and trust, by design',
    lead:
      'We work in emergencies, where wrong information costs time and lives. That’s why we openly explain how we verify, how we handle data and how the project is governed.',
    verify_heading: 'We verify before publishing',
    verify_body:
      'No point, campaign or need goes public without local coordination validating it. Organisations get accredited to earn the official badge, and every action is audited.',
    data_heading: 'Your data, protected',
    data_body:
      'Privacy by design: we ask for the minimum data, sensitive locations are published with approximate coordinates, and personal data (such as family-reunification documents) is never exposed. Data hosted in the EU, GDPR-compliant.',
    license_heading: 'Open source (MIT)',
    license_body:
      'All the code is public and under the MIT licence. Anyone can audit it, contribute or deploy it. No black boxes: what you see is what it does.',
    governance_heading: 'Open governance',
    governance_body:
      'ResponseGrid is a Global Emergency project, maintained by volunteers. Decisions and the roadmap are discussed in the open in the public repository.',
    legal_heading: 'Legal documents',
    legal_body: 'See the common policies shared across all Global Emergency projects:',
    cta_heading: 'Review the code',
    cta_body: 'The whole project is public and auditable on GitHub.',
    cta_button: 'View on GitHub',
  },

  // ── Page: Verify a campaign (/verificar) ──────────────────────────────────
  verify_page: {
    meta_title: 'How to verify a campaign — ResponseGrid',
    meta_description:
      'Before donating or bringing supplies, learn how to verify an emergency campaign: trust levels, the official badge and red flags to avoid fraud.',
    overline: 'Verify a campaign',
    h1: 'Is this campaign trustworthy? Learn how to verify it',
    lead:
      'In an emergency, calls for help multiply — and not all are reliable. ResponseGrid marks every campaign and point with its trust level so you know who to trust.',
    levels_heading: 'The trust levels',
    level_unverified_title: 'In queue',
    level_unverified_body: 'Just created, not yet validated. Don’t bring supplies yet: wait until it’s verified.',
    level_verified_title: 'Verified',
    level_verified_body: 'Validated by the emergency’s local coordination. Reliable, up-to-date information.',
    level_official_title: 'Official',
    level_official_body: 'Published by an accredited organisation. The highest level of trust.',
    steps_heading: 'How to check it in 4 steps',
    step1: 'Look at the trust badge on the campaign or point card.',
    step2: 'Check the emergency is active and has an official announcement.',
    step3: 'Before travelling, confirm the address by phone (sensitive locations are approximate).',
    step4: 'Donate money to verified organisations; avoid unsolicited supplies.',
    warning_heading: 'Red flags',
    warning_body:
      'Be wary of unverified campaigns asking for money through private channels, bank details over messaging apps, or shipments to addresses with no assigned receiving point. When in doubt, don’t act and alert coordination.',
    cta_heading: 'Check verified campaigns',
    cta_body: 'Enter an active emergency and filter by verified points and campaigns.',
    cta_button: 'View active emergencies',
  },

  // ── Page: Developer API (/docs) ───────────────────────────────────────────
  docs: {
    meta_title: 'Developer API — ResponseGrid',
    meta_description:
      "ResponseGrid public API docs: read every emergency's verified logistics points and validated needs without login, to build maps and services on top of the source of truth.",
    overline: 'Developer API',
    h1: 'Build on the source of truth',
    lead:
      'The ResponseGrid public API gives you login-free access to the verified logistics points and validated needs of every emergency. It exists so any project —a map, a search tool, a dashboard— can consume official, real-time data instead of duplicating it.',

    toc_heading: 'On this page',
    nav_intro: 'Overview',
    nav_concepts: 'Concepts',
    nav_auth: 'Authentication',
    nav_quickstart: 'Quickstart: a map of points',
    nav_emergencies: 'List emergencies',
    nav_resources: 'Logistics points (read)',
    nav_needs: 'Needs (read)',
    nav_enums: 'States & categories',
    nav_write: 'Contribute data (with a token)',
    nav_practices: 'Best practices',
    nav_license: 'License & attribution',
    nav_links: 'Reference & links',

    // Overview
    intro_heading: 'Overview',
    intro_p1:
      'ResponseGrid coordinates aid during a disaster: it publishes verified logistics points, gathers and validates needs, and keeps it all on a real-time map. This API exposes that same information so you can integrate it into your own product.',
    intro_p2:
      "The goal is to avoid a hundred conflicting maps: you consume the verified data and we are the source of truth. Only what local coordination has validated is published, so what you read is already vetted.",
    base_url_heading: 'Base URL',
    base_url_note:
      'The base URL depends on the deployment; use the production one we give you. The examples on this page use this instance.',
    overview_format_label: 'Format',
    overview_format_value: 'JSON over HTTPS. All responses are UTF-8.',
    overview_read_label: 'Reads',
    overview_read_value: 'Public, no authentication. Every GET in this section is anonymous.',
    overview_write_label: 'Writes',
    overview_write_value: 'Require a JWT (Bearer) token. See “Contribute data”.',
    overview_scope_label: 'Scope',
    overview_scope_value: 'Everything hangs off an emergency, identified by its UUID or slug.',
    overview_license_label: 'Data licence',
    overview_license_value: 'CC BY-SA 4.0 — attribution required + share-alike.',

    // Concepts
    concepts_heading: 'Concepts',
    concepts_intro: 'Four ideas are enough to consume the API with confidence:',
    concept_emergency_t: 'Emergency',
    concept_emergency_b:
      'The container for everything. It has a name, a human-readable slug (e.g. “venezuela”), a country and a status (active / paused / closed). Every point and need belongs to an emergency.',
    concept_resource_t: 'Logistics point',
    concept_resource_b:
      'A physical site: a collection or delivery point, warehouse, transport, supplier or venue. It carries a name, a location (address + coordinates), what it accepts, contact, schedule and an operational status light.',
    concept_need_t: 'Need',
    concept_need_b:
      'What is requested on the ground (water, food, medical supplies, personnel…), with a priority and items. Only needs validated by coordination are exposed publicly.',
    concept_trust_t: 'Trust levels',
    concept_trust_b:
      'Every point carries a level: queued (not trustworthy yet), verified (validated by local coordination) or official (accredited organisation). The public API only returns verified or official points — that is what makes it a source of truth.',

    // Authentication
    auth_heading: 'Authentication',
    auth_intro: 'There are two planes. Tell them apart before integrating.',
    auth_read_t: 'Reads — no token',
    auth_read_b:
      'The read endpoints (emergencies, public points, public needs) need no credentials. If all you want is to display data, you do not need to authenticate.',
    auth_write_t: 'Writes — Bearer token',
    auth_write_b:
      'To create needs, offers or points you need an account. Register or log in and you get an accessToken (JWT) that you send in the Authorization: Bearer <token> header.',

    // Quickstart
    qs_heading: 'Quickstart: a map of points',
    qs_intro:
      'The most common case: plot on a map where aid can be collected or delivered. Three calls and you are done.',
    qs_step1: 'Pick an emergency: list the active ones and keep its id (or resolve the slug).',
    qs_step2: 'Fetch its public points, paginating (up to 100 per page).',
    qs_step3: 'Draw a marker per point and colour it by its status.',
    qs_note:
      'Consume the API from your backend (server to server). Browser requests from another domain are subject to the API’s CORS allowlist; if your app is client-only, proxy through your own server.',

    // List emergencies
    e_heading: 'List emergencies',
    e_intro:
      'Returns the active emergencies. Use it to get the emergencyId the rest of the calls need.',
    e_byslug:
      'If you already know the slug (you see it in the public URL, e.g. /e/venezuela) you can resolve the emergency directly:',
    e_fields:
      'Each emergency includes id, name, slug, country, status, announcement (official notice or null), dontBringList (what NOT to bring) and updatedAt.',

    // Logistics points (read) — star
    r_heading: 'Logistics points (read)',
    r_intro:
      'The main endpoint. Returns, paginated, the published points of an emergency: only the verified or official and visible ones. This is what you would plot on a map.',
    r_params_heading: 'Query parameters',
    r_param_page: 'Page, starting at 1.',
    r_param_limit: 'Items per page. Default 50, maximum 100.',
    r_param_category: 'Filter by a category the point accepts (slug, e.g. water, food).',
    r_param_country: 'Filter by country as stored by the source (e.g. VE or “Venezuela”).',
    r_response_heading: 'Response',
    r_response_intro: 'A paged object: items (the points), total, page and limit.',
    r_fields_heading: 'Public fields of a point',
    r_fields_intro:
      'The public information is minimal but enough to locate and decide: name, where it is, what it accepts and how it is operating.',
    r_facets_heading: 'Facets (to build filters)',
    r_facets_intro:
      'If you need to build filters in your UI, this endpoint gives you the counts by category and by country of the visible points, without having to download them all.',

    // Needs (read)
    n_heading: 'Needs (read)',
    n_intro:
      'Returns the validated needs of an emergency. Useful to show what is required and where. Accepts filters by category (category) and priority (priority).',
    n_privacy:
      'Privacy: some needs expose approximate coordinates (locationSensitivity: "approximate") so as not to reveal a requester’s home. Do not try to de-obfuscate them; treat them as indicative.',
    n_fields:
      'Each need includes id, title, description, location, locationSensitivity, priority, items (with name, quantity, unit and category), status, createdAt, expiresAt and lastVerifiedAt.',

    // States & categories
    enums_heading: 'States & categories',
    enums_intro:
      'Values you will see in responses. Show them to your users instead of inventing your own: that way your app speaks the same language as the rest of the ecosystem.',
    enum_status_heading: 'Operational status (status light)',
    enum_status_intro: 'The publicStatus field of each point:',
    status_active: 'Operational and accepting aid.',
    status_saturated: 'Overwhelmed: better not to bring more supplies right now.',
    status_paused: 'Temporarily paused.',
    status_closed: 'Closed.',
    enum_verification_heading: 'Trust level',
    enum_verification_intro: 'The verificationLevel field (the public API only returns the last two):',
    verification_unverified: 'Queued, not validated (not shown in the public API).',
    verification_verified: 'Validated by local coordination.',
    verification_official: 'Published by an accredited organisation.',
    enum_type_heading: 'Point type',
    enum_type_intro: 'The type field:',
    enum_stage_heading: 'Role in the chain',
    enum_stage_intro: 'The stage field: origin, intermediate or destination.',
    enum_category_heading: 'Categories',
    enum_category_intro: 'Used in accepts (points), in items[].category (needs) and as the category filter.',
    enum_priority_heading: 'Priority',
    enum_priority_intro: 'The priority field of needs: low, medium, high, urgent.',

    // Contribute data
    w_heading: 'Contribute data (with a token)',
    w_intro:
      'Beyond reading, you can feed the platform from your integration: register needs, supply offers (deliveries) or logistics points. These operations require a token (see Authentication).',
    w_moderation_note:
      'Important: what you submit is not published instantly. Needs start as “pending” and points as “unverified”; local coordination validates them before they appear in the public endpoints. That is what keeps the source clean.',
    w_auth_step: 'First, get a token:',
    w_need_t: 'Create a need',
    w_need_b: 'Minimum: title, priority, location and items (at least one). Returns the created id.',
    w_offer_t: 'Offer supplies (a delivery)',
    w_offer_b:
      'A donation, general or directed at a specific need (targetNeedId). Minimum: category, description, quantity and location. If the emergency is not accepting intake (paused/closed) it returns 409.',
    w_resource_t: 'Register a logistics point',
    w_resource_b:
      'Minimum: type, stage, name and location. Optional: accepts, contact, schedule, country, city. It starts unverified until coordination publishes it.',

    // Best practices
    bp_heading: 'Best practices',
    bp_cache_t: 'Cache and poll sensibly',
    bp_cache_b:
      'Do not hammer the API: paginate, cache responses and refresh every few minutes. Use updatedAt, lastVerifiedAt and externalUpdatedAt to know how fresh a datum is.',
    bp_attribution_t: 'Cite the source (required)',
    bp_attribution_b:
      'Not just courtesy: the data licence (CC BY-SA 4.0) requires you to attribute ResponseGrid / Global Emergency and link back. Ready-to-paste text is in “License & attribution”.',
    bp_canonical_t: 'Respect the trust levels',
    bp_canonical_b:
      'Show your users the verificationLevel and publicStatus. An “official and operational” point is not the same as a “verified and saturated” one: that signal is exactly the value we add.',
    bp_privacy_t: 'Protect privacy',
    bp_privacy_b:
      'Treat approximate locations as such and do not cross-reference data to re-identify people. Aid comes before a pretty dataset.',
    bp_cors_t: 'Call from your server',
    bp_cors_b:
      'The public GETs are anonymous, but the API restricts browser CORS to allowed origins. Consume server to server, or proxy through your backend.',

    // License & attribution
    license_heading: 'License & attribution',
    license_intro:
      'The data returned by the API is published under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0). You may use, redistribute and adapt it —including commercially— as long as you meet two conditions. (This is the licence of the data; the project code has its own licence.)',
    license_attribution_t: 'Attribution required',
    license_attribution_b:
      'Credit ResponseGrid / Global Emergency, state the licence and link back to the source. The credit must be visible wherever you show the data.',
    license_sharealike_t: 'Share-alike',
    license_sharealike_b:
      'If you remix, transform or build a database from this data and distribute it, you must release it under this same licence, CC BY-SA 4.0.',
    license_snippet_intro: 'Ready-to-paste attribution:',
    license_full_link: 'Full legal text of the licence',

    // Reference & links
    links_heading: 'Reference & links',
    links_swagger_t: 'Interactive reference (Swagger)',
    links_swagger_b: 'Explore and try every endpoint live.',
    links_openapi_t: 'OpenAPI specification',
    links_openapi_b: 'The OpenAPI JSON, to generate clients or import into your tools.',
    links_client_t: 'Typed TypeScript client',
    links_client_b:
      'The @reliefhub/api-client package (openapi-fetch): types and autocomplete to consume the API from TypeScript.',

    // Tables
    th_field: 'Field',
    th_type: 'Type',
    th_desc: 'Description',
    th_param: 'Parameter',
    th_value: 'Value',

    // Point field descriptions
    f_id: 'Unique identifier of the point.',
    f_name: 'Name of the centre or point.',
    f_type: 'Point type (see “Point type”).',
    f_stage: 'Role in the chain: origin, intermediate or destination.',
    f_description: 'Free-text description. May be null.',
    f_location: 'Address and coordinates (latitude, longitude).',
    f_status: 'Operational status: the status light (active, saturated, paused, closed).',
    f_verification: 'Trust level: verified or official.',
    f_accepts: 'Categories the point accepts (e.g. ["water","food"]).',
    f_contact: 'Phone or contact for the point. May be null.',
    f_schedule: 'Opening hours. May be null.',
    f_manager: 'Person in charge. May be null.',
    f_source: 'Origin of the data when it comes from an external source. May be null.',
    f_freshness: 'Date (ISO 8601) of the last update at the source. May be null.',
    f_country: 'Country as stored by the source (often the full name). May be null.',
    f_city: 'City. May be null.',
    f_owner: 'Organisation that owns the point. May be null.',

    cta_heading: 'Building something with this?',
    cta_body: 'Start from the active emergencies and pull their public points. Cite us as the source and link back.',
    cta_button: 'View active emergencies',

    copy: 'Copy',
    copied: 'Copied',
  },
} as Messages;
