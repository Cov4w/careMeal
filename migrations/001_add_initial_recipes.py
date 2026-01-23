"""
Migration: Add initial recipes
Created: 2026-01-23
"""

import sqlite3
from datetime import datetime

def upgrade(db_path='/app/caremeal.db'):
    """Apply migration"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Read SQL file
    with open('migrations/data/recipes_initial.sql', 'r') as f:
        sql = f.read()
    
    cursor.executescript(sql)
    conn.commit()
    
    # Log migration
    cursor.execute("""
        INSERT INTO migration_history (version, applied_at)
        VALUES (?, ?)
    """, ('001_add_initial_recipes', datetime.now()))
    
    conn.commit()
    conn.close()
    print("✅ Migration 001 applied: Added 29 initial recipes")

def downgrade(db_path='/app/caremeal.db'):
    """Rollback migration"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM recipes WHERE id <= 30")
    conn.commit()
    conn.close()
    print("✅ Migration 001 rolled back")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'down':
        downgrade()
    else:
        upgrade()
