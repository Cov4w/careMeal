#!/usr/bin/env python3
"""
Database Migration Runner (PostgreSQL/SQLite compatible)
Usage:
    python migrate.py up          # Apply all pending migrations
    python migrate.py down        # Rollback last migration
    python migrate.py status      # Show migration status
"""

import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

MIGRATIONS_DIR = Path(__file__).parent
BASE_DIR = MIGRATIONS_DIR.parent

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', f"sqlite:///{os.path.join(BASE_DIR, 'caremeal.db')}")


def get_engine():
    """Create database engine based on DATABASE_URL"""
    if DATABASE_URL.startswith("postgresql"):
        return create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
    else:
        return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def init_migration_table():
    """Create migration history table if not exists"""
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS migration_history (
                id SERIAL PRIMARY KEY,
                version VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()


def init_migration_table_sqlite():
    """Create migration history table for SQLite"""
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS migration_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()


def ensure_migration_table():
    """Ensure migration table exists (handles both PostgreSQL and SQLite)"""
    if DATABASE_URL.startswith("postgresql"):
        init_migration_table()
    else:
        init_migration_table_sqlite()


def get_applied_migrations():
    """Get list of applied migrations"""
    engine = get_engine()
    with engine.connect() as conn:
        try:
            result = conn.execute(text("SELECT version FROM migration_history ORDER BY id"))
            return [row[0] for row in result.fetchall()]
        except OperationalError:
            return []


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

    # Read and execute migration file
    migration_path = MIGRATIONS_DIR / f"{module_name}.py"
    with open(migration_path) as f:
        exec(f.read(), globals())

    # Run migration function
    engine = get_engine()
    if direction == 'up':
        upgrade(engine)
        # Record migration
        with engine.connect() as conn:
            conn.execute(
                text("INSERT INTO migration_history (version) VALUES (:version)"),
                {"version": module_name}
            )
            conn.commit()
    else:
        downgrade(engine)


def migrate_up():
    """Apply all pending migrations"""
    ensure_migration_table()
    pending = get_pending_migrations()

    if not pending:
        print("No pending migrations")
        return

    print(f"Applying {len(pending)} migration(s)...")
    for migration in pending:
        print(f"  -> {migration}")
        run_migration(f"{migration}.py", 'up')

    print("All migrations applied")


def migrate_down():
    """Rollback last migration"""
    applied = get_applied_migrations()

    if not applied:
        print("No migrations to rollback")
        return

    last_migration = applied[-1]
    print(f"Rolling back: {last_migration}")
    run_migration(f"{last_migration}.py", 'down')

    # Remove from history
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(
            text("DELETE FROM migration_history WHERE version = :version"),
            {"version": last_migration}
        )
        conn.commit()

    print("Rollback complete")


def show_status():
    """Show migration status"""
    ensure_migration_table()
    applied = get_applied_migrations()
    pending = get_pending_migrations()

    db_type = "PostgreSQL" if DATABASE_URL.startswith("postgresql") else "SQLite"
    print(f"Database: {db_type}")
    print(f"Migration Status")

    print(f"\nApplied ({len(applied)}):")
    for m in applied:
        print(f"  - {m}")

    print(f"\nPending ({len(pending)}):")
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
