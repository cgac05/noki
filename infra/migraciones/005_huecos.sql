CREATE TABLE interes_adelanto (
  id uuid PRIMARY KEY,
  tramite_id uuid NOT NULL UNIQUE REFERENCES tramite(id),
  paciente_id uuid NOT NULL REFERENCES paciente(id),
  servicio_id uuid NOT NULL REFERENCES servicio(id),
  sedes_aceptadas uuid[] NOT NULL,
  ventana tstzrange NOT NULL,
  estado text NOT NULL CHECK (estado IN ('ACTIVO','CUMPLIDO','CANCELADO','VENCIDO')),
  registrado_en timestamptz NOT NULL
);

CREATE TABLE hueco (
  id uuid PRIMARY KEY,
  origen_reserva_id uuid NOT NULL UNIQUE REFERENCES reserva(id),
  servicio_id uuid NOT NULL REFERENCES servicio(id),
  estado text NOT NULL CHECK (estado IN ('DETECTADO','OFRECIDO','ASIGNADO','DESIERTO')),
  estrategia text NOT NULL CHECK (estrategia IN ('SECUENCIAL','OLEADA')),
  creado_en timestamptz NOT NULL,
  version integer NOT NULL CHECK (version > 0)
);

CREATE TABLE oferta_hueco (
  id uuid PRIMARY KEY,
  hueco_id uuid NOT NULL REFERENCES hueco(id),
  interes_id uuid NOT NULL REFERENCES interes_adelanto(id),
  estado text NOT NULL CHECK (estado IN ('OFRECIDA','ACEPTADA','RECHAZADA','EXPIRADA','PERDIDA')),
  enviada_en timestamptz NOT NULL,
  expira_en timestamptz NOT NULL,
  token_jti uuid NOT NULL UNIQUE,
  contacto_id uuid NOT NULL REFERENCES contacto_canal(id),
  UNIQUE (hueco_id, interes_id)
);
CREATE UNIQUE INDEX hueco_ganador_unico ON oferta_hueco(hueco_id) WHERE estado = 'ACEPTADA';
CREATE INDEX oferta_hueco_por_interes ON oferta_hueco(interes_id, enviada_en);
CREATE INDEX hueco_por_creacion ON hueco(creado_en DESC, id DESC);
