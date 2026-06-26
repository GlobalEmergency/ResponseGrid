-- Schema snapshot derived from the development database.
-- Applied by the Jest global-setup to a freshly created reliefhub_test database.
-- Update this file whenever the schema changes (run: pnpm --filter api db:dump-schema).

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- drizzle migrations tracking schema
CREATE SCHEMA drizzle;

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq
    OWNED BY drizzle.__drizzle_migrations.id;

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);

-- public tables (order matters for foreign keys — referenced tables first)
CREATE TABLE public.emergencies (
    id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    country text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    password_hash text,
    name text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL
);

CREATE TABLE public.user_identities (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    provider_user_id text NOT NULL
);

CREATE TABLE public.memberships (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    emergency_id uuid NOT NULL,
    role text NOT NULL
);

CREATE TABLE public.organizations (
    id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    tax_id text,
    contact_email text,
    verification_level text DEFAULT 'unverified'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.organization_members (
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL
);

CREATE TABLE public.resources (
    id uuid NOT NULL,
    emergency_id uuid NOT NULL,
    type text NOT NULL,
    stage text NOT NULL,
    name text NOT NULL,
    verification_level text NOT NULL,
    public_status text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    description text,
    address text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    owner_user_id uuid NOT NULL,
    owner_organization_id uuid
);

CREATE TABLE public.needs (
    id uuid NOT NULL,
    emergency_id uuid NOT NULL,
    title text NOT NULL,
    priority text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    description text,
    address text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    requester_user_id uuid NOT NULL,
    requester_organization_id uuid,
    managing_organization_id uuid
);

CREATE TABLE public.need_items (
    id uuid NOT NULL,
    need_id uuid NOT NULL,
    name text NOT NULL,
    quantity integer NOT NULL,
    unit text,
    category text NOT NULL
);

-- primary keys and unique constraints
ALTER TABLE ONLY public.emergencies
    ADD CONSTRAINT emergencies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.emergencies
    ADD CONSTRAINT emergencies_slug_unique UNIQUE (slug);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);

ALTER TABLE ONLY public.user_identities
    ADD CONSTRAINT user_identities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_identities
    ADD CONSTRAINT user_identities_provider_provider_user_id_unique UNIQUE (provider, provider_user_id);

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_emergency_role_unique UNIQUE (user_id, emergency_id, role);

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT org_members_org_user_unique UNIQUE (organization_id, user_id);

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.needs
    ADD CONSTRAINT needs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.need_items
    ADD CONSTRAINT need_items_pkey PRIMARY KEY (id);

-- foreign key constraints
ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_identities
    ADD CONSTRAINT user_identities_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_organizations_id_fk
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.need_items
    ADD CONSTRAINT need_items_need_id_needs_id_fk
    FOREIGN KEY (need_id) REFERENCES public.needs(id) ON DELETE CASCADE;
