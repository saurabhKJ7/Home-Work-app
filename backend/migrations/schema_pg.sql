-- PostgreSQL schema for Home-Work app
-- Run this in pgAdmin's Query Tool connected to your target database

-- Optional: ensure jsonb is available (it is by default in Postgres 9.4+)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if you want a clean setup (CAUTION: this deletes data)
-- DROP TABLE IF EXISTS attempts CASCADE;
-- DROP TABLE IF EXISTS activities CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR PRIMARY KEY,
    email           VARCHAR NOT NULL UNIQUE,
    password_hash   VARCHAR NOT NULL,
    role            VARCHAR NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id                   VARCHAR PRIMARY KEY,
    user_id              VARCHAR NOT NULL,
    title                VARCHAR NOT NULL,
    worksheet_level      VARCHAR NOT NULL,
    type                 VARCHAR NOT NULL,
    difficulty           VARCHAR NOT NULL,
    problem_statement    TEXT NOT NULL,
    ui_config            JSONB,
    validation_function  TEXT,
    correct_answers      JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()

    -- If you want referential integrity, uncomment the FK below and ensure users exist first
    -- ,CONSTRAINT fk_activities_user
    --     FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Attempts table
CREATE TABLE IF NOT EXISTS attempts (
    id                  VARCHAR PRIMARY KEY,
    user_id             VARCHAR NOT NULL,
    activity_id         VARCHAR NOT NULL,
    submission          JSONB NOT NULL,
    is_correct          VARCHAR NOT NULL DEFAULT 'false',
    score_percentage    VARCHAR NOT NULL DEFAULT '0',
    feedback            TEXT,
    confidence_score    VARCHAR NOT NULL DEFAULT '0',
    time_spent_seconds  VARCHAR,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()

    -- If you want referential integrity, uncomment the FKs below and ensure referenced rows exist
    -- ,CONSTRAINT fk_attempts_user
    --     FOREIGN KEY(user_id) REFERENCES users(id)
    -- ,CONSTRAINT fk_attempts_activity
    --     FOREIGN KEY(activity_id) REFERENCES activities(id)
);

-- Indexes to match SQLAlchemy model hints
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_activity_id ON attempts(activity_id);

-- Additional helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Done

