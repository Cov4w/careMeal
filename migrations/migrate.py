#!/usr/bin/env python3
"""
Database Migration Runner
Usage:
    python migrate.py up          # Apply all pending migrations
    python migrate.py down        # Rollback last migration
    python migrate.py status      # Show migration status
"""

import sqlite3
import os
import sys
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).parent
DB_PATH = os.getenv('DB_PATH', '/app/caremeal.db')

def init_migration_table():
    """Create migration history table if not exists"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS migration_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def get_applied_migrations():
    """Get list of applied migrations"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT version FROM migration_history ORDER BY id")
    applied = [row[0] for row in cursor.fetchall()]
    conn.close()
    return applied

def get_pending_migrations():
    """Get list of pending migrations"""
    applied = get_applied_migrations()
    all_migrations = sorted([
        f.stem for f in MIGRATIONS_DIR.glob('*.py')
        if f.stem != 'migrate' and not f.stem.startswith('_')
    ])
    return [m for m in all_migrations if m not in applied]

def run_migration(migration_file, direction='up'):
    """Run a single migration"""
    module_name = migration_file.replace('.py', '')
    exec(open(MIGRATIONS_DIR / f"{module_name}.py").read(), globals())
    
    if direction == 'up':
        upgrade(DB_PATH)
    else:
        downgrade(DB_PATH)

def migrate_up():
    """Apply all pending migrations"""
    init_migration_table()
    pending = get_pending_migrations()
    
    if not pending:
        print("✅ No pending migrations")
        return
    
    print(f"📦 Applying {len(pending)} migration(s)...")
    for migration in pending:
        print(f"  → {migration}")
        run_migration(f"{migration}.py", 'up')
    
    print("✅ All migrations applied")

def migrate_down():
    """Rollback last migration"""
    applied = get_applied_migrations()
    
    if not applied:
        print("❌ No migrations to rollback")
        return
    
    last_migration = applied[-1]
    print(f"⏪ Rolling back: {last_migration}")
    run_migration(f"{last_migration}.py", 'down')
    
    # Remove from history
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM migration_history WHERE version = ?", (last_migration,))
    conn.commit()
    conn.close()
    
    print("✅ Rollback complete")

def show_status():
    """Show migration status"""
    init_migration_table()
    applied = get_applied_migrations()
    pending = get_pending_migrations()
    
    print("📊 Migration Status")
    print(f"\n✅ Applied ({len(applied)}):")
    for m in applied:
        print(f"  - {m}")
    
    print(f"\n⏳ Pending ({len(pending)}):")
    for m in pending:
        print(f"  - {m}")

if __name__ == '__main__':
    command = sys.argv[1] if len(sys.argv) > 1 else 'status'
    
    if command == 'up':
        migrate_up()
    elif command == 'down':
        migrate_down()
    elif command == 'status':
        show_status()
    else:
        print("Usage: python migrate.py [up|down|status]")
        sys.exit(1)
