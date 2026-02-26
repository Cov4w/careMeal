#!/usr/bin/env python3
"""
SQLite to PostgreSQL Data Migration Script
Usage: python scripts/migrate_to_postgres.py

This script migrates all data from SQLite database to PostgreSQL.
Ensure PostgreSQL is running and accessible before running this script.
"""

import os
import sys
import sqlite3
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Import models from main.py
from main import (
    Base, User, ChatLog, Recipe, MealRecord,
    HealthRecord, UserPreference, DailyDiagnosis, BodyCompositionRecord
)


def get_sqlite_connection(sqlite_path: str):
    """Connect to SQLite database"""
    if not os.path.exists(sqlite_path):
        print(f"SQLite database not found: {sqlite_path}")
        sys.exit(1)

    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    return conn


def get_postgres_engine(postgres_url: str):
    """Create PostgreSQL engine"""
    engine = create_engine(
        postgres_url,
        pool_pre_ping=True,
        pool_recycle=3600,
    )
    return engine


def count_records(sqlite_conn, table_name: str) -> int:
    """Count records in SQLite table"""
    cursor = sqlite_conn.cursor()
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        return cursor.fetchone()[0]
    except sqlite3.OperationalError:
        return 0


def migrate_users(sqlite_conn, pg_session):
    """Migrate users table"""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()

    for row in rows:
        user = User(
            user_id=row['user_id'],
            password=row['password'],
            name=row['name'],
            age=row['age'],
            height=row['height'],
            weight=row['weight'],
            gender=row['gender'],
            diabetes_type=row['diabetes_type'],
            other_conditions=row['other_conditions'],
            details=row['details'] if row['details'] else {},
            joined_at=datetime.fromisoformat(row['joined_at']) if row['joined_at'] else datetime.now()
        )
        pg_session.merge(user)

    pg_session.commit()
    return len(rows)


def migrate_chat_logs(sqlite_conn, pg_session):
    """Migrate chat_logs table"""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM chat_logs")
    rows = cursor.fetchall()

    for row in rows:
        chat_log = ChatLog(
            id=row['id'],
            user_id=row['user_id'],
            role=row['role'],
            content=row['content'],
            timestamp=datetime.fromisoformat(row['timestamp']) if row['timestamp'] else datetime.now()
        )
        pg_session.merge(chat_log)

    pg_session.commit()
    return len(rows)


def migrate_recipes(sqlite_conn, pg_session):
    """Migrate recipes table"""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM recipes")
    rows = cursor.fetchall()

    for row in rows:
        recipe = Recipe(
            id=row['id'],
            name=row['name'],
            description=row['description'],
            image_url=row['image_url'],
            disease_tag=row['disease_tag'],
            category=row['category'],
            diet_type=row['diet_type'],
            ingredients=row['ingredients'],
            instructions=row['instructions'] if 'instructions' in row.keys() else None,
            time_minutes=row['time_minutes'],
            calories=row['calories'],
            carbs=row['carbs'],
            protein=row['protein'],
            fat=row['fat'],
            sodium=row['sodium']
        )
        pg_session.merge(recipe)

    pg_session.commit()
    return len(rows)


def migrate_meal_records(sqlite_conn, pg_session):
    """Migrate meal_records table"""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM meal_records")
    rows = cursor.fetchall()

    for row in rows:
        record = MealRecord(
            id=row['id'],
            user_id=row['user_id'],
            date=row['date'],
            meal_type=row['meal_type'],
            menu=row['menu'],
            calories=row['calories'],
            carbs=row['carbs'],
            protein=row['protein'],
            fat=row['fat'],
            image_url=row['image_url'] if 'image_url' in row.keys() else None
        )
        pg_session.merge(record)

    pg_session.commit()
    return len(rows)


def migrate_health_records(sqlite_conn, pg_session):
    """Migrate health_records table"""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM health_records")
    rows = cursor.fetchall()

    for row in rows:
        record = HealthRecord(
            id=row['id'],
            user_id=row['user_id'],
            date=row['date'],
            time_slot=row['time_slot'],
            value=row['value']
        )
        pg_session.merge(record)

    pg_session.commit()
    return len(rows)


def migrate_user_preferences(sqlite_conn, pg_session):
    """Migrate user_preferences table"""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM user_preferences")
    rows = cursor.fetchall()

    for row in rows:
        pref = UserPreference(
            id=row['id'],
            user_id=row['user_id'],
            recipe_id=row['recipe_id'],
            preference=row['preference'],
            timestamp=datetime.fromisoformat(row['timestamp']) if row['timestamp'] else datetime.now()
        )
        pg_session.merge(pref)

    pg_session.commit()
    return len(rows)


def migrate_daily_diagnoses(sqlite_conn, pg_session):
    """Migrate daily_diagnoses table"""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM daily_diagnoses")
    rows = cursor.fetchall()

    for row in rows:
        diagnosis = DailyDiagnosis(
            id=row['id'],
            user_id=row['user_id'],
            date=row['date'],
            eat_score=row['eat_score'],
            prescriptions=row['prescriptions'] if row['prescriptions'] else [],
            created_at=datetime.fromisoformat(row['created_at']) if row['created_at'] else datetime.now()
        )
        pg_session.merge(diagnosis)

    pg_session.commit()
    return len(rows)


