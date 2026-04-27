const EMBEDDING_DIM = 384;

function normalizeToken(token) {
  return String(token || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hashToken(token, seed) {
  let hash = 2166136261 ^ seed;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createLocalEmbedding(text) {
  const vector = Array(EMBEDDING_DIM).fill(0);
  const tokens = String(text || "")
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);

  if (!tokens.length) return vector;

  // Hashing trick: place each token into a few signed buckets for a sparse semantic vector.
  for (const token of tokens) {
    for (let seed = 0; seed < 3; seed += 1) {
      const hash = hashToken(token, seed);
      const idx = hash % EMBEDDING_DIM;
      const sign = ((hash >> 8) & 1) === 0 ? 1 : -1;
      vector[idx] += sign;
    }
  }

  // L2 normalize for cosine similarity stability.
  let norm = 0;
  for (let i = 0; i < vector.length; i += 1) {
    norm += vector[i] * vector[i];
  }

  norm = Math.sqrt(norm);
  if (!norm) return vector;

  for (let i = 0; i < vector.length; i += 1) {
    vector[i] /= norm;
  }

  return vector;
}

export { EMBEDDING_DIM };
