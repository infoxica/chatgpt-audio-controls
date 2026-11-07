ALTER TABLE feedback ADD COLUMN feature TEXT CHECK (feature IS NULL OR feature IN ('controls','playback','seek','speed','volume','download','shortcuts','language','other'));
ALTER TABLE feedback ADD COLUMN symptom TEXT CHECK (symptom IS NULL OR symptom IN ('not_working','missing','incorrect','slow','intermittent','other'));
ALTER TABLE feedback ADD COLUMN context_schema_version INTEGER CHECK (context_schema_version IS NULL OR context_schema_version = 2);
