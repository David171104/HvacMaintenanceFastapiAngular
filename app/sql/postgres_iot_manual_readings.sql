BEGIN;

CREATE TABLE IF NOT EXISTS iot_equipment_catalog (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    location VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE lecturas
    ADD COLUMN IF NOT EXISTS equipo_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS observacion TEXT,
    ADD COLUMN IF NOT EXISTS manual_entry BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lecturas_equipo_fecha
ON lecturas (equipo_id, fecha_hora DESC);

INSERT INTO iot_equipment_catalog (id, name, location, is_active)
VALUES
    ('mini-01', 'Minisplit Lobby', 'Recepcion principal', TRUE),
    ('mini-02', 'Minisplit Sala Tecnica', 'Area de control IoT', TRUE),
    ('mini-03', 'Minisplit Oficina 3', 'Zona administrativa', TRUE)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

COMMIT;
