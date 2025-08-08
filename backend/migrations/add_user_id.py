"""
Migration script to add user_id column to activities and attempts tables.
This script should be run after updating the models but before restarting the application.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Add parent directory to path so we can import from utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.db import get_db

load_dotenv()

def run_migration():
    # Get database connection
    db = next(get_db())
    conn = db.connection()
    
    try:
        print("Starting migration to add user_id columns...")
        
        # Check if columns already exist
        check_activities = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='activities' AND column_name='user_id'"
        )).fetchone()
        
        check_attempts = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='attempts' AND column_name='user_id'"
        )).fetchone()
        
        # Add user_id column to activities table if it doesn't exist
        if not check_activities:
            print("Adding user_id column to activities table...")
            
            # First get a teacher user to set as default owner
            teacher = conn.execute(text(
                "SELECT id FROM users WHERE role = 'teacher' LIMIT 1"
            )).fetchone()
            
            default_user_id = teacher[0] if teacher else None
            
            if not default_user_id:
                print("Warning: No teacher user found. Creating a placeholder ID.")
                default_user_id = "migration_placeholder"
            
            # Add the column with a default value
            conn.execute(text(
                f"ALTER TABLE activities ADD COLUMN user_id VARCHAR NOT NULL DEFAULT '{default_user_id}'"
            ))
            
            # Create index on user_id
            conn.execute(text(
                "CREATE INDEX idx_activities_user_id ON activities(user_id)"
            ))
            
            print("Successfully added user_id column to activities table.")
        else:
            print("user_id column already exists in activities table.")
        
        # Add user_id column to attempts table if it doesn't exist
        if not check_attempts:
            print("Adding user_id column to attempts table...")
            
            # First get a student user to set as default owner
            student = conn.execute(text(
                "SELECT id FROM users WHERE role = 'student' LIMIT 1"
            )).fetchone()
            
            default_user_id = student[0] if student else None
            
            if not default_user_id:
                print("Warning: No student user found. Creating a placeholder ID.")
                default_user_id = "migration_placeholder"
            
            # Add the column with a default value
            conn.execute(text(
                f"ALTER TABLE attempts ADD COLUMN user_id VARCHAR NOT NULL DEFAULT '{default_user_id}'"
            ))
            
            # Create index on user_id
            conn.execute(text(
                "CREATE INDEX idx_attempts_user_id ON attempts(user_id)"
            ))
            
            print("Successfully added user_id column to attempts table.")
        else:
            print("user_id column already exists in attempts table.")
        
        # Commit the transaction
        db.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
