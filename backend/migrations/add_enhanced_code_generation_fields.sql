-- Migration to add enhanced fields to code_generations table
-- Run this to add input_example, expected_output, and validation_tests columns

-- Add new columns to code_generations table
ALTER TABLE code_generations 
ADD COLUMN IF NOT EXISTS input_example JSONB,
ADD COLUMN IF NOT EXISTS expected_output JSONB,
ADD COLUMN IF NOT EXISTS validation_tests JSONB;

-- Add comments for documentation
COMMENT ON COLUMN code_generations.input_example IS 'Example input parameters as JSON object';
COMMENT ON COLUMN code_generations.expected_output IS 'Expected output for the input example';
COMMENT ON COLUMN code_generations.validation_tests IS 'Array of 10 test cases for validation';

-- Create index for faster queries on these fields if needed
CREATE INDEX IF NOT EXISTS idx_code_generations_input_example ON code_generations USING GIN (input_example);
CREATE INDEX IF NOT EXISTS idx_code_generations_validation_tests ON code_generations USING GIN (validation_tests);
