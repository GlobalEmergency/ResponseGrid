-- Taxonomy context: categories + category_aliases tables
CREATE TABLE categories (
  slug        text primary key,
  label_es    text not null,
  label_en    text not null,
  parent_slug text references categories(slug),
  vertical    text not null default 'general',
  sort        int  not null default 0
);

CREATE TABLE category_aliases (
  alias_norm    text primary key,
  category_slug text not null references categories(slug)
);