def migrate_body_composition_records(sqlite_conn, pg_session):
    """Migrate body_composition_records table"""
    cursor = sqlite_conn.cursor()
    try:
        cursor.execute("SELECT * FROM body_composition_records")
        rows = cursor.fetchall()
    except sqlite3.OperationalError:
        # Table might not exist
        return 0

    for row in rows:
        record = BodyCompositionRecord(
            id=row['id'],
            user_id=row['user_id'],
            measured_at=datetime.fromisoformat(row['measured_at']) if row['measured_at'] else datetime.now(),
            weight=row['weight'],
            impedance=row['impedance'],
            heart_rate=row['heart_rate'] if 'heart_rate' in row.keys() else None,
            bmi=row['bmi'],
            body_fat_percentage=row['body_fat_percentage'],
            water_percentage=row['water_percentage'],
            bone_mass=row['bone_mass'],
            muscle_mass=row['muscle_mass'],
            visceral_fat=row['visceral_fat'],
            bmr=row['bmr'],
            metabolic_age=row['metabolic_age'],
            protein_percentage=row['protein_percentage'],
            body_type=row['body_type'],
            ideal_weight=row['ideal_weight'],
            fat_mass=row['fat_mass'],
            fat_free_mass=row['fat_free_mass'],
            body_score=row['body_score']
        )
        pg_session.merge(record)

    pg_session.commit()
    return len(rows)


def reset_sequences(pg_engine):
    """Reset PostgreSQL sequences to max ID + 1"""
    tables_with_serial = [
        ('recipes', 'id'),
        ('meal_records', 'id'),
        ('health_records', 'id'),
        ('user_preferences', 'id'),
        ('daily_diagnoses', 'id'),
        ('body_composition_records', 'id'),
    ]

    with pg_engine.connect() as conn:
        for table, column in tables_with_serial:
            try:
                result = conn.execute(text(f"SELECT MAX({column}) FROM {table}"))
                max_id = result.scalar() or 0
                conn.execute(text(f"SELECT setval('{table}_{column}_seq', {max_id + 1}, false)"))
                conn.commit()
                print(f"  Reset sequence for {table}: next ID = {max_id + 1}")
            except Exception as e:
                print(f"  Warning: Could not reset sequence for {table}: {e}")


def main():
    # Configuration
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    SQLITE_PATH = os.getenv('SQLITE_PATH', os.path.join(BASE_DIR, 'caremeal.db'))
    POSTGRES_URL = os.getenv('DATABASE_URL', 'postgresql://caremeal_user:devpassword@localhost:5432/caremeal')

    print("=" * 60)
    print("SQLite to PostgreSQL Migration")
    print("=" * 60)
    print(f"Source (SQLite): {SQLITE_PATH}")
    print(f"Target (PostgreSQL): {POSTGRES_URL.split('@')[1] if '@' in POSTGRES_URL else POSTGRES_URL}")
    print()

    # Connect to databases
    print("[1/4] Connecting to databases...")
    sqlite_conn = get_sqlite_connection(SQLITE_PATH)
    pg_engine = get_postgres_engine(POSTGRES_URL)

    # Create tables in PostgreSQL
    print("[2/4] Creating tables in PostgreSQL...")
    Base.metadata.create_all(bind=pg_engine)

    # Create session
    Session = sessionmaker(bind=pg_engine)
    pg_session = Session()

    # Migration
    print("[3/4] Migrating data...")
    print()

    migrations = [
        ("users", migrate_users),
        ("chat_logs", migrate_chat_logs),
        ("recipes", migrate_recipes),
        ("meal_records", migrate_meal_records),
        ("health_records", migrate_health_records),
        ("user_preferences", migrate_user_preferences),
        ("daily_diagnoses", migrate_daily_diagnoses),
        ("body_composition_records", migrate_body_composition_records),
    ]

    results = {}
    for table_name, migrate_func in migrations:
        sqlite_count = count_records(sqlite_conn, table_name)
        try:
            migrated_count = migrate_func(sqlite_conn, pg_session)
            results[table_name] = {
                'sqlite': sqlite_count,
                'postgres': migrated_count,
                'status': 'OK' if sqlite_count == migrated_count else 'MISMATCH'
            }
            print(f"  {table_name}: {migrated_count} records migrated")
        except Exception as e:
            results[table_name] = {
                'sqlite': sqlite_count,
                'postgres': 0,
                'status': f'ERROR: {str(e)}'
            }
            print(f"  {table_name}: ERROR - {e}")

    # Reset sequences
    print()
    print("[4/4] Resetting PostgreSQL sequences...")
    reset_sequences(pg_engine)

    # Summary
    print()
    print("=" * 60)
    print("Migration Summary")
    print("=" * 60)
    print(f"{'Table':<30} {'SQLite':<10} {'PostgreSQL':<10} {'Status'}")
    print("-" * 60)

    all_ok = True
    for table, result in results.items():
        status = result['status']
        if status != 'OK':
            all_ok = False
        print(f"{table:<30} {result['sqlite']:<10} {result['postgres']:<10} {status}")

    print("-" * 60)

    if all_ok:
        print("Migration completed successfully!")
    else:
        print("Migration completed with warnings. Please review the results above.")

    # Cleanup
    pg_session.close()
    sqlite_conn.close()

    return 0 if all_ok else 1


if __name__ == '__main__':
    sys.exit(main())
