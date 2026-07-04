-- #315: origen de Service Account en el consentimiento registrado por un canal
-- de confianza (bot de Telegram/WhatsApp) en el alta por teléfono. Aditiva y
-- nullable — los flujos web normales (register/onboarding) lo dejan a NULL y
-- siguen anotando ip/user_agent. Sin FK: el consentimiento se conserva aunque
-- la Service Account se elimine (trazabilidad histórica).
ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS service_account_id uuid;
