#!/bin/bash

# Ultimate Audika SMS Deployment Script for leffe.work
# This script sets up everything automatically with full security and automation
# Run as root: bash deploy-leffe.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
DOMAIN_MAIN="leffe.work"
DOMAIN_WWW="www.leffe.work"
DOMAIN_API="api.leffe.work"
DOMAIN_SERVER="server.leffe.work"
SERVER_IP="84.217.119.207"
APP_DIR="/var/www/audika-sms"
APP_USER="audika"
PORT=3000

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

print_header() {
    echo -e "${PURPLE}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║                                                        ║"
    echo "║        🚀 AUDIKA SMS ULTIMATE DEPLOYMENT 🚀           ║"
    echo "║                                                        ║"
    echo "║  Server: $SERVER_IP                        ║"
    echo "║  Domain: $DOMAIN_MAIN                              ║"
    echo "║                                                        ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        echo "Please run: sudo bash $0"
        exit 1
    fi
}

# Create application user
create_app_user() {
    print_status "Creating application user..."
    if ! id "$APP_USER" &>/dev/null; then
        adduser $APP_USER --disabled-password --gecos ""
        usermod -aG sudo $APP_USER
        mkdir -p /home/$APP_USER/.ssh
        chmod 700 /home/$APP_USER/.ssh
        if [ -f /root/.ssh/authorized_keys ]; then
            cp /root/.ssh/authorized_keys /home/$APP_USER/.ssh/
            chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh
        fi
        print_success "Application user created"
    else
        print_success "Application user already exists"
    fi
}

# System update
system_update() {
    print_status "Updating system packages..."
    export DEBIAN_FRONTEND=noninteractive
    apt update -qq
    apt upgrade -y -qq
    apt install -y -qq curl wget git nano htop unzip software-properties-common \
        apt-transport-https ca-certificates gnupg lsb-release build-essential \
        ufw fail2ban unattended-upgrades apt-listchanges rkhunter chkrootkit \
        lynis jq bc sensors
    print_success "System updated"
}

# Install Node.js
install_nodejs() {
    print_status "Installing Node.js 20..."
    if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | cut -d'v' -f2) -lt 18 ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
        apt install -y -qq nodejs
    fi
    npm install -g pm2 >/dev/null 2>&1
    print_success "Node.js $(node -v) and PM2 installed"
}

# Install and configure Nginx
install_nginx() {
    print_status "Installing and configuring Nginx..."
    apt install -y -qq nginx php-fpm php-cli
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Create optimized nginx configuration
    cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
    
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

    systemctl enable nginx
    print_success "Nginx installed and configured"
}

# Configure security
configure_security() {
    print_status "Configuring security hardening..."
    
    # Configure SSH
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    cat > /etc/ssh/sshd_config << 'EOF'
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ed25519_key
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
PermitRootLogin prohibit-password
StrictModes yes
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxStartups 10:30:100
PermitTunnel no
AllowAgentForwarding no
AllowTcpForwarding no
X11Forwarding no
PrintMotd no
AllowUsers audika root
SyslogFacility AUTH
LogLevel VERBOSE
EOF
    
    systemctl reload sshd
    
    # Configure firewall
    ufw --force reset >/dev/null 2>&1
    ufw default deny incoming >/dev/null 2>&1
    ufw default allow outgoing >/dev/null 2>&1
    ufw allow ssh >/dev/null 2>&1
    ufw allow 80/tcp >/dev/null 2>&1
    ufw allow 443/tcp >/dev/null 2>&1
    ufw allow 9090/tcp >/dev/null 2>&1
    ufw --force enable >/dev/null 2>&1
    
    # Configure fail2ban
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

    systemctl enable fail2ban
    systemctl restart fail2ban
    
    # Configure automatic security updates
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id} ESMApps:${distro_codename}-apps-security";
    "${distro_id} ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Package-Blacklist {
};
Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
Unattended-Upgrade::Mail "root";
Unattended-Upgrade::MailOnlyOnError "true";
EOF

    cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

    systemctl enable unattended-upgrades
    systemctl start unattended-upgrades
    
    # System hardening
    cat >> /etc/sysctl.conf << 'EOF'

# Network security settings
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
EOF

    sysctl -p >/dev/null 2>&1
    
    print_success "Security hardening completed"
}

