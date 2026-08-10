-- Raw SQL migration to create the HNSW vector similarity index.
-- This index uses cosine distance operators against the halfvec(768) embeddings.

CREATE INDEX IF NOT EXISTS "FailureSignature_embedding_hnsw_idx"
ON "triage"."failure_signature"
USING hnsw (embedding halfvec_cosine_ops);
