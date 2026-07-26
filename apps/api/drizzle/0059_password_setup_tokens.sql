-- Tokens de «crea tu contraseña» para perfiles sin contraseña (#204, parte de
-- #168): un donante que pre-registra sin cuenta recibe un enlace de un solo uso
-- y con caducidad para establecer su contraseña. Se guarda SOLO el hash SHA-256
-- del token (nunca el valor en claro), único para que la búsqueda sea una
-- igualdad indexada. Un token se consume marcando used_at; es válido mientras
-- used_at IS NULL AND expires_at > now(). FK en cascada: al borrar el usuario
-- desaparecen sus tokens.
CREATE TABLE IF NOT EXISTS password_setup_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS password_setup_tokens_user_idx
  ON password_setup_tokens (user_id);
