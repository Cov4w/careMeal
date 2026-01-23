#!/usr/bin/env python3
"""
Initialize CareMeal Database
Creates empty database with schema and initial recipe data
"""

import sqlite3
import os
from pathlib import Path

DB_PATH = os.getenv('DB_PATH', '/app/caremeal.db')
MIGRATIONS_DIR = Path(__file__).parent.parent / 'migrations'

def init_database():
    """Initialize database with schema"""
    print("🔧 Initializing CareMeal database...")
    
    # Check if DB already exists
    if os.path.exists(DB_PATH):
        print(f"⚠️  Database already exists at {DB_PATH}")
        response = input("Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("❌ Aborted")
            return
        os.remove(DB_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create tables
    print("📋 Creating tables...")
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR UNIQUE NOT NULL,
            password VARCHAR NOT NULL,
            name VARCHAR,
            disease_tag VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Chat logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            response TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Meal records table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meal_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date DATE NOT NULL,
            meal_type VARCHAR,
            menu TEXT,
            calories INTEGER,
            carbs FLOAT,
            protein FLOAT,
            fat FLOAT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Health records table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS health_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date DATE NOT NULL,
            blood_sugar_fasting FLOAT,
            blood_sugar_post_breakfast FLOAT,
            blood_sugar_post_lunch FLOAT,
            blood_sugar_post_dinner FLOAT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Recipes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER NOT NULL PRIMARY KEY,
            name VARCHAR,
            description VARCHAR,
            image_url VARCHAR,
            disease_tag VARCHAR,
            category VARCHAR,
            diet_type VARCHAR,
            ingredients TEXT,
            calories INTEGER,
            carbs FLOAT,
            protein FLOAT,
            fat FLOAT,
            sodium FLOAT,
            time_minutes INTEGER DEFAULT 20,
            instructions TEXT
        )
    """)
    
    # User preferences table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            recipe_id INTEGER NOT NULL,
            preference VARCHAR CHECK(preference IN ('like', 'dislike')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (recipe_id) REFERENCES recipes(id),
            UNIQUE(user_id, recipe_id)
        )
    """)
    
    # Daily diagnoses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_diagnoses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date DATE NOT NULL,
            diagnosis TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Migration history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS migration_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    print("✅ Tables created")
    
    # Load initial recipe data
    print("📦 Loading initial recipe data...")
    recipes_sql = Path(__file__).parent.parent / 'migrations' / 'data' / 'recipes_initial.sql'
    
    if recipes_sql.exists():
        with open(recipes_sql, 'r', encoding='utf-8') as f:
            sql_content = f.read()
            # Remove CREATE TABLE statement
            sql_lines = [line for line in sql_content.split('\n') 
                        if line.startswith('INSERT INTO recipes')]
            for line in sql_lines:
                cursor.execute(line)
        
        cursor.execute("SELECT COUNT(*) FROM recipes")
        count = cursor.fetchone()[0]
        print(f"✅ Loaded {count} recipes")
    else:
        print("⚠️  No initial recipe data found")
    
    conn.commit()
    conn.close()
    
    print(f"✅ Database initialized at {DB_PATH}")
    print("\n📊 Database statistics:")
    
    # Show stats
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    tables = ['users', 'recipes', 'chat_logs', 'meal_records', 'health_records']
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  - {table}: {count} rows")
    
    conn.close()

if __name__ == '__main__':
    init_database()
