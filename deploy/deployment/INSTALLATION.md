# Installation Guide
## EAL Word Builder Game - Production Deployment

This guide provides step-by-step instructions for deploying the EAL Word Builder Game in production environments.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Web Server**: Apache 2.4+ or Nginx 1.18+
- **PHP**: 8.0+ with PDO MySQL extension
- **Database**: MySQL 8.0+ or MariaDB 10.5+
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: Minimum 1GB free space
- **SSL Certificate**: Required for production deployment

### Required PHP Extensions
```bash
# Check installed extensions
php -m | grep -E "(pdo|mysql|json|mbstring|openssl)"

# Install missing extensions (Ubuntu/Debian)
sudo apt-get install php-mysql php-json php-mbstring php-openssl

# Install missing extensions (CentOS/RHEL)
sudo yum install php-pdo php-mysql php-json php-mbstring php-openssl
```

## 🚀 Quick Installation (Automated)

### Option 1: Automated Installation Script
```bash
# Download and run the installation script
cd /tmp
wget https://github.com/your-repo/word-builder-game/archive/main.zip
unzip main.zip
cd word-builder-game-main/deployment
chmod +x install.sh
sudo ./install.sh
```

The automated script will:
- Check system requirements
- Create database and user
- Copy application files
- Set proper permissions
- Configure basic security settings
- Test the installation

## 🔧 Manual Installation

### Step 1: Download Application Files
```bash
# Create application directory
sudo mkdir -p /var/www/html/word-builder-game
cd /var/www/html/word-builder-game

# Download application files (replace with your actual download method)
wget https://github.com/your-repo/word-builder-game/archive/main.zip
unzip main.zip
mv word-builder-game-main/* .
rm -rf word-builder-game-main main.zip
```

### Step 2: Set File Permissions
```bash
# Set ownership to web server user
sudo chown -R www-data:www-data /var/www/html/word-builder-game

# Set directory permissions
sudo find /var/www/html/word-builder-game -type d -exec chmod 755 {} \;

# Set file permissions
sudo find /var/www/html/word-builder-game -type f -exec chmod 644 {} \;

# Secure configuration files
sudo chmod 600 /var/www/html/word-builder-game/config/database.php

# Create logs directory
sudo mkdir -p /var/www/html/word-builder-game/logs
sudo chown www-data:www-data /var/www/html/word-builder-game/logs
sudo chmod 755 /var/www/html/word-builder-game/logs
```

### Step 3: Database Setup

#### Create Database and User
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database
CREATE DATABASE word_builder_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user
CREATE USER 'wordbuilder'@'localhost' IDENTIFIED BY 'your_secure_password_here';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON word_builder_game.* TO 'wordbuilder'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

#### Import Database Schema
```bash
# Import the production database schema
mysql -u wordbuilder -p word_builder_game < /var/www/html/word-builder-game/deployment/database/production-setup.sql
```

### Step 4: Configure Application

#### Database Configuration
```bash
# Copy and edit database configuration
cd /var/www/html/word-builder-game
sudo cp deployment/config/environment.example.php config/environment.php
sudo nano config/environment.php
```

Update the database credentials in `config/environment.php`:
```php
// Production environment settings
define('DB_HOST', 'localhost');
define('DB_NAME', 'word_builder_game');
define('DB_USER', 'wordbuilder');
define('DB_PASS', 'your_secure_password_here');
```

#### Environment Configuration
```bash
# Set proper permissions for configuration file
sudo chmod 600 config/environment.php
sudo chown www-data:www-data config/environment.php
```

### Step 5: Web Server Configuration

#### Apache Configuration
```bash
# Create virtual host configuration
sudo nano /etc/apache2/sites-available/wordbuilder.conf
```

