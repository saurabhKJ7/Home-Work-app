#!/usr/bin/env python3
"""
Migration script to add enhanced fields to code_generations table.
Run this script to add input_example, expected_output, and validation_tests columns.
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Execute the migration to add enhanced fields to code_generations table"""
    
    # Database connection parameters
    db_params = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'homework_app'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'password')
    }
    
    migration_sql = """
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
    """
    
    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        # Execute migration
        print("Running migration...")
        cursor.execute(migration_sql)
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully!")
        
        # Verify the new columns were added
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'code_generations' 
            AND column_name IN ('input_example', 'expected_output', 'validation_tests')
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        if columns:
            print("\nNew columns added:")
            for col_name, col_type in columns:
                print(f"  - {col_name}: {col_type}")
        else:
            print("Warning: Could not verify new columns were added.")
            
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("Enhanced Code Generation Fields Migration")
    print("=" * 50)
    
    # Confirm before running
    response = input("This will add new columns to the code_generations table. Continue? (y/N): ")
    if response.lower() != 'y':
        print("Migration cancelled.")
        sys.exit(0)
    
    run_migration()
    print("\nMigration completed! The code_generations table now includes:")
    print("- input_example: JSONB field for example input parameters")
    print("- expected_output: JSONB field for expected output")
    print("- validation_tests: JSONB field for array of test cases")
