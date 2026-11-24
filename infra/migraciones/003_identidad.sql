ALTER TABLE paciente
  ADD COLUMN entidad_nac text CHECK (entidad_nac ~ '^[A-Z]{2}$'),
  ADD COLUMN curp_base text CHECK (curp_base ~ '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}$'),
  ADD CONSTRAINT paciente_curp_formato CHECK (curp ~ '^[A-Z]{4}[0-9]{6}[HMX][A-Z]{5}[A-Z0-9][0-9]$');

CREATE UNIQUE INDEX paciente_curp_unica ON paciente (curp) WHERE curp IS NOT NULL;
CREATE INDEX paciente_curp_base ON paciente (curp_base) WHERE curp IS NULL;

DO $$
DECLARE
  restriccion text;
BEGIN
  SELECT conname INTO STRICT restriccion FROM pg_constraint
    WHERE conrelid = 'vinculo'::regclass AND contype = 'c'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
        WHERE attrelid = 'vinculo'::regclass AND attname = 'metodo')];
  EXECUTE format('ALTER TABLE vinculo DROP CONSTRAINT %I', restriccion);
END
$$;

ALTER TABLE vinculo ADD CONSTRAINT vinculo_metodo_check
  CHECK (metodo IN ('FLOW_DECLARADO', 'OTP_EMAIL', 'OTP_SMS', 'TOKEN_WEB', 'TOKEN_CC',
    'FOLIO_FECHA_NAC', 'INE_CLINICA', 'TELEFONO_FECHA_NAC'));

CREATE INDEX contacto_telefono ON contacto_canal (right(valor_externo, 10))
  WHERE canal IN ('whatsapp', 'callcenter');
