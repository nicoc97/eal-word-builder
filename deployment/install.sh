#!/bin/bash

# ============================================================================
# WORD BUILDER GAME - PRODUCTION INSTALLATION SCRIPT
# ============================================================================
# 
# This script automates the installation and configuration of the EAL Word
# Builder Game for production environments.
# 
# USAGE:
#   chmod +x install.sh
#   ./install.sh
# 
# REQUIREMENTS:
#   - PHP 8.0+ with PDO MySQL extension
#   - MySQL 8.0+ or MariaDB 10.5+
#   - Apache or Nginx web server
#   - Composer (optional, for future dependencies)
# 
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
DB_NAME="word_builder_game"
DB_USER="wordbuilder"
WEB_USER="www-data"
INSTALL_DIR="/var/www/html/word-builder-game"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}WORD BUILDER GAME - PRODUCTION INSTALLATION${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Function to print status messages
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. This is not recommended for production."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check system requirements
echo -e "${BLUE}Checking system requirements...${NC}"

# Check PHP
if ! command -v php &> /dev/null; then
    print_error "PHP is not installed. Please install PHP 8.0+ first."
    exit 1
fi

PHP_VERSION=$(php -r "echo PHP_VERSION;")
print_status "PHP version: $PHP_VERSION"

# Check PHP PDO MySQL extension
if ! php -m | grep -q pdo_mysql; then
    print_error "PHP PDO MySQL extension is not installed."
    echo "Install with: sudo apt-get install php-mysql (Ubuntu/Debian)"
    exit 1
fi
print_status "PHP PDO MySQL extension found"

# Check MySQL
if ! command -v mysql &> /dev/null; then
    print_error "MySQL client is not installed."
    exit 1
fi
print_status "MySQL client found"

echo ""

# Get database credentials
echo -e "${BLUE}Database Configuration${NC}"
read -p "MySQL root password: " -s DB_ROOT_PASSWORD
echo ""
read -p "Database name [$DB_NAME]: " INPUT_DB_NAME
DB_NAME=${INPUT_DB_NAME:-$DB_NAME}

read -p "Application database user [$DB_USER]: " INPUT_DB_USER
DB_USER=${INPUT_DB_USER:-$DB_USER}

read -p "Application database password: " -s DB_PASSWORD
echo ""

read -p "Installation directory [$INSTALL_DIR]: " INPUT_INSTALL_DIR
INSTALL_DIR=${INPUT_INSTALL_DIR:-$INSTALL_DIR}

echo ""

# Create installation directory
echo -e "${BLUE}Setting up installation directory...${NC}"
if [[ ! -d "$INSTALL_DIR" ]]; then
    sudo mkdir -p "$INSTALL_DIR"
    print_status "Created directory: $INSTALL_DIR"
fi

# Copy application files
echo -e "${BLUE}Copying application files...${NC}"
sudo cp -r ../api "$INSTALL_DIR/"
sudo cp -r ../classes "$INSTALL_DIR/"
sudo cp -r ../config "$INSTALL_DIR/"
sudo cp -r ../css "$INSTALL_DIR/"
sudo cp -r ../data "$INSTALL_DIR/"
sudo cp -r ../images "$INSTALL_DIR/"
sudo cp -r ../js "$INSTALL_DIR/"
sudo cp ../index.html "$INSTALL_DIR/"
sudo cp ../teacher.html "$INSTALL_DIR/"
sudo cp ../server.py "$INSTALL_DIR/"

print_status "Application files copied"

# Set proper permissions
echo -e "${BLUE}Setting file permissions...${NC}"
sudo chown -R $WEB_USER:$WEB_USER "$INSTALL_DIR"
sudo chmod -R 755 "$INSTALL_DIR"
sudo chmod -R 644 "$INSTALL_DIR"/*.html
sudo chmod -R 644 "$INSTALL_DIR"/css/*
sudo chmod -R 644 "$INSTALL_DIR"/js/*
sudo chmod 600 "$INSTALL_DIR"/config/database.php

print_status "File permissions set"

# Create database and user
echo -e "${BLUE}Setting up database...${NC}"

# Create database
mysql -u root -p"$DB_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
print_status "Database '$DB_NAME' created"

# Create database user
mysql -u root -p"$DB_ROOT_PASSWORD" -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';" 2>/dev/null
mysql -u root -p"$DB_ROOT_PASSWORD" -e "GRANT SELECT, INSERT, UPDATE, DELETE ON $DB_NAME.* TO '$DB_USER'@'localhost';" 2>/dev/null
mysql -u root -p"$DB_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;" 2>/dev/null
print_status "Database user '$DB_USER' created with appropriate permissions"

# Run database setup
mysql -u root -p"$DB_ROOT_PASSWORD" "$DB_NAME" < database/production-setup.sql 2>/dev/null
print_status "Database schema and sample data installed"

# Update configuration file
echo -e "${BLUE}Updating configuration...${NC}"
cat > "$INSTALL_DIR/config/database.php" << EOF
<?php

/**
 * Production Database Configuration for Word Builder Game
 * 
 * This file contains production database settings.
 * Ensure proper file permissions (600) are set.
 */

return [
    'host' => 'localhost',
    'database' => '$DB_NAME',
    'username' => '$DB_USER',
    'password' => '$DB_PASSWORD',
    'charset' => 'utf8mb4',
    
    'options' => [
        'persistent' => true,
        'timeout' => 30,
        'ssl_verify' => true
    ],
    
    'environment' => [
        'production' => [
            'debug' => false,
            'log_queries' => false,
            'ssl_required' => true
        ]
    ]
];
EOF

sudo chmod 600 "$INSTALL_DIR/config/database.php"
print_status "Configuration file updated"

# Create logs directory
sudo mkdir -p "$INSTALL_DIR/logs"
sudo chown $WEB_USER:$WEB_USER "$INSTALL_DIR/logs"
sudo chmod 755 "$INSTALL_DIR/logs"
print_status "Logs directory created"

# Test installation
echo -e "${BLUE}Testing installation...${NC}"
cd "$INSTALL_DIR"
if php -f setup/install.php > /dev/null 2>&1; then
    print_status "Installation test passed"
else
    print_warning "Installation test had warnings - check manually"
fi

# Create Apache virtual host configuration (optional)
echo ""
read -p "Create Apache virtual host configuration? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Domain name (e.g., wordbuilder.example.com): " DOMAIN_NAME
    
    cat > "/tmp/wordbuilder.conf" << EOF
<VirtualHost *:80>
    ServerName $DOMAIN_NAME
    DocumentRoot $INSTALL_DIR
    
    <Directory $INSTALL_DIR>
        AllowOverride All
        Require all granted
    </Directory>
    
    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    
    # PHP settings
    php_value upload_max_filesize 10M
    php_value post_max_size 10M
    php_value memory_limit 128M
    
    ErrorLog \${APACHE_LOG_DIR}/wordbuilder_error.log
    CustomLog \${APACHE_LOG_DIR}/wordbuilder_access.log combined
</VirtualHost>
EOF
    
    echo "Apache virtual host configuration created at /tmp/wordbuilder.conf"
    echo "Move it to your Apache sites-available directory and enable it:"
    echo "  sudo mv /tmp/wordbuilder.conf /etc/apache2/sites-available/"
    echo "  sudo a2ensite wordbuilder"
    echo "  sudo systemctl reload apache2"
fi

# Installation complete
echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}INSTALLATION COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo -e "${BLUE}Installation Summary:${NC}"
echo "  Application Directory: $INSTALL_DIR"
echo "  Database Name: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  Web Server User: $WEB_USER"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Configure your web server to serve the application"
echo "2. Set up SSL certificates for production"
echo "3. Configure regular database backups"
echo "4. Test the application by accessing the web interface"
echo "5. Review security settings and firewall configuration"
echo ""
echo -e "${BLUE}Application URLs:${NC}"
echo "  Game Interface: http://your-domain/index.html"
echo "  Teacher Dashboard: http://your-domain/teacher.html"
echo ""
echo -e "${YELLOW}Security Reminders:${NC}"
echo "- Change default passwords"
echo "- Enable SSL/HTTPS in production"
echo "- Set up regular backups"
echo "- Monitor application logs"
echo "- Keep system and dependencies updated"
echo ""