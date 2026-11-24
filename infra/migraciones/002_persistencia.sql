ALTER TABLE tramite
  ADD COLUMN datos jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN canal_origen text CHECK (canal_origen IN ('web','whatsapp','app','callcenter','clinica'));

ALTER TABLE reserva ADD COLUMN folio text;
CREATE UNIQUE INDEX reserva_folio_unico ON reserva (folio) WHERE folio IS NOT NULL;

ALTER TABLE contacto_canal ADD COLUMN hilo_id uuid REFERENCES hilo_atencion(id);
ALTER TABLE vinculo ADD COLUMN nivel integer NOT NULL DEFAULT 1 CHECK (nivel BETWEEN 0 AND 3);

CREATE TABLE intento_verificacion (
  contacto_id uuid PRIMARY KEY REFERENCES contacto_canal(id),
  intentos integer NOT NULL CHECK (intentos >= 0),
  bloqueado_hasta timestamptz
);

ALTER TABLE evento
  ALTER COLUMN idempotency_key TYPE text USING idempotency_key::text,
  ADD CONSTRAINT evento_clave_formato CHECK (
    idempotency_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:[1-9][0-9]*)?$'
  );

ALTER TABLE evento_procesado
  ALTER COLUMN idempotency_key TYPE text USING idempotency_key::text,
  ADD CONSTRAINT evento_procesado_clave_formato CHECK (
    idempotency_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:[1-9][0-9]*)?$'
  );
