# Security Configuration Guidelines
## Word Builder Game - Production Deployment

This document provides comprehensive security guidelines for deploying the EAL Word Builder Game in production environments.

## 🔒 Database Security

### Database User Permissions
```sql
-- Create dedicated database user with minimal permissions
CREATE USER 'wordbuilder'@'localhost' IDENTIFIED BY 'strong_random_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON word_builder_game.* TO 'wordbuilder'@'localhost';
FLUSH PRIVILEGES;

-- Remove default/test users
DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS 'root'@'%';
```

### Database Configuration
```ini
# MySQL configuration (my.cnf)
[mysqld]
# Bind to localhost only
bind-address = 127.0.0.1

# Enable SSL
ssl-ca = /path/to/ca-cert.pem
ssl-cert = /path/to/server-cert.pem
ssl-key = /path/to/server-key.pem

# Security settings
local-infile = 0
skip-show-database
safe-user-create = 1

# Logging for security monitoring
log-error = /var/log/mysql/error.log
slow-query-log = 1
slow-query-log-file = /var/log/mysql/slow.log
long_query_time = 2
```

### Password Security
- ✅ Use strong, randomly generated passwords (minimum 16 characters)
- ✅ Include uppercase, lowercase, numbers, and special characters
- ✅ Store passwords securely (environment variables, not in code)
- ✅ Rotate passwords regularly (quarterly recommended)

## 🌐 Web Server Security

### Apache Configuration
```apache
# Virtual Host Security Configuration
<VirtualHost *:443>
    ServerName wordbuilder.yourdomain.com
    DocumentRoot /var/www/html/word-builder-game
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    SSLCertificateChainFile /path/to/chain.crt
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
    
    # Hide server information
    ServerTokens Prod
    ServerSignature Off
    
    # Directory Security
    <Directory /var/www/html/word-builder-game>
        AllowOverride None
        Require all granted
        
        # Prevent access to sensitive files
        <FilesMatch "\.(php|inc|conf|sql|md)$">
            <RequireAll>
                Require all denied
            </RequireAll>
        </FilesMatch>
        
        # Allow only specific PHP files
        <FilesMatch "^(index|teacher)\.html$">
            Require all granted
        </FilesMatch>
    </Directory>
    
    # Protect configuration and sensitive directories
    <Directory /var/www/html/word-builder-game/config>
        Require all denied
    </Directory>
    
    <Directory /var/www/html/word-builder-game/classes>
        Require all denied
    </Directory>
    
    <Directory /var/www/html/word-builder-game/logs>
        Require all denied
    </Directory>
    
    # Rate limiting (requires mod_evasive)
    DOSHashTableSize    2048
    DOSPageCount        10
    DOSPageInterval     1
    DOSSiteCount        50
    DOSSiteInterval     1
    DOSBlockingPeriod   600
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName wordbuilder.yourdomain.com
    Redirect permanent / https://wordbuilder.yourdomain.com/
</VirtualHost>
```

### Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name wordbuilder.yourdomain.com;
    root /var/www/html/word-builder-game;
    index index.html;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'" always;
    
    # Hide server information
    server_tokens off;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=general:10m rate=1r/s;
    
    # Main application files
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
    
    # Deny access to sensitive files and directories
    location ~ /\.(ht|git|svn) {
        deny all;
    }
    
    location ~ /(config|classes|logs|database|deployment)/ {
        deny all;
    }
    
    location ~ \.(sql|md|conf|inc)$ {
        deny all;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name wordbuilder.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## 🔐 PHP Security

### PHP Configuration (php.ini)
```ini
# Hide PHP version
expose_php = Off

# Disable dangerous functions
disable_functions = exec,passthru,shell_exec,system,proc_open,popen,curl_exec,curl_multi_exec,parse_ini_file,show_source

# File upload security
file_uploads = On
upload_max_filesize = 10M
post_max_size = 10M
max_file_uploads = 5

# Session security
session.cookie_httponly = 1
session.cookie_secure = 1
session.use_strict_mode = 1
session.cookie_samesite = "Strict"
session.gc_maxlifetime = 1800

# Error handling
display_errors = Off
log_errors = On
error_log = /var/log/php/error.log

# Memory and execution limits
memory_limit = 128M
max_execution_time = 30
max_input_time = 30

# Prevent information disclosure
allow_url_fopen = Off
allow_url_include = Off
```

### Application Security Measures

#### Input Validation
```php
// Example secure input handling
class SecurityValidator {
    public static function validateSessionId($sessionId) {
        // Only allow alphanumeric characters, hyphens, and underscores
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $sessionId)) {
            throw new InvalidArgumentException('Invalid session ID format');
        }
        
        // Limit length
        if (strlen($sessionId) > 255) {
            throw new InvalidArgumentException('Session ID too long');
        }
        
        return $sessionId;
    }
    
    public static function validateLevel($level) {
        $level = filter_var($level, FILTER_VALIDATE_INT);
        if ($level === false || $level < 1 || $level > 10) {
            throw new InvalidArgumentException('Invalid level');
        }
        return $level;
    }
    
    public static function sanitizeStudentName($name) {
        // Remove HTML tags and limit length
        $name = strip_tags(trim($name));
        return substr($name, 0, 100);
    }
}
```

#### SQL Injection Prevention
```php
// Always use prepared statements
class SecureDatabase {
    public function getProgress($sessionId) {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM progress WHERE session_id = ? ORDER BY level"
        );
        $stmt->execute([$sessionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function saveProgress($sessionId, $level, $data) {
        $stmt = $this->pdo->prepare(
            "INSERT INTO progress (session_id, level, words_completed, total_attempts, correct_attempts) 
             VALUES (?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             words_completed = VALUES(words_completed),
             total_attempts = VALUES(total_attempts),
             correct_attempts = VALUES(correct_attempts)"
        );
        
        return $stmt->execute([
            $sessionId,
            $level,
            $data['words_completed'],
            $data['total_attempts'],
            $data['correct_attempts']
        ]);
    }
}
```

## 🛡️ Network Security

### Firewall Configuration (UFW)
```bash
# Basic firewall setup
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if using non-standard)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow MySQL only from localhost
sudo ufw allow from 127.0.0.1 to any port 3306

# Enable firewall
sudo ufw enable
```

### Fail2Ban Configuration
```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[apache-auth]
enabled = true
port = http,https
filter = apache-auth
logpath = /var/log/apache2/error.log

[apache-badbots]
enabled = true
port = http,https
filter = apache-badbots
logpath = /var/log/apache2/access.log

[apache-noscript]
enabled = true
port = http,https
filter = apache-noscript
logpath = /var/log/apache2/access.log

[apache-overflows]
enabled = true
port = http,https
filter = apache-overflows
logpath = /var/log/apache2/access.log
```

## 📊 Monitoring and Logging

### Log Monitoring Setup
```bash
# Install log monitoring tools
sudo apt-get install logwatch fail2ban

# Configure logwatch
sudo nano /etc/logwatch/conf/logwatch.conf
# Set Detail = High
# Set MailTo = admin@yourdomain.com
```

### Security Monitoring Script
```bash
#!/bin/bash
# security-monitor.sh - Daily security check script

LOG_FILE="/var/log/security-check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting security check" >> $LOG_FILE

# Check for failed login attempts
FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | wc -l)
if [ $FAILED_LOGINS -gt 10 ]; then
    echo "[$DATE] WARNING: $FAILED_LOGINS failed login attempts detected" >> $LOG_FILE
fi

# Check for unusual database activity
DB_ERRORS=$(grep "ERROR" /var/log/mysql/error.log | grep $(date '+%Y-%m-%d') | wc -l)
if [ $DB_ERRORS -gt 5 ]; then
    echo "[$DATE] WARNING: $DB_ERRORS database errors detected today" >> $LOG_FILE
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] WARNING: Disk usage at $DISK_USAGE%" >> $LOG_FILE
fi

# Check for suspicious PHP errors
PHP_ERRORS=$(grep "CRITICAL\|ALERT\|EMERGENCY" /var/log/php/error.log | grep $(date '+%Y-%m-%d') | wc -l)
if [ $PHP_ERRORS -gt 0 ]; then
    echo "[$DATE] WARNING: $PHP_ERRORS critical PHP errors detected today" >> $LOG_FILE
fi

echo "[$DATE] Security check completed" >> $LOG_FILE
```

## 🔄 Backup and Recovery

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh - Automated backup script

BACKUP_DIR="/var/backups/wordbuilder"
DATE=$(date '+%Y%m%d_%H%M%S')
DB_NAME="word_builder_game"
APP_DIR="/var/www/html/word-builder-game"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u wordbuilder -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Log backup completion
echo "$(date): Backup completed - db_backup_$DATE.sql.gz, app_backup_$DATE.tar.gz" >> /var/log/backup.log
```

## ✅ Security Checklist

### Pre-Deployment
- [ ] Strong database passwords generated and stored securely
- [ ] Database user permissions limited to necessary operations only
- [ ] SSL certificates obtained and configured
- [ ] Web server security headers configured
- [ ] PHP security settings applied
- [ ] Firewall rules configured
- [ ] Fail2Ban installed and configured

### Post-Deployment
- [ ] Application tested with security scanner (e.g., OWASP ZAP)
- [ ] Log monitoring configured and tested
- [ ] Backup system tested and verified
- [ ] Security monitoring alerts configured
- [ ] Documentation updated with deployment-specific details
- [ ] Team trained on security procedures

### Ongoing Maintenance
- [ ] Regular security updates applied
- [ ] Log files reviewed weekly
- [ ] Backup integrity tested monthly
- [ ] Security scan performed quarterly
- [ ] Password rotation performed quarterly
- [ ] SSL certificates renewed before expiration

## 🚨 Incident Response

### Security Incident Checklist
1. **Immediate Response**
   - Isolate affected systems
   - Preserve evidence (logs, database state)
   - Document timeline of events

2. **Assessment**
   - Determine scope of breach
   - Identify compromised data
   - Assess system integrity

3. **Containment**
   - Change all passwords
   - Update security rules
   - Apply emergency patches

4. **Recovery**
   - Restore from clean backups
   - Verify system integrity
   - Monitor for continued threats

5. **Post-Incident**
   - Update security procedures
   - Conduct lessons learned review
   - Improve monitoring and detection

## 📞 Emergency Contacts

- **System Administrator**: [Your contact information]
- **Database Administrator**: [Your contact information]
- **Security Team**: [Your contact information]
- **Hosting Provider Support**: [Provider contact information]

---

**Note**: This security checklist should be customized based on your specific deployment environment and organizational security policies. Regular security audits and updates to these procedures are essential for maintaining a secure application.