"""Add test cases fields to activity table"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

def upgrade():
    # Add new columns
    op.add_column('activity', sa.Column('input_example', JSONB, nullable=True))
    op.add_column('activity', sa.Column('expected_output', JSONB, nullable=True))
    op.add_column('activity', sa.Column('validation_tests', JSONB, nullable=True))

    # Create indexes
    op.create_index('idx_activity_input_example', 'activity', ['input_example'], postgresql_using='gin')
    op.create_index('idx_activity_validation_tests', 'activity', ['validation_tests'], postgresql_using='gin')

def downgrade():
    # Drop indexes
    op.drop_index('idx_activity_input_example')
    op.drop_index('idx_activity_validation_tests')

    # Drop columns
    op.drop_column('activity', 'validation_tests')
    op.drop_column('activity', 'expected_output')
    op.drop_column('activity', 'input_example')
