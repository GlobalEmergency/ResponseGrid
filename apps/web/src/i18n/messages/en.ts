/**
 * English translations.
 * Must match the shape of `es` (enforced via `satisfies Messages`).
 */
import type { Messages } from './es';

export const en = {
  common: {
    reliefhub: 'ReliefHub',
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
  },

  home: {
    title: 'ReliefHub',
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
    meta_title: 'ReliefHub — Active emergencies',
    meta_description:
      'Emergency aid coordination platform. Check active emergencies and how you can help.',
  },

  emergency: {
    back_all: '← All emergencies',
    official_source: 'Official source · ReliefHub',
    status_active: 'Active emergency',
    status_active_aria: 'Status: active emergency',

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
    meta_title: 'Sign in — ReliefHub',
    meta_description: 'Sign in to ReliefHub.',
  },

  signup: {
    title: 'Create account',
    subtitle: 'Join ReliefHub to coordinate emergency resources.',
    name_label: 'Full name',
    email_label: 'Email address',
    password_label: 'Password',
    password_hint: '(min. 8 characters)',
    submit: 'Create account',
    submitting: 'Creating account…',
    already_account: 'Already have an account?',
    login_link: 'Sign in',
    error_fallback: 'Error creating account',
    meta_title: 'Create account — ReliefHub',
    meta_description: 'Sign up to ReliefHub to coordinate emergencies.',
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
    meta_title: 'Offer a resource — {emergencyName} · ReliefHub',
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
    meta_title: 'Submit a request — {emergencyName} · ReliefHub',
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
    meta_title: 'Donate supplies — {emergencyName} · ReliefHub',
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
    meta_title: 'Sign up as a volunteer — {emergencyName} · ReliefHub',
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
    meta_title: 'Submit report — {emergencyName} · ReliefHub',
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
} as Messages;
