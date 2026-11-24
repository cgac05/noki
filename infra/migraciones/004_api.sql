CREATE TABLE comando_idempotente (
  clave uuid PRIMARY KEY,
  huella text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('EN_CURSO', 'COMPLETADA')),
  codigo_http integer,
  respuesta jsonb,
  creado_en timestamptz NOT NULL,
  CHECK (
    (estado = 'EN_CURSO' AND codigo_http IS NULL AND respuesta IS NULL)
    OR (estado = 'COMPLETADA' AND codigo_http IS NOT NULL
        AND codigo_http BETWEEN 200 AND 599 AND respuesta IS NOT NULL)
  )
);

CREATE TABLE conversacion_wa (
  contacto_id uuid PRIMARY KEY REFERENCES contacto_canal(id),
  estado jsonb NOT NULL,
  actualizado_en timestamptz NOT NULL
);

CREATE TABLE mensaje_bandeja (
  id uuid PRIMARY KEY,
  canal text NOT NULL CHECK (canal IN ('sms', 'email')),
  asunto text NOT NULL,
  cuerpo text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE token_emitido (
  jti uuid PRIMARY KEY,
  tramite_id uuid NOT NULL REFERENCES tramite(id),
  uso text NOT NULL CHECK (uso IN ('CONTINUIDAD', 'LLEGADA', 'CONTEXTO')),
  expira_en timestamptz NOT NULL
);
