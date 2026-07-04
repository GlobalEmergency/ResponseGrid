-- #318: GET /resources/mine (panel) filtra WHERE owner_user_id = $1 OR id IN (...)
-- en cada render autenticado del shell; sin este índice el OR fuerza un seq scan
-- de resources. Con él, Postgres resuelve con BitmapOr (owner idx + PK).
CREATE INDEX IF NOT EXISTS resources_owner_user_id_idx ON resources (owner_user_id);