Add the following configuration:
```apache
<VirtualHost *:80>
    ServerName wordbuilder.yourdomain.com
    DocumentRoot /var/www/html/word-builder-game
    
    # Redirect to HTTPS
    Redirect permanent / https://wordbuilder.yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName wordbuilder.yourdomain.com
    DocumentRoot /var/www/html/word-builder-game
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key
    SSLCertificateChainFile /path/to/your/chain.crt
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    
    # Directory Configuration
    <Directory /var/www/html/word-builder-game>
        AllowOverride None
        Require all granted
        
        # Protect sensitive files
        <FilesMatch "\.(sql|md|conf|inc)$">
            Require all denied
        </FilesMatch>
    </Directory>
    
    # Protect sensitive directories
    <Directory /var/www/html/word-builder-game/config>
        Require all denied
    </Directory>
    
    <Directory /var/www/html/word-builder-game/classes>
        Require all denied
    </Directory>
    
    <Directory /var/www/html/word-builder-game/logs>
        Require all denied
    </Directory>
    
    # Error and Access Logs
    ErrorLog ${APACHE_LOG_DIR}/wordbuilder_error.log
    CustomLog ${APACHE_LOG_DIR}/wordbuilder_access.log combined
</VirtualHost>
```

Enable the site:
```bash
# Enable required Apache modules
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod rewrite

# Enable the site
sudo a2ensite wordbuilder.conf

# Disable default site (optional)
sudo a2dissite 000-default

# Test configuration and restart
sudo apache2ctl configtest
sudo systemctl restart apache2
```

#### Nginx Configuration
```bash
# Create server block configuration
sudo nano /etc/nginx/sites-available/wordbuilder
```

Add the following configuration:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name wordbuilder.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    server_name wordbuilder.yourdomain.com;
    root /var/www/html/word-builder-game;
    index index.html;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=general:10m rate=1r/s;
    
    # Main application
    location / {
        limit_req zone=general burst=5 nodelay;
        try_files $uri $uri/ =404;
    }
    
    # API endpoints
    location /api/ {
        limit_req zone=api burst=3 nodelay;
        try_files $uri $uri/ /api/index.php?$query_string;
        
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
        }
    }
    
    # Deny access to sensitive files
    location ~ /\.(ht|git|svn) {
        deny all;
    }
    
    location ~ /(config|classes|logs|database|deployment)/ {
        deny all;
    }
    
    location ~ \.(sql|md|conf|inc)$ {
        deny all;
    }
    
    # Logging
    access_log /var/log/nginx/wordbuilder_access.log;
    error_log /var/log/nginx/wordbuilder_error.log;
}
```

Enable the site:
```bash
# Test configuration
sudo nginx -t

# Enable the site
sudo ln -s /etc/nginx/sites-available/wordbuilder /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Restart Nginx
sudo systemctl restart nginx
```

### Step 6: SSL Certificate Setup

#### Using Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-apache  # For Apache
# OR
sudo apt-get install certbot python3-certbot-nginx   # For Nginx

# Obtain certificate
sudo certbot --apache -d wordbuilder.yourdomain.com  # For Apache
# OR
sudo certbot --nginx -d wordbuilder.yourdomain.com   # For Nginx

# Test automatic renewal
sudo certbot renew --dry-run
```

#### Using Custom SSL Certificate
```bash
# Copy your certificate files to appropriate locations
sudo cp your-certificate.crt /etc/ssl/certs/wordbuilder.crt
sudo cp your-private.key /etc/ssl/private/wordbuilder.key
sudo cp your-chain.crt /etc/ssl/certs/wordbuilder-chain.crt

# Set proper permissions
sudo chmod 644 /etc/ssl/certs/wordbuilder.crt
sudo chmod 600 /etc/ssl/private/wordbuilder.key
sudo chmod 644 /etc/ssl/certs/wordbuilder-chain.crt
```

### Step 7: Security Configuration

#### Firewall Setup
```bash
# Install and configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Apache Full'  # For Apache
# OR
sudo ufw allow 'Nginx Full'   # For Nginx
sudo ufw enable
```

