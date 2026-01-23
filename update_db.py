import sqlite3
import os

# Connect to the database
context_path = '/Users/cov4/careMeal/caremeal.db'
if not os.path.exists(context_path):
    print(f"DB not found at {context_path}")
    exit(1)

conn = sqlite3.connect(context_path)
cursor = conn.cursor()

# Update image_url to remove http://localhost:8000 prefix, making it relative
# Safe clean up using REPLACE
sql = "UPDATE recipes SET image_url = REPLACE(image_url, 'http://localhost:8000', '') WHERE image_url LIKE 'http://localhost:8000%'"

try:
    cursor.execute(sql)
    conn.commit()
    print(f"Updated {cursor.rowcount} rows. URLs are now relative path (e.g. /static/...).")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