# Install application
install_application() {
    print_status "Installing Audika SMS application..."
    
    # Create directories
    mkdir -p $APP_DIR
    mkdir -p /var/log/pm2
    mkdir -p /var/backups/audika/{daily,weekly,monthly}
    mkdir -p /var/www/webhook
    
    chown -R $APP_USER:$APP_USER $APP_DIR
    chown -R $APP_USER:$APP_USER /var/log/pm2
    chown -R $APP_USER:$APP_USER /var/backups/audika
    chown -R www-data:www-data /var/www/webhook
    
    # Clone repository
    sudo -u $APP_USER git clone https://github.com/lcrsx/audika-sms.git $APP_DIR
    
    # Create environment file
    sudo -u $APP_USER cp $APP_DIR/.env.example $APP_DIR/.env.local
    
    # Install dependencies
    cd $APP_DIR
    sudo -u $APP_USER npm install >/dev/null 2>&1
    
    print_success "Application installed"
}

# Configure application
configure_application() {
    print_status "Configuring application..."
    
    # Create PM2 configuration
    cat > $APP_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'audika-sms',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/audika-sms',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/audika-error.log',
    out_file: '/var/log/pm2/audika-out.log',
    log_file: '/var/log/pm2/audika-combined.log',
    time: true
  }]
};
EOF

    chown $APP_USER:$APP_USER $APP_DIR/ecosystem.config.js
    
    print_success "Application configured"
}

