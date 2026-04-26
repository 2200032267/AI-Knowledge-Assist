/*
  # Create chat history and document tables

  1. New Tables
    - `chat_sessions`
      - `id` (uuid, primary key) - unique session identifier
      - `title` (text) - session title derived from first message
      - `mode` (text) - chat mode: "document", "general", or "agent"
      - `created_at` (timestamptz) - session creation time
      - `updated_at` (timestamptz) - last activity time
    - `chat_messages`
      - `id` (uuid, primary key) - unique message identifier
      - `session_id` (uuid, foreign key) - references chat_sessions
      - `role` (text) - "user" or "assistant"
      - `content` (text) - message content
      - `created_at` (timestamptz) - message creation time
    - `uploaded_documents`
      - `id` (uuid, primary key) - unique document identifier
      - `filename` (text) - original file name
      - `chunk_count` (integer) - number of chunks extracted
      - `created_at` (timestamptz) - upload time

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - All tables allow full CRUD for authenticated users (single-user app)

  3. Notes
    - This is a single-user knowledge assistant, so policies allow
      all authenticated users to access all data
    - Foreign key from chat_messages to chat_sessions with cascade delete
*/

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New Chat',
  mode text NOT NULL DEFAULT 'document',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uploaded_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  chunk_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;

-- Policies for chat_sessions
CREATE POLICY "Authenticated users can view chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete chat sessions"
  ON chat_sessions FOR DELETE
  TO authenticated
  USING (true);

-- Policies for chat_messages
CREATE POLICY "Authenticated users can view chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete chat messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (true);

-- Policies for uploaded_documents
CREATE POLICY "Authenticated users can view uploaded documents"
  ON uploaded_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert uploaded documents"
  ON uploaded_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete uploaded documents"
  ON uploaded_documents FOR DELETE
  TO authenticated
  USING (true);

-- Index for faster message lookups by session
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