#### Fail2Ban Setup
```bash
# Install Fail2Ban
sudo apt-get install fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo nano /etc/fail2ban/jail.local

# Add Apache/Nginx protection
[apache-auth]
enabled = true
port = http,https
filter = apache-auth
logpath = /var/log/apache2/error.log

# Start and enable Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### Step 8: Testing Installation

#### Test Database Connection
```bash
cd /var/www/html/word-builder-game
php -r "
require_once 'classes/Database.php';
try {
    \$db = Database::getInstance();
    echo 'Database connection: SUCCESS\n';
} catch (Exception \$e) {
    echo 'Database connection: FAILED - ' . \$e->getMessage() . '\n';
}
"
```

#### Test Web Application
```bash
# Test basic connectivity
curl -I https://wordbuilder.yourdomain.com

# Test API endpoints
curl -X GET https://wordbuilder.yourdomain.com/api/levels
curl -X GET https://wordbuilder.yourdomain.com/api/words/1
```

#### Run Installation Verification
```bash
cd /var/www/html/word-builder-game
php setup/install.php
```

## 🔧 Configuration Options

### Environment Variables
Create a `.env` file for environment-specific settings:
```bash
# Database Configuration
DB_HOST=localhost
DB_NAME=word_builder_game
DB_USER=wordbuilder
DB_PASS=your_secure_password

# Application Settings
APP_ENV=production
DEBUG_MODE=false
LOG_LEVEL=error

# Security Settings
SSL_REQUIRED=true
SESSION_TIMEOUT=1800
```

### Feature Flags
Enable or disable features in `config/environment.php`:
```php
// Feature toggles
define('ENABLE_TEACHER_DASHBOARD', true);
define('ENABLE_PROGRESS_ANALYTICS', true);
define('ENABLE_AUDIO_FEATURES', true);
define('ENABLE_OFFLINE_MODE', true);
```

## 📊 Monitoring and Maintenance

### Log Monitoring
```bash
# Monitor application logs
sudo tail -f /var/www/html/word-builder-game/logs/error.log

# Monitor web server logs
sudo tail -f /var/log/apache2/wordbuilder_error.log  # Apache
sudo tail -f /var/log/nginx/wordbuilder_error.log    # Nginx

# Monitor database logs
sudo tail -f /var/log/mysql/error.log
```

### Backup Setup
```bash
# Create backup script
sudo nano /usr/local/bin/wordbuilder-backup.sh

# Make executable
sudo chmod +x /usr/local/bin/wordbuilder-backup.sh

# Add to crontab for daily backups
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/wordbuilder-backup.sh
```

### Performance Monitoring
```bash
# Install monitoring tools
sudo apt-get install htop iotop nethogs

# Monitor system resources
htop
iotop
nethogs
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check MySQL service
sudo systemctl status mysql

# Check database credentials
mysql -u wordbuilder -p word_builder_game

# Check PHP PDO extension
php -m | grep pdo
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/html/word-builder-game
sudo chmod -R 755 /var/www/html/word-builder-game
sudo chmod 600 /var/www/html/word-builder-game/config/database.php
```

#### SSL Certificate Issues
```bash
# Test SSL certificate
openssl s_client -connect wordbuilder.yourdomain.com:443

# Check certificate expiration
openssl x509 -in /etc/ssl/certs/wordbuilder.crt -text -noout | grep "Not After"
```

#### Web Server Issues
```bash
# Check Apache status and configuration
sudo systemctl status apache2
sudo apache2ctl configtest

# Check Nginx status and configuration
sudo systemctl status nginx
sudo nginx -t
```

### Log Analysis
```bash
# Check for errors in application logs
grep -i error /var/www/html/word-builder-game/logs/*.log

# Check for failed requests
grep -i "404\|500\|403" /var/log/apache2/wordbuilder_access.log

# Check for security issues
grep -i "attack\|injection\|malicious" /var/log/apache2/wordbuilder_error.log
```

## 📞 Support

### Getting Help
- **Documentation**: Check the README.md file for additional information
- **Issues**: Report bugs and issues on the project repository
- **Security**: Report security issues privately to the development team

### Maintenance Schedule
- **Daily**: Monitor logs and system resources
- **Weekly**: Review security logs and failed login attempts
- **Monthly**: Update system packages and security patches
- **Quarterly**: Review and rotate passwords, update SSL certificates

---

**Note**: This installation guide should be adapted to your specific environment and requirements. Always test the installation in a staging environment before deploying to production.