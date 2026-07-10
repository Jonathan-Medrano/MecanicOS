-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to technical_guides
ALTER TABLE "technical_guides" ADD COLUMN IF NOT EXISTS "embedding" vector(768);

-- IVFFlat index for cosine similarity search (requires data before training)
-- Created after data is loaded; for now we rely on sequential scan
