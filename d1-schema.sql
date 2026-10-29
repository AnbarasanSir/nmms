-- ============================================================================
-- NMMS Exam Portal - Cloudflare D1 Database Schema
-- ============================================================================

-- 1. Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INTEGER DEFAULT 30,
  total_marks INTEGER DEFAULT 20,
  pass_percentage INTEGER DEFAULT 40,
  shuffle_questions INTEGER DEFAULT 1,
  shuffle_options INTEGER DEFAULT 1,
  enable_question_limit INTEGER DEFAULT 0,
  questions_per_attempt INTEGER,
  enable_anti_cheat INTEGER DEFAULT 1,
  show_results_immediately INTEGER DEFAULT 1,
  allow_review INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  questions TEXT DEFAULT '[]', -- JSON string of Question[]
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);

-- 2. Student Attempts table
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  quiz_title TEXT NOT NULL,
  student_name TEXT NOT NULL,
  exam_number TEXT NOT NULL COLLATE NOCASE,
  started_at TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  time_taken_seconds INTEGER DEFAULT 0,
  tab_switch_count INTEGER DEFAULT 0,
  answers TEXT DEFAULT '{}',          -- JSON string Record<string, string>
  question_status TEXT DEFAULT '{}',  -- JSON string Record<string, string>
  score TEXT NOT NULL,                -- JSON string StudentScoreResult
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attempts_quiz_id ON attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_exam_number ON attempts(exam_number COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_attempts_created ON attempts(created_at DESC);

-- 3. Students Roster table
CREATE TABLE IF NOT EXISTS students (
  exam_number TEXT PRIMARY KEY COLLATE NOCASE,
  student_name TEXT NOT NULL,
  school TEXT DEFAULT 'GHS Kadayam',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Admin Credentials & Settings table
CREATE TABLE IF NOT EXISTS admin_config (
  config_key TEXT PRIMARY KEY DEFAULT 'primary',
  admin_password TEXT NOT NULL DEFAULT 'nmms@2026',
  security_pin TEXT NOT NULL DEFAULT '273464',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Subject Unit Overrides table (Customized/Edited Questions per Unit)
CREATE TABLE IF NOT EXISTS unit_overrides (
  key TEXT PRIMARY KEY, -- e.g. "MAT_1", "SAT_MATHS_4"
  subject TEXT NOT NULL,
  unit_number INTEGER NOT NULL,
  metadata TEXT DEFAULT '{}',  -- JSON string
  questions TEXT DEFAULT '[]', -- JSON string of Question[]
  is_custom INTEGER DEFAULT 0,
  last_updated TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_unit_overrides_subj ON unit_overrides(subject, unit_number);

-- 6. Default Unit Questions Bank (pre-seeded from assets data)
CREATE TABLE IF NOT EXISTS unit_bank (
  key TEXT PRIMARY KEY, -- e.g. "MAT_1", "SAT_MATHS_2"
  subject TEXT NOT NULL,
  unit_number INTEGER NOT NULL,
  questions TEXT NOT NULL, -- JSON string Question[]
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Seed initial admin config
INSERT OR IGNORE INTO admin_config (config_key, admin_password, security_pin)
VALUES ('primary', 'nmms@2026', '273464');

