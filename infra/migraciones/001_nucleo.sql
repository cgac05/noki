CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE paciente (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  ap_paterno text NOT NULL,
  ap_materno text,
  fecha_nac date NOT NULL,
  sexo text NOT NULL CHECK (sexo IN ('F','M','X')),
  curp text,
  nivel_identidad integer NOT NULL DEFAULT 0 CHECK (nivel_identidad BETWEEN 0 AND 2)
);
CREATE TABLE contacto_canal (
  id uuid PRIMARY KEY,
  canal text NOT NULL CHECK (canal IN ('web','whatsapp','app','callcenter','clinica')),
  valor_externo text NOT NULL,
  primer_contacto timestamptz NOT NULL DEFAULT now(),
  ultimo_contacto timestamptz NOT NULL DEFAULT now(),
  UNIQUE (canal, valor_externo)
);
CREATE TABLE vinculo (
  contacto_id uuid NOT NULL REFERENCES contacto_canal(id),
  paciente_id uuid NOT NULL REFERENCES paciente(id),
  relacion text NOT NULL CHECK (relacion IN ('TITULAR','FAMILIAR','TUTOR')),
  metodo text NOT NULL CHECK (metodo IN ('FLOW_DECLARADO','OTP_EMAIL','OTP_SMS','TOKEN_WEB','TOKEN_CC','FOLIO_FECHA_NAC','INE_CLINICA')),
  verificado_en timestamptz,
  ultimo_uso timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contacto_id, paciente_id)
);
CREATE TABLE credencial (
  id uuid PRIMARY KEY,
  paciente_id uuid NOT NULL REFERENCES paciente(id),
  tipo text NOT NULL CHECK (tipo IN ('PIN')),
  hash text NOT NULL,
  intentos_fallidos integer NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
  bloqueado_hasta timestamptz,
  UNIQUE (paciente_id, tipo)
);
CREATE TABLE servicio (
  id uuid PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  categoria text NOT NULL,
  sinonimos text[] NOT NULL DEFAULT '{}',
  perfil jsonb NOT NULL
);
CREATE TABLE sede (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  ciudad text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  zona_horaria text NOT NULL,
  horario jsonb NOT NULL
);
CREATE TABLE usuario_interno (
  id uuid PRIMARY KEY,
  usuario text NOT NULL UNIQUE,
  rol text NOT NULL CHECK (rol IN ('ASESOR','RECEPCION','ADMIN')),
  sede_id uuid REFERENCES sede(id),
  hash text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE hilo_atencion (
  id uuid PRIMARY KEY,
  paciente_id uuid REFERENCES paciente(id),
  contacto_id uuid NOT NULL REFERENCES contacto_canal(id),
  abierto_en timestamptz NOT NULL DEFAULT now(),
  ultimo_canal text NOT NULL CHECK (ultimo_canal IN ('web','whatsapp','app','callcenter','clinica'))
);
CREATE TABLE tramite (
  id uuid PRIMARY KEY,
  hilo_id uuid NOT NULL REFERENCES hilo_atencion(id),
  tipo text NOT NULL CHECK (tipo IN ('AGENDAR','ADELANTO','FACTURA')),
  folio_externo text,
  servicio_id uuid REFERENCES servicio(id),
  sede_id uuid REFERENCES sede(id),
  paciente_id uuid REFERENCES paciente(id),
  estado text NOT NULL CHECK (estado IN ('BORRADOR','COTIZADO','LISTO_PARA_RESERVAR','HORARIO_RESERVADO','CONFIRMADA','EN_CLINICA','ATENDIDA','CANCELADA','NO_ASISTIO','EXPIRADO')),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  ultima_actividad timestamptz NOT NULL DEFAULT now(),
  ultimo_canal text NOT NULL CHECK (ultimo_canal IN ('web','whatsapp','app','callcenter','clinica')),
  tramite_padre_id uuid REFERENCES tramite(id)
);
CREATE TABLE evento (
  id uuid PRIMARY KEY,
  tramite_id uuid REFERENCES tramite(id),
  hilo_id uuid NOT NULL REFERENCES hilo_atencion(id),
  tipo text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  canal text NOT NULL CHECK (canal IN ('web','whatsapp','app','callcenter','clinica')),
  actor text NOT NULL,
  nivel_auth integer NOT NULL CHECK (nivel_auth BETWEEN 0 AND 3),
  version integer NOT NULL CHECK (version >= 0),
  correlation_id uuid NOT NULL,
  idempotency_key uuid NOT NULL UNIQUE,
  ts timestamptz NOT NULL
);
CREATE TABLE oferta_sede (
  sede_id uuid NOT NULL REFERENCES sede(id),
  servicio_id uuid NOT NULL REFERENCES servicio(id),
  precio_centavos integer NOT NULL CHECK (precio_centavos >= 0),
  disponible boolean NOT NULL DEFAULT true,
  modo_agenda text NOT NULL CHECK (modo_agenda IN ('HORARIO','TURNO')),
  PRIMARY KEY (sede_id, servicio_id)
);
CREATE TABLE recurso (
  id uuid PRIMARY KEY,
  sede_id uuid NOT NULL REFERENCES sede(id),
  tipo text NOT NULL,
  servicios_compatibles uuid[] NOT NULL DEFAULT '{}'
);
CREATE TABLE reserva (
  id uuid PRIMARY KEY,
  sede_id uuid NOT NULL REFERENCES sede(id),
  recurso_id uuid NOT NULL REFERENCES recurso(id),
  inicio timestamptz NOT NULL,
  tramite_id uuid NOT NULL REFERENCES tramite(id),
  estado text NOT NULL CHECK (estado IN ('APARTADA','CONFIRMADA','EXPIRADA','CANCELADA')),
  expira_en timestamptz
);
CREATE UNIQUE INDEX reserva_activa_unica ON reserva (sede_id, recurso_id, inicio)
  WHERE estado IN ('APARTADA','CONFIRMADA');
CREATE TABLE localidad (
  nombre_normalizado text PRIMARY KEY,
  municipio text NOT NULL,
  estado text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL
);
CREATE TABLE outbox (
  id uuid PRIMARY KEY,
  evento_id uuid NOT NULL UNIQUE REFERENCES evento(id),
  particion smallint NOT NULL CHECK (particion BETWEEN 0 AND 7),
  creado_en timestamptz NOT NULL DEFAULT now(),
  publicado_en timestamptz,
  intentos integer NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  ultimo_error text
);
CREATE INDEX outbox_pendientes ON outbox (creado_en) WHERE publicado_en IS NULL;
CREATE TABLE evento_procesado (
  consumidor text NOT NULL,
  idempotency_key uuid NOT NULL,
  procesado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumidor, idempotency_key)
);
CREATE TABLE token_usado (
  jti uuid PRIMARY KEY,
  usado_en timestamptz NOT NULL DEFAULT now(),
  expira_en timestamptz NOT NULL
);

CREATE FUNCTION noki_texto_sinonimos(text[]) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT array_to_string($1, ' ') $$;
CREATE INDEX servicio_nombre_trgm ON servicio USING gin (nombre gin_trgm_ops);
CREATE INDEX servicio_sinonimos_trgm ON servicio USING gin (noki_texto_sinonimos(sinonimos) gin_trgm_ops);
