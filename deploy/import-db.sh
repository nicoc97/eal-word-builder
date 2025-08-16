#!/bin/bash
# Import database schema to Railway MySQL

# Parse MYSQL_URL to get connection details
# URL format: mysql://user:password@host:port/database
MYSQL_URL_PARSED=$(echo $MYSQL_URL | sed -n 's/mysql:\/\/\([^:]*\):\([^@]*\)@\([^:]*\):\([^\/]*\)\/\(.*\)/\1 \2 \3 \4 \5/p')
read -r DB_USER DB_PASS DB_HOST DB_PORT DB_NAME <<< "$MYSQL_URL_PARSED"

echo "Connecting to MySQL: $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"

# Import the database schema
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < database/setup.sql

if [ $? -eq 0 ]; then
    echo "Database schema imported successfully!"
else
    echo "Error importing database schema"
fi