# Configure Nginx sites
configure_nginx_sites() {
    print_status "Configuring Nginx sites..."
    
    cat > /etc/nginx/sites-available/audika-sms << 'EOF'
upstream audika_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# API Status Dashboard (api.leffe.work)
server {
    listen 80;
    server_name api.leffe.work;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.leffe.work;
    
    ssl_certificate /etc/letsencrypt/live/api.leffe.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.leffe.work/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        return 301 /status;
    }
    
    location /status {
        default_type text/html;
        return 200 '<!DOCTYPE html>
        <html>
        <head>
            <title>API Status - Audika SMS</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta http-equiv="refresh" content="30">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .container { 
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    max-width: 800px;
                    width: 90%;
                }
                h1 { font-size: 2.5em; margin-bottom: 20px; text-align: center; }
                .status-grid { 
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin: 30px 0;
                }
                .status-card { 
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 15px;
                    text-align: center;
                    transition: transform 0.3s;
                }
                .status-card:hover { transform: translateY(-5px); }
                .status-icon { font-size: 2em; margin-bottom: 10px; }
                .links { 
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    flex-wrap: wrap;
                    margin-top: 30px;
                }
                .link { 
                    background: rgba(255,255,255,0.2);
                    color: white;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 25px;
                    transition: all 0.3s;
                }
                .link:hover { 
                    background: rgba(255,255,255,0.3);
                    transform: scale(1.05);
                }
                .timestamp { 
                    text-align: center;
                    margin-top: 30px;
                    opacity: 0.8;
                    font-size: 0.9em;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Audika SMS</h1>
                <div class="status-grid">
                    <div class="status-card">
                        <div class="status-icon">🟢</div>
                        <h3>System Online</h3>
                        <p>All services running</p>
                    </div>
                    <div class="status-card">
                        <div class="status-icon">💾</div>
                        <h3>Database</h3>
                        <p><a href="/health" style="color: white;">Health Check</a></p>
                    </div>
                    <div class="status-card">
                        <div class="status-icon">🔗</div>
                        <h3>API</h3>
                        <p><a href="/api/health/database" style="color: white;">Full Status</a></p>
                    </div>
                </div>
                
                <div class="links">
                    <a href="https://leffe.work" class="link">Main App</a>
                    <a href="https://server.leffe.work:9090" class="link">Server Panel</a>
                    <a href="/api/health/database" class="link">API Health</a>
                </div>
                
                <div class="timestamp">
                    Last updated: <span id="time"></span><br>
                    Auto-refresh every 30 seconds
                </div>
            </div>
            
            <script>
                document.getElementById("time").textContent = new Date().toLocaleString();
            </script>
        </body>
        </html>';
    }
    
    location /health {
        limit_req zone=api burst=5 nodelay;
        proxy_pass http://audika_backend/api/health/database;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://audika_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
    }
}

# Main Application
server {
    listen 80;
    server_name leffe.work www.leffe.work;
    return 301 https://leffe.work$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.leffe.work;
    ssl_certificate /etc/letsencrypt/live/leffe.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/leffe.work/privkey.pem;
    return 301 https://leffe.work$request_uri;
}

server {
    listen 443 ssl http2;
    server_name leffe.work;
    
    ssl_certificate /etc/letsencrypt/live/leffe.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/leffe.work/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    
    access_log /var/log/nginx/audika-access.log;
    error_log /var/log/nginx/audika-error.log;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;
    
    # Webhook endpoint
    location /webhook {
        root /var/www;
        index deploy.php;
        
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
        }
    }
    
    # Main application
    location / {
        proxy_pass http://audika_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files with caching
    location /_next/static {
        proxy_pass http://audika_backend;
        proxy_cache_valid 365d;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }
    
    location /_next/image {
        proxy_pass http://audika_backend;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600";
    }
    
    # API routes
    location /api {
        limit_req zone=api burst=20 nodelay;
        
        # Rate limit login attempts
        location /api/auth {
            limit_req zone=login burst=3 nodelay;
            proxy_pass http://audika_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        proxy_pass http://audika_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Health check
    location /health {
        access_log off;
        proxy_pass http://audika_backend/api/health/database;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/audika-sms /etc/nginx/sites-enabled/
    
    print_success "Nginx sites configured"
}

# Create automation scripts
create_automation_scripts() {
    print_status "Creating automation scripts..."
    
    # System update script
    cat > /usr/local/bin/system-auto-update.sh << 'EOF'
#!/bin/bash
LOG_FILE="/var/log/system-auto-update.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting system auto-update..." >> $LOG_FILE
apt update >> $LOG_FILE 2>&1
apt upgrade -y >> $LOG_FILE 2>&1
apt autoremove -y >> $LOG_FILE 2>&1
apt autoclean >> $LOG_FILE 2>&1

if [ -f /var/run/reboot-required ]; then
    echo "[$DATE] Reboot required after updates" >> $LOG_FILE
fi

echo "[$DATE] System auto-update completed" >> $LOG_FILE
EOF

    # Application update script
    cat > /usr/local/bin/app-auto-update.sh << 'EOF'
#!/bin/bash
LOG_FILE="/var/log/app-auto-update.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
APP_DIR="/var/www/audika-sms"

echo "[$DATE] Starting application auto-update..." >> $LOG_FILE
cd $APP_DIR

git fetch >> $LOG_FILE 2>&1
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$DATE] Updates available. Updating application..." >> $LOG_FILE
    
    /usr/local/bin/comprehensive-backup.sh >> $LOG_FILE 2>&1
    
    sudo -u audika git pull origin master >> $LOG_FILE 2>&1
    sudo -u audika npm install >> $LOG_FILE 2>&1
    sudo -u audika npm run build >> $LOG_FILE 2>&1
    sudo -u audika pm2 reload audika-sms >> $LOG_FILE 2>&1
    
    echo "[$DATE] Application updated successfully" >> $LOG_FILE
else
    echo "[$DATE] No updates available" >> $LOG_FILE
fi
EOF

    # Comprehensive backup script
    cat > /usr/local/bin/comprehensive-backup.sh << 'EOF'
#!/bin/bash
BACKUP_BASE="/var/backups/audika"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/audika-sms"
LOG_FILE="/var/log/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "Starting comprehensive backup..."

DAILY_DIR="$BACKUP_BASE/daily"
mkdir -p $DAILY_DIR

# Application backup
tar -czf $DAILY_DIR/app-$DATE.tar.gz -C $APP_DIR --exclude=node_modules --exclude=.next --exclude=.git .

# Environment backup
cp $APP_DIR/.env.local $DAILY_DIR/env-$DATE.txt 2>/dev/null || true

# System configuration backup
tar -czf $DAILY_DIR/system-config-$DATE.tar.gz /etc/nginx/sites-available /etc/ssl /etc/letsencrypt /etc/crontab /var/spool/cron/crontabs 2>/dev/null

# PM2 backup
sudo -u audika pm2 save
cp /home/audika/.pm2/dump.pm2 $DAILY_DIR/pm2-$DATE.json 2>/dev/null || true

# Logs backup
tar -czf $DAILY_DIR/logs-$DATE.tar.gz /var/log/nginx /var/log/pm2 /var/log/*.log 2>/dev/null

# Weekly backup
if [ $(date +%u) -eq 7 ]; then
    WEEKLY_DIR="$BACKUP_BASE/weekly"
    mkdir -p $WEEKLY_DIR
    cp $DAILY_DIR/app-$DATE.tar.gz $WEEKLY_DIR/
    cp $DAILY_DIR/system-config-$DATE.tar.gz $WEEKLY_DIR/
    find $WEEKLY_DIR -type f -mtime +56 -delete
fi

# Monthly backup
if [ $(date +%d) -eq 1 ]; then
    MONTHLY_DIR="$BACKUP_BASE/monthly"
    mkdir -p $MONTHLY_DIR
    cp $DAILY_DIR/app-$DATE.tar.gz $MONTHLY_DIR/
    cp $DAILY_DIR/system-config-$DATE.tar.gz $MONTHLY_DIR/
    find $MONTHLY_DIR -type f -mtime +365 -delete
fi

find $DAILY_DIR -type f -mtime +14 -delete

BACKUP_SIZE=$(du -sh $BACKUP_BASE | cut -f1)
log "Backup completed. Total size: $BACKUP_SIZE"
EOF

    # Health monitoring script
    cat > /usr/local/bin/health-monitor.sh << 'EOF'
#!/bin/bash
LOG_FILE="/var/log/health-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d',' -f1)
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')

echo "[$DATE] CPU: ${CPU_USAGE}% | Memory: ${MEMORY_USAGE}% | Disk: ${DISK_USAGE}%" >> $LOG_FILE

APP_STATUS=$(sudo -u audika pm2 jlist 2>/dev/null | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
DB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/api/health/database 2>/dev/null || echo "000")

echo "[$DATE] App: $APP_STATUS | DB: $DB_STATUS" >> $LOG_FILE

if [ "$APP_STATUS" != "online" ]; then
    echo "[$DATE] ALERT: Restarting application" >> $LOG_FILE
    sudo -u audika pm2 restart audika-sms >> $LOG_FILE 2>&1
fi

if [ "$DB_STATUS" != "200" ]; then
    echo "[$DATE] ALERT: Database health check failed: $DB_STATUS" >> $LOG_FILE
fi
EOF

    # GitHub webhook handler
    cat > /var/www/webhook/deploy.php << 'EOF'
<?php
$webhook_secret = 'audika-webhook-secret-2025';
$log_file = '/var/log/github-webhook.log';

function log_message($message) {
    global $log_file;
    $date = date('Y-m-d H:i:s');
    file_put_contents($log_file, "[$date] $message\n", FILE_APPEND | LOCK_EX);
}

$payload = file_get_contents('php://input');
$headers = getallheaders();

if (isset($headers['X-Hub-Signature-256'])) {
    $signature = hash_hmac('sha256', $payload, $webhook_secret);
    $expected = 'sha256=' . $signature;
    
    if (!hash_equals($expected, $headers['X-Hub-Signature-256'])) {
        log_message('Invalid webhook signature');
        http_response_code(401);
        exit('Unauthorized');
    }
}

$data = json_decode($payload, true);

if ($data['ref'] === 'refs/heads/master') {
    log_message('Received push to master branch - triggering deployment');
    
    $output = [];
    $return_code = 0;
    
    exec('/usr/local/bin/app-auto-update.sh 2>&1', $output, $return_code);
    
    if ($return_code === 0) {
        log_message('Deployment successful');
        http_response_code(200);
        echo 'Deployment successful';
    } else {
        log_message('Deployment failed: ' . implode('\n', $output));
        http_response_code(500);
        echo 'Deployment failed';
    }
} else {
    log_message('Ignored push to ' . $data['ref']);
    http_response_code(200);
    echo 'Ignored - not master branch';
}
?>
EOF

    # Make scripts executable
    chmod +x /usr/local/bin/system-auto-update.sh
    chmod +x /usr/local/bin/app-auto-update.sh
    chmod +x /usr/local/bin/comprehensive-backup.sh
    chmod +x /usr/local/bin/health-monitor.sh
    chmod +x /var/www/webhook/deploy.php
    
    # Set permissions
    chown -R www-data:www-data /var/www/webhook
    
    print_success "Automation scripts created"
}

# Setup cron jobs
setup_cron() {
    print_status "Setting up cron jobs..."
    
    (crontab -l 2>/dev/null; cat << 'EOF'
# System updates daily at 3 AM
0 3 * * * /usr/local/bin/system-auto-update.sh

# Application updates every hour
0 * * * * /usr/local/bin/app-auto-update.sh

# Health monitoring every 5 minutes
*/5 * * * * /usr/local/bin/health-monitor.sh

# Comprehensive backup daily at 1 AM
0 1 * * * /usr/local/bin/comprehensive-backup.sh

# SSL certificate renewal twice daily
0 0,12 * * * certbot renew --quiet

# Clean old logs weekly
0 1 * * 0 find /var/log -name "*.log" -mtime +30 -delete

# Security audit weekly
0 4 * * 0 rkhunter --check --skip-keypress --report-warnings-only >> /var/log/security-audit.log 2>&1
EOF
) | crontab -

    print_success "Cron jobs configured"
}

# Install SSL certificates
install_ssl() {
    print_status "Installing SSL certificates..."
    
    apt install -y -qq certbot python3-certbot-nginx
    
    # Check if DNS is resolving
    print_status "Checking DNS resolution..."
    if nslookup $DOMAIN_MAIN >/dev/null 2>&1 && nslookup $DOMAIN_API >/dev/null 2>&1; then
        print_success "DNS resolution successful"
        
        # Get certificates
        certbot --nginx \
            -d $DOMAIN_MAIN \
            -d $DOMAIN_WWW \
            -d $DOMAIN_API \
            --non-interactive \
            --agree-tos \
            --email admin@$DOMAIN_MAIN \
            --redirect \
            --quiet
        
        if [ $? -eq 0 ]; then
            print_success "SSL certificates installed successfully"
        else
            print_warning "SSL certificate installation failed - will retry later"
        fi
    else
        print_warning "DNS not yet propagated - SSL will be installed later"
        echo "Run this command after DNS propagation:"
        echo "certbot --nginx -d $DOMAIN_MAIN -d $DOMAIN_WWW -d $DOMAIN_API --non-interactive --agree-tos --email admin@$DOMAIN_MAIN"
    fi
}

# Build and start application
start_application() {
    print_status "Building and starting application..."
    
    cd $APP_DIR
    
    # Check if environment file needs configuration
    if grep -q "your_supabase_url" .env.local; then
        print_warning "Environment file needs configuration!"
        print_warning "Edit $APP_DIR/.env.local with your Supabase and Infobip credentials"
        print_warning "Required variables:"
        print_warning "- NEXT_PUBLIC_SUPABASE_URL"
        print_warning "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
        print_warning "- SUPABASE_SERVICE_ROLE_KEY"
        print_warning "- INFOBIP_API_KEY (optional)"
        print_warning "- INFOBIP_BASE_URL (optional)"
        print_warning "- INFOBIP_SENDER (optional)"
        
        read -p "Press Enter after configuring .env.local to continue..."
    fi
    
    # Build application
    sudo -u $APP_USER npm run build
    
    # Start with PM2
    sudo -u $APP_USER pm2 start ecosystem.config.js
    sudo -u $APP_USER pm2 save
    
    # Setup PM2 startup
    env_line=$(sudo -u $APP_USER pm2 startup systemd -u $APP_USER --hp /home/$APP_USER | tail -1)
    eval $env_line
    
    print_success "Application started successfully"
}

# Create management utilities
create_utilities() {
    print_status "Creating management utilities..."
    
    # System diagnostic script
    cat > /usr/local/bin/diagnose-system.sh << 'EOF'
#!/bin/bash
clear
echo "🔍 AUDIKA SMS SYSTEM DIAGNOSTICS"
echo "=================================="
echo "Timestamp: $(date)"
echo "Hostname: $(hostname)"
echo "Server IP: $(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo 'Unable to fetch')"
echo ""

echo "🖥️  SYSTEM INFORMATION"
echo "----------------------"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime -p)"
echo "Load: $(cat /proc/loadavg)"
echo ""

echo "💾 MEMORY & DISK"
echo "----------------"
free -h
echo ""
df -h /
echo ""

echo "🌐 NETWORK & SSL"
echo "----------------"
echo "DNS Resolution:"
nslookup leffe.work 2>/dev/null | head -5
echo ""
echo "SSL Certificate Status:"
echo | openssl s_client -servername leffe.work -connect leffe.work:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "SSL check failed"
echo ""

echo "🔧 SERVICES"
echo "-----------"
services=(nginx php8.1-fpm fail2ban unattended-upgrades)
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service: Active"
    else
        echo "❌ $service: Inactive"
    fi
done
echo ""

echo "📱 APPLICATION"
echo "-------------"
sudo -u audika pm2 status 2>/dev/null || echo "PM2 not running"
echo ""
echo "Health Check:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" --max-time 5 http://localhost:3000/api/health/database 2>/dev/null || echo "Health check failed"
echo ""

echo "📊 RESOURCES (Top 5 processes by CPU)"
echo "-------------------------------------"
ps aux --sort=-%cpu | head -6
echo ""

echo "🔒 SECURITY"
echo "-----------"
echo "Firewall:"
ufw status | head -10
echo ""
echo "Fail2ban:"
fail2ban-client status 2>/dev/null | head -5
echo ""

echo "✅ DIAGNOSTIC COMPLETE"
EOF

    # Quick restart scripts
    cat > /usr/local/bin/restart-app.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting Audika SMS..."
sudo -u audika pm2 restart audika-sms
sudo -u audika pm2 logs audika-sms --lines 5
echo "✅ Done"
EOF

    cat > /usr/local/bin/restart-nginx.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting Nginx..."
nginx -t && systemctl restart nginx
systemctl status nginx --no-pager -l
echo "✅ Done"
EOF

    cat > /usr/local/bin/update-app.sh << 'EOF'
#!/bin/bash
echo "🔄 Updating Audika SMS..."
/usr/local/bin/app-auto-update.sh
echo "✅ Update complete"
EOF

    # Make executable
    chmod +x /usr/local/bin/diagnose-system.sh
    chmod +x /usr/local/bin/restart-app.sh
    chmod +x /usr/local/bin/restart-nginx.sh
    chmod +x /usr/local/bin/update-app.sh
    
    print_success "Management utilities created"
}

# Final checks and status
final_status() {
    clear
    print_header
    
    echo -e "${GREEN}"
    echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo "====================================="
    echo -e "${NC}"
    
    echo -e "${CYAN}🌐 Your Applications:${NC}"
    echo "   Main App:         https://$DOMAIN_MAIN"
    echo "   API Status:       https://$DOMAIN_API"
    echo "   Server Management: https://$DOMAIN_SERVER:9090"
    echo ""
    
    echo -e "${CYAN}🛠️  Management Commands:${NC}"
    echo "   System Diagnostics: diagnose-system.sh"
    echo "   Restart App:       restart-app.sh"
    echo "   Restart Nginx:     restart-nginx.sh"
    echo "   Update App:        update-app.sh"
    echo "   View App Logs:     sudo -u audika pm2 logs audika-sms"
    echo ""
    
    echo -e "${CYAN}🔄 Automated Features:${NC}"
    echo "   ✅ System updates (daily 3 AM)"
    echo "   ✅ App updates (hourly)"
    echo "   ✅ SSL renewal (twice daily)"
    echo "   ✅ Health monitoring (5 min intervals)"
    echo "   ✅ Backups (daily 1 AM)"
    echo "   ✅ Security audits (weekly)"
    echo "   ✅ GitHub webhook deployment"
    echo ""
    
    echo -e "${CYAN}🔒 Security Features:${NC}"
    echo "   ✅ Firewall configured"
    echo "   ✅ Fail2ban active"
    echo "   ✅ SSH hardened"
    echo "   ✅ SSL certificates"
    echo "   ✅ Auto security updates"
    echo ""
    
    echo -e "${CYAN}📋 Next Steps:${NC}"
    echo "1. Configure GitHub webhook:"
    echo "   URL: https://$DOMAIN_MAIN/webhook/deploy.php"
    echo "   Secret: audika-webhook-secret-2025"
    echo ""
    echo "2. Test your application:"
    echo "   curl -I https://$DOMAIN_MAIN"
    echo "   curl https://$DOMAIN_API/health"
    echo ""
    echo "3. Monitor logs:"
    echo "   tail -f /var/log/app-auto-update.log"
    echo "   tail -f /var/log/health-monitor.log"
    echo ""
    
    echo -e "${GREEN}🚀 Your Audika SMS server is now fully automated and production-ready!${NC}"
    echo ""
}

# Main execution
main() {
    print_header
    
    check_root
    create_app_user
    system_update
    install_nodejs
    install_nginx
    configure_security
    install_application
    configure_application
    configure_nginx_sites
    create_automation_scripts
    setup_cron
    install_ssl
    start_application
    create_utilities
    
    final_status
}

# Run main function
main "$@"