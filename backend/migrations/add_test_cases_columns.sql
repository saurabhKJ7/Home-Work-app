-- Add new columns to activity table for test cases and validation data
ALTER TABLE activity
ADD COLUMN input_example JSONB,
ADD COLUMN expected_output JSONB,
ADD COLUMN validation_tests JSONB;

-- Create indexes for better query performance on JSONB columns
CREATE INDEX IF NOT EXISTS idx_activity_input_example ON activity USING GIN (input_example);
CREATE INDEX IF NOT EXISTS idx_activity_validation_tests ON activity USING GIN (validation_tests);
