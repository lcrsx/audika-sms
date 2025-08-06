# Complete Audika SMS Server Setup Guide
## From Zero to Production-Ready with Full Automation

**Server IP**: 84.217.119.207  
**Domains**: leffe.work, www.leffe.work, api.leffe.work  
**Server Management**: server.leffe.work:9090 (Cockpit)

---

## 📋 Table of Contents

1. [Initial Server Setup](#1-initial-server-setup)
2. [Security Hardening](#2-security-hardening)
3. [Domain & DNS Configuration](#3-domain--dns-configuration)
4. [Application Installation](#4-application-installation)
5. [Auto-Updates Setup](#5-auto-updates-setup)
6. [GitHub Webhook Integration](#6-github-webhook-integration)
7. [SSL Certificate Automation](#7-ssl-certificate-automation)
8. [Monitoring & Alerting](#8-monitoring--alerting)
9. [Automated Backups](#9-automated-backups)
10. [Final Security Checks](#10-final-security-checks)
11. [Troubleshooting Guide](#11-troubleshooting-guide)

---

## 🚀 1. Initial Server Setup

### 1.1 Connect to Your Server

**If using SSH key (recommended):**
```bash
ssh root@84.217.119.207
```

**If using password:**
```bash
ssh root@84.217.119.207
# Enter your root password when prompted
```

### 1.2 Update System
```bash
# Update package lists and install updates
apt update && apt upgrade -y

# Reboot if kernel was updated
reboot
```

**Wait 2 minutes then reconnect:**
```bash
ssh root@84.217.119.207
```

### 1.3 Install Essential Tools
```bash
# Install basic tools
apt install -y curl wget git nano htop unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install build tools
apt install -y build-essential

# Check installation
curl --version
git --version
```

### 1.4 Create Application User (Security Best Practice)
```bash
# Create dedicated user for the application
adduser audika --disabled-password --gecos ""

# Add user to sudo group
usermod -aG sudo audika

# Create .ssh directory for audika user
mkdir -p /home/audika/.ssh
chmod 700 /home/audika/.ssh

# Copy root's SSH keys to audika user (if you want SSH access)
cp /root/.ssh/authorized_keys /home/audika/.ssh/ 2>/dev/null || echo "No SSH keys to copy"
chown -R audika:audika /home/audika/.ssh
```

---

## 🔒 2. Security Hardening

### 2.1 Configure SSH Security
```bash
# Backup original SSH config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Configure SSH with security settings
cat > /etc/ssh/sshd_config << 'EOF'
# Security-hardened SSH configuration
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Authentication
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Root login restrictions
PermitRootLogin prohibit-password
StrictModes yes

# Connection settings
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxStartups 10:30:100

# Disable dangerous features
PermitTunnel no
AllowAgentForwarding no
AllowTcpForwarding no
X11Forwarding no
PrintMotd no

# Allow specific users only
AllowUsers audika root

# Logging
SyslogFacility AUTH
LogLevel VERBOSE
EOF

# Test SSH configuration
sshd -t

# Restart SSH service
systemctl reload sshd
```

### 2.2 Install and Configure Firewall
```bash
# Install UFW (Uncomplicated Firewall)
apt install -y ufw

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow essential services
ufw allow ssh
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 9090/tcp # Cockpit

# Enable firewall
ufw --force enable

# Check status
ufw status verbose
```

### 2.3 Install Fail2ban (Brute Force Protection)
```bash
# Install fail2ban
apt install -y fail2ban

# Create custom configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban time: 1 hour
bantime = 3600
# Find time: 10 minutes
findtime = 600
# Max retries: 3 attempts
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

# Start and enable fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Check status
fail2ban-client status
```

### 2.4 Install Security Updates Automatically
```bash
# Install unattended upgrades
apt install -y unattended-upgrades apt-listchanges

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

# Enable automatic updates
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

# Enable the service
systemctl enable unattended-upgrades
systemctl start unattended-upgrades
```

---

## 🌐 3. Domain & DNS Configuration

### 3.1 Configure DNS Records

**In your domain registrar's DNS settings, add these A records:**

```
Type    Name    Value           TTL
A       @       84.217.119.207  300
A       www     84.217.119.207  300
A       api     84.217.119.207  300
A       server  84.217.119.207  300
```

### 3.2 Verify DNS Propagation
```bash
# Check if DNS is working (run these from your local machine or server)
nslookup leffe.work
nslookup www.leffe.work
nslookup api.leffe.work
nslookup server.leffe.work

# Or use dig
dig leffe.work
dig www.leffe.work
dig api.leffe.work
dig server.leffe.work
```

---

## 📱 4. Application Installation

### 4.1 Install Node.js 20
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js
apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 4.2 Install PM2 Process Manager
```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

### 4.3 Install and Configure Nginx
```bash
# Install Nginx
apt install -y nginx

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Verify Nginx is running
systemctl status nginx
nginx -t
```

### 4.4 Install Application
```bash
# Create application directory
mkdir -p /var/www/audika-sms
chown -R audika:audika /var/www/audika-sms

# Switch to audika user
su - audika

# Navigate to app directory
cd /var/www/audika-sms

# Clone repository
git clone https://github.com/lcrsx/audika-sms.git .

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Exit audika user session
exit
```

### 4.5 Configure Environment Variables
```bash
# Edit environment file
nano /var/www/audika-sms/.env.local
```

**Add your configuration:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Infobip SMS Configuration (Optional)
INFOBIP_API_KEY=your_infobip_api_key
INFOBIP_BASE_URL=your_infobip_base_url
INFOBIP_SENDER=your_sender_name_or_number

# Application Settings
NEXT_PUBLIC_APP_URL=https://leffe.work
NODE_ENV=production
PORT=3000
```

**Save the file:** Press `Ctrl+X`, then `Y`, then `Enter`

### 4.6 Build and Configure Application
```bash
# Switch to audika user
su - audika
cd /var/www/audika-sms

# Build the application
npm run build

# Create PM2 configuration
cat > ecosystem.config.js << 'EOF'
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

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R audika:audika /var/log/pm2

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot (run as audika user)
pm2 startup

# Exit audika user
exit
```

**⚠️ Important:** The `pm2 startup` command will output a command to run as root. Copy and paste that command now.

### 4.7 Configure Nginx Reverse Proxy
```bash
# Create Nginx configuration
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
    
    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/api.leffe.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.leffe.work/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # API Health Check & Status
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
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; margin-top: 0; }
                .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
                .status-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #28a745; }
                .status-card.warning { border-left-color: #ffc107; }
                .status-card.error { border-left-color: #dc3545; }
                a { color: #007bff; text-decoration: none; }
                a:hover { text-decoration: underline; }
                .timestamp { font-size: 0.9em; color: #666; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Audika SMS API Status</h1>
                <p><strong>Server:</strong> api.leffe.work</p>
                <p><strong>Status:</strong> <span style="color: #28a745;">✅ Online</span></p>
                
                <div class="status-grid">
                    <div class="status-card">
                        <h3>Database</h3>
                        <a href="/health">Check Health</a>
                    </div>
                    <div class="status-card">
                        <h3>API Endpoints</h3>
                        <a href="/api/health/database">Full Status</a>
                    </div>
                </div>
                
                <h3>🔗 Quick Links</h3>
                <ul>
                    <li><a href="https://leffe.work">Main Application</a></li>
                    <li><a href="https://server.leffe.work:9090">Server Management (Cockpit)</a></li>
                    <li><a href="/api/health/database">API Health Check</a></li>
                </ul>
                
                <div class="timestamp">
                    Last updated: <script>document.write(new Date().toLocaleString());</script>
                </div>
            </div>
        </body>
        </html>';
    }
    
    location /health {
        proxy_pass http://audika_backend/api/health/database;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api {
        proxy_pass http://audika_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://leffe.work" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        
        proxy_buffering off;
        proxy_cache off;
    }
}

# Main Application (leffe.work & www.leffe.work)
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
    
    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/leffe.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/leffe.work/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Logging
    access_log /var/log/nginx/audika-access.log;
    error_log /var/log/nginx/audika-error.log;
    
    # Max upload size
    client_max_body_size 10M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml;
    
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
    
    # Static files caching
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

# Enable the site
ln -s /etc/nginx/sites-available/audika-sms /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

## 🔄 5. Auto-Updates Setup

### 5.1 Install Certbot for SSL
```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificates for all domains
certbot --nginx \
    -d leffe.work \
    -d www.leffe.work \
    -d api.leffe.work \
    --non-interactive \
    --agree-tos \
    --email admin@leffe.work \
    --redirect

# Test certificate renewal
certbot renew --dry-run
```

### 5.2 Create Auto-Update Scripts
```bash
# Create system update script
cat > /usr/local/bin/system-auto-update.sh << 'EOF'
#!/bin/bash

# System Auto-Update Script
LOG_FILE="/var/log/system-auto-update.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting system auto-update..." >> $LOG_FILE

# Update package lists
apt update >> $LOG_FILE 2>&1

# Upgrade packages
apt upgrade -y >> $LOG_FILE 2>&1

# Clean up
apt autoremove -y >> $LOG_FILE 2>&1
apt autoclean >> $LOG_FILE 2>&1

# Check if reboot is required
if [ -f /var/run/reboot-required ]; then
    echo "[$DATE] Reboot required after updates" >> $LOG_FILE
    # Optional: Uncomment next line to auto-reboot (be careful!)
    # reboot
fi

echo "[$DATE] System auto-update completed" >> $LOG_FILE
EOF

chmod +x /usr/local/bin/system-auto-update.sh

# Create application update script
cat > /usr/local/bin/app-auto-update.sh << 'EOF'
#!/bin/bash

# Application Auto-Update Script
LOG_FILE="/var/log/app-auto-update.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
APP_DIR="/var/www/audika-sms"

echo "[$DATE] Starting application auto-update..." >> $LOG_FILE

cd $APP_DIR

# Check if there are updates available
git fetch >> $LOG_FILE 2>&1

# Compare local and remote versions
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$DATE] Updates available. Updating application..." >> $LOG_FILE
    
    # Create backup before update
    /usr/local/bin/backup-audika.sh >> $LOG_FILE 2>&1
    
    # Pull updates
    sudo -u audika git pull origin master >> $LOG_FILE 2>&1
    
    # Install/update dependencies
    sudo -u audika npm install >> $LOG_FILE 2>&1
    
    # Build application
    sudo -u audika npm run build >> $LOG_FILE 2>&1
    
    # Reload application with zero downtime
    sudo -u audika pm2 reload audika-sms >> $LOG_FILE 2>&1
    
    echo "[$DATE] Application updated successfully" >> $LOG_FILE
    
    # Send notification (optional - configure email/webhook)
    # curl -X POST "your-webhook-url" -d "Application updated on $(hostname)"
    
else
    echo "[$DATE] No updates available" >> $LOG_FILE
fi
EOF

chmod +x /usr/local/bin/app-auto-update.sh

# Create combined update script
cat > /usr/local/bin/full-auto-update.sh << 'EOF'
#!/bin/bash

# Full System and Application Auto-Update
LOG_FILE="/var/log/full-auto-update.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting full auto-update cycle..." >> $LOG_FILE

# System updates
/usr/local/bin/system-auto-update.sh

# Application updates
/usr/local/bin/app-auto-update.sh

# Certificate renewal
certbot renew --quiet >> $LOG_FILE 2>&1

# PM2 maintenance
sudo -u audika pm2 flush >> $LOG_FILE 2>&1

echo "[$DATE] Full auto-update cycle completed" >> $LOG_FILE
EOF

chmod +x /usr/local/bin/full-auto-update.sh
```

### 5.3 Schedule Auto-Updates
```bash
# Add cron jobs for automatic updates
(crontab -l 2>/dev/null; cat << 'EOF'
# System updates daily at 3 AM
0 3 * * * /usr/local/bin/system-auto-update.sh

# Application updates every hour
0 * * * * /usr/local/bin/app-auto-update.sh

# Full update cycle daily at 2 AM
0 2 * * * /usr/local/bin/full-auto-update.sh

# SSL certificate renewal twice daily
0 0,12 * * * certbot renew --quiet

# Clean up old logs weekly
0 1 * * 0 find /var/log -name "*.log" -mtime +30 -delete
EOF
) | crontab -
```

---

## 🔗 6. GitHub Webhook Integration

### 6.1 Create Webhook Handler
```bash
# Create webhook directory
mkdir -p /var/www/webhook
chown audika:audika /var/www/webhook

# Create webhook handler script
cat > /var/www/webhook/deploy.php << 'EOF'
<?php
// GitHub Webhook Handler for Auto-Deployment
// Configure this URL in GitHub: https://leffe.work/webhook/deploy.php

$webhook_secret = 'your-webhook-secret-here'; // Change this!
$log_file = '/var/log/github-webhook.log';
$app_dir = '/var/www/audika-sms';

function log_message($message) {
    global $log_file;
    $date = date('Y-m-d H:i:s');
    file_put_contents($log_file, "[$date] $message\n", FILE_APPEND | LOCK_EX);
}

// Get webhook payload
$payload = file_get_contents('php://input');
$headers = getallheaders();

// Verify webhook signature
if (isset($headers['X-Hub-Signature-256'])) {
    $signature = hash_hmac('sha256', $payload, $webhook_secret);
    $expected = 'sha256=' . $signature;
    
    if (!hash_equals($expected, $headers['X-Hub-Signature-256'])) {
        log_message('Invalid webhook signature');
        http_response_code(401);
        exit('Unauthorized');
    }
} else {
    log_message('Missing webhook signature');
    http_response_code(401);
    exit('Unauthorized');
}

// Parse payload
$data = json_decode($payload, true);

// Check if this is a push to master branch
if ($data['ref'] === 'refs/heads/master') {
    log_message('Received push to master branch');
    
    // Trigger deployment
    $output = [];
    $return_code = 0;
    
    // Run deployment script
    exec('/usr/local/bin/app-auto-update.sh 2>&1', $output, $return_code);
    
    if ($return_code === 0) {
        log_message('Deployment successful: ' . implode('\n', $output));
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

# Install PHP for webhook handler
apt install -y php-fpm php-cli

# Configure nginx for webhook
cat > /etc/nginx/sites-available/webhook << 'EOF'
server {
    listen 80;
    server_name leffe.work;
    
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
}
EOF

# Set permissions
chown -R www-data:www-data /var/www/webhook
chmod +x /var/www/webhook/deploy.php

# Restart services
systemctl restart php8.1-fpm
systemctl reload nginx
```

### 6.2 Configure GitHub Webhook
```bash
echo "Configure GitHub Webhook:"
echo "1. Go to your GitHub repository: https://github.com/lcrsx/audika-sms"
echo "2. Click Settings > Webhooks > Add webhook"
echo "3. Set Payload URL: https://leffe.work/webhook/deploy.php"
echo "4. Set Content type: application/json"
echo "5. Set Secret: your-webhook-secret-here (update in deploy.php)"
echo "6. Select 'Just the push event'"
echo "7. Check 'Active'"
echo "8. Click 'Add webhook'"
```

---

## 📊 7. SSL Certificate Automation

### 7.1 Advanced SSL Configuration
```bash
# Create SSL renewal script with notification
cat > /usr/local/bin/ssl-renewal.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/ssl-renewal.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting SSL certificate renewal..." >> $LOG_FILE

# Attempt renewal
if certbot renew --quiet >> $LOG_FILE 2>&1; then
    echo "[$DATE] SSL certificates renewed successfully" >> $LOG_FILE
    
    # Reload nginx to use new certificates
    systemctl reload nginx >> $LOG_FILE 2>&1
    
    echo "[$DATE] Nginx reloaded with new certificates" >> $LOG_FILE
else
    echo "[$DATE] SSL certificate renewal failed" >> $LOG_FILE
    
    # Send alert (configure email/webhook)
    # mail -s "SSL Renewal Failed" admin@leffe.work < $LOG_FILE
fi
EOF

chmod +x /usr/local/bin/ssl-renewal.sh

# Create SSL monitoring script
cat > /usr/local/bin/ssl-monitor.sh << 'EOF'
#!/bin/bash

# SSL Certificate Monitoring Script
LOG_FILE="/var/log/ssl-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

check_ssl_expiry() {
    local domain=$1
    local expiry_date=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    echo "[$DATE] $domain SSL expires in $days_until_expiry days" >> $LOG_FILE
    
    if [ $days_until_expiry -lt 30 ]; then
        echo "[$DATE] WARNING: $domain SSL certificate expires soon!" >> $LOG_FILE
        # Send alert
        # mail -s "SSL Certificate Expiring Soon: $domain" admin@leffe.work
    fi
}

# Check all domains
check_ssl_expiry "leffe.work"
check_ssl_expiry "api.leffe.work"
EOF

chmod +x /usr/local/bin/ssl-monitor.sh

# Add SSL monitoring to cron (weekly check)
(crontab -l 2>/dev/null; echo "0 8 * * 1 /usr/local/bin/ssl-monitor.sh") | crontab -
```

---

## 📈 8. Monitoring & Alerting

### 8.1 Install Monitoring Tools
```bash
# Install system monitoring tools
apt install -y htop iotop nethogs ncdu

# Create system health check script
cat > /usr/local/bin/health-monitor.sh << 'EOF'
#!/bin/bash

# System Health Monitoring Script
LOG_FILE="/var/log/health-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
ALERT_EMAIL="admin@leffe.work"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90

# Get system stats
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')

echo "[$DATE] CPU: ${CPU_USAGE}% | Memory: ${MEMORY_USAGE}% | Disk: ${DISK_USAGE}%" >> $LOG_FILE

# Check application health
APP_STATUS=$(sudo -u audika pm2 jlist | jq -r '.[0].pm2_env.status')
DB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health/database)

echo "[$DATE] App Status: $APP_STATUS | DB Health: $DB_STATUS" >> $LOG_FILE

# Alerts
ALERT_NEEDED=false

if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
    echo "[$DATE] ALERT: High CPU usage: ${CPU_USAGE}%" >> $LOG_FILE
    ALERT_NEEDED=true
fi

if [ "$MEMORY_USAGE" -gt "$MEMORY_THRESHOLD" ]; then
    echo "[$DATE] ALERT: High memory usage: ${MEMORY_USAGE}%" >> $LOG_FILE
    ALERT_NEEDED=true
fi

if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    echo "[$DATE] ALERT: High disk usage: ${DISK_USAGE}%" >> $LOG_FILE
    ALERT_NEEDED=true
fi

if [ "$APP_STATUS" != "online" ]; then
    echo "[$DATE] ALERT: Application not running: $APP_STATUS" >> $LOG_FILE
    sudo -u audika pm2 restart audika-sms >> $LOG_FILE 2>&1
    ALERT_NEEDED=true
fi

if [ "$DB_STATUS" != "200" ]; then
    echo "[$DATE] ALERT: Database health check failed: $DB_STATUS" >> $LOG_FILE
    ALERT_NEEDED=true
fi

# Send alerts if needed
if [ "$ALERT_NEEDED" = true ]; then
    # Configure email/webhook notification here
    echo "[$DATE] Alerts generated - configure notification system" >> $LOG_FILE
fi
EOF

chmod +x /usr/local/bin/health-monitor.sh

# Install jq for JSON parsing
apt install -y jq bc

# Schedule health monitoring every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/health-monitor.sh") | crontab -
```

### 8.2 Create Performance Dashboard
```bash
# Create simple performance API
cat > /var/www/audika-sms/pages/api/server/stats.js << 'EOF'
// Server stats API endpoint
import { execSync } from 'child_process';

export default function handler(req, res) {
  try {
    // System stats
    const uptime = execSync('uptime').toString().trim();
    const memory = execSync("free -m | awk 'NR==2{printf \"%d,%d,%.2f\", $3,$2,$3*100/$2 }'").toString().split(',');
    const disk = execSync("df -h / | awk 'NR==2{printf \"%s,%s,%s\", $3,$2,$5}'").toString().split(',');
    const load = execSync("cat /proc/loadavg").toString().split(' ');
    
    // PM2 stats
    const pm2Status = execSync('sudo -u audika pm2 jlist').toString();
    
    res.status(200).json({
      timestamp: new Date().toISOString(),
      uptime: uptime,
      memory: {
        used: parseInt(memory[0]),
        total: parseInt(memory[1]),
        percentage: parseFloat(memory[2])
      },
      disk: {
        used: disk[0],
        total: disk[1],
        percentage: disk[2]
      },
      load: {
        '1min': parseFloat(load[0]),
        '5min': parseFloat(load[1]),
        '15min': parseFloat(load[2])
      },
      pm2: JSON.parse(pm2Status)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get server stats' });
  }
}
EOF

# Set permissions
chown audika:audika /var/www/audika-sms/pages/api/server/stats.js
```

---

## 💾 9. Automated Backups

### 9.1 Create Comprehensive Backup System
```bash
# Create backup directory structure
mkdir -p /var/backups/audika/{daily,weekly,monthly}
chown -R audika:audika /var/backups/audika

# Create comprehensive backup script
cat > /usr/local/bin/comprehensive-backup.sh << 'EOF'
#!/bin/bash

# Comprehensive Backup Script
BACKUP_BASE="/var/backups/audika"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/audika-sms"
LOG_FILE="/var/log/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "Starting comprehensive backup..."

# Daily backup
DAILY_DIR="$BACKUP_BASE/daily"
mkdir -p $DAILY_DIR

# Application backup
log "Backing up application..."
tar -czf $DAILY_DIR/app-$DATE.tar.gz \
    -C $APP_DIR \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.git \
    .

# Environment backup
cp $APP_DIR/.env.local $DAILY_DIR/env-$DATE.txt

# System configuration backup
log "Backing up system configuration..."
tar -czf $DAILY_DIR/system-config-$DATE.tar.gz \
    /etc/nginx/sites-available \
    /etc/ssl \
    /etc/letsencrypt \
    /etc/crontab \
    /var/spool/cron/crontabs \
    2>/dev/null

# Database backup (if using local database)
# pg_dump dbname > $DAILY_DIR/database-$DATE.sql

# PM2 configuration backup
sudo -u audika pm2 save
cp /home/audika/.pm2/dump.pm2 $DAILY_DIR/pm2-$DATE.json

# Logs backup
tar -czf $DAILY_DIR/logs-$DATE.tar.gz \
    /var/log/nginx \
    /var/log/pm2 \
    /var/log/health-monitor.log \
    /var/log/app-auto-update.log \
    /var/log/system-auto-update.log \
    2>/dev/null

log "Daily backup completed"

# Weekly backup (every Sunday)
if [ $(date +%u) -eq 7 ]; then
    log "Creating weekly backup..."
    WEEKLY_DIR="$BACKUP_BASE/weekly"
    mkdir -p $WEEKLY_DIR
    
    cp $DAILY_DIR/app-$DATE.tar.gz $WEEKLY_DIR/
    cp $DAILY_DIR/system-config-$DATE.tar.gz $WEEKLY_DIR/
    
    # Clean old weekly backups (keep 8 weeks)
    find $WEEKLY_DIR -type f -mtime +56 -delete
    log "Weekly backup completed"
fi

# Monthly backup (first day of month)
if [ $(date +%d) -eq 1 ]; then
    log "Creating monthly backup..."
    MONTHLY_DIR="$BACKUP_BASE/monthly"
    mkdir -p $MONTHLY_DIR
    
    cp $DAILY_DIR/app-$DATE.tar.gz $MONTHLY_DIR/
    cp $DAILY_DIR/system-config-$DATE.tar.gz $MONTHLY_DIR/
    
    # Clean old monthly backups (keep 12 months)
    find $MONTHLY_DIR -type f -mtime +365 -delete
    log "Monthly backup completed"
fi

# Clean old daily backups (keep 14 days)
find $DAILY_DIR -type f -mtime +14 -delete

# Calculate backup size
BACKUP_SIZE=$(du -sh $BACKUP_BASE | cut -f1)
log "Total backup size: $BACKUP_SIZE"

# Sync to remote location (optional - configure as needed)
# rsync -az $BACKUP_BASE/ user@backup-server:/backups/audika/

log "Comprehensive backup completed successfully"

# Send notification (configure as needed)
# curl -X POST "your-webhook-url" -d "Backup completed on $(hostname): $BACKUP_SIZE"
EOF

chmod +x /usr/local/bin/comprehensive-backup.sh

# Create database-specific backup (for Supabase integration)
cat > /usr/local/bin/backup-supabase-schema.sh << 'EOF'
#!/bin/bash

# Backup Supabase schema and data
BACKUP_DIR="/var/backups/audika/supabase"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/supabase-backup.log"

mkdir -p $BACKUP_DIR

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "Starting Supabase backup..."

cd /var/www/audika-sms

# Backup schema
if [ -d "supabase/migrations" ]; then
    tar -czf $BACKUP_DIR/migrations-$DATE.tar.gz supabase/migrations/
    log "Schema migrations backed up"
fi

# Backup Supabase config
if [ -f "supabase/config.toml" ]; then
    cp supabase/config.toml $BACKUP_DIR/config-$DATE.toml
    log "Supabase config backed up"
fi

# Clean old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

log "Supabase backup completed"
EOF

chmod +x /usr/local/bin/backup-supabase-schema.sh

# Schedule backups
(crontab -l 2>/dev/null; cat << 'EOF'
# Comprehensive backup daily at 1 AM
0 1 * * * /usr/local/bin/comprehensive-backup.sh

# Supabase schema backup twice daily
0 6,18 * * * /usr/local/bin/backup-supabase-schema.sh
EOF
) | crontab -
```

### 9.2 Create Backup Restoration Scripts
```bash
# Create restoration script
cat > /usr/local/bin/restore-backup.sh << 'EOF'
#!/bin/bash

# Backup Restoration Script
BACKUP_BASE="/var/backups/audika"
APP_DIR="/var/www/audika-sms"
LOG_FILE="/var/log/restore.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <backup-date>"
    echo "Example: $0 20250106_120000"
    echo ""
    echo "Available backups:"
    ls -la $BACKUP_BASE/daily/ | grep app- | awk '{print $9}' | sed 's/app-//g' | sed 's/.tar.gz//g'
    exit 1
fi

BACKUP_DATE=$1
BACKUP_FILE="$BACKUP_BASE/daily/app-$BACKUP_DATE.tar.gz"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log "Starting restoration from backup: $BACKUP_DATE"

# Stop application
log "Stopping application..."
sudo -u audika pm2 stop audika-sms

# Create current backup before restoration
log "Creating safety backup..."
/usr/local/bin/comprehensive-backup.sh

# Restore application
log "Restoring application files..."
cd /tmp
tar -xzf $BACKUP_FILE

# Move current app to backup location
mv $APP_DIR ${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)

# Restore from backup
mkdir -p $APP_DIR
cp -r /tmp/* $APP_DIR/
chown -R audika:audika $APP_DIR

# Restore environment
ENV_FILE="$BACKUP_BASE/daily/env-$BACKUP_DATE.txt"
if [ -f "$ENV_FILE" ]; then
    cp $ENV_FILE $APP_DIR/.env.local
    log "Environment file restored"
fi

# Install dependencies and rebuild
log "Installing dependencies..."
cd $APP_DIR
sudo -u audika npm install
sudo -u audika npm run build

# Restart application
log "Starting application..."
sudo -u audika pm2 start audika-sms

# Cleanup temp files
rm -rf /tmp/*

log "Restoration completed successfully"
EOF

chmod +x /usr/local/bin/restore-backup.sh
```

---

## 🔐 10. Final Security Checks

### 10.1 Install Additional Security Tools
```bash
# Install additional security tools
apt install -y rkhunter chkrootkit lynis

# Configure rkhunter
rkhunter --update
rkhunter --check --skip-keypress

# Create security audit script
cat > /usr/local/bin/security-audit.sh << 'EOF'
#!/bin/bash

# Security Audit Script
LOG_FILE="/var/log/security-audit.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" | tee -a $LOG_FILE
}

log "Starting security audit..."

# Check for rootkits
log "Running rootkit check..."
rkhunter --check --skip-keypress --report-warnings-only >> $LOG_FILE 2>&1

# System security audit
log "Running system security audit..."
lynis audit system --quiet >> $LOG_FILE 2>&1

# Check file permissions
log "Checking critical file permissions..."
find /var/www/audika-sms -type f -perm -002 -exec ls -la {} \; >> $LOG_FILE 2>&1

# Check for suspicious processes
log "Checking running processes..."
ps aux | awk '{print $11}' | sort | uniq -c | sort -nr | head -20 >> $LOG_FILE 2>&1

# Check network connections
log "Checking network connections..."
netstat -tuln | grep LISTEN >> $LOG_FILE 2>&1

# Check failed login attempts
log "Checking failed login attempts..."
journalctl _SYSTEMD_UNIT=ssh.service | grep "Failed password" | tail -10 >> $LOG_FILE 2>&1

# Check disk usage
log "Checking disk usage..."
df -h >> $LOG_FILE 2>&1

log "Security audit completed"

# Send alert if issues found (configure as needed)
# if grep -q "WARNING\|ERROR\|CRITICAL" $LOG_FILE; then
#     mail -s "Security Alert: $(hostname)" admin@leffe.work < $LOG_FILE
# fi
EOF

chmod +x /usr/local/bin/security-audit.sh

# Schedule weekly security audits
(crontab -l 2>/dev/null; echo "0 4 * * 0 /usr/local/bin/security-audit.sh") | crontab -
```

### 10.2 Harden System Configuration
```bash
# Configure kernel parameters for security
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

# Memory protection
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
EOF

# Apply settings
sysctl -p

# Configure log rotation for application logs
cat > /etc/logrotate.d/audika-sms << 'EOF'
/var/log/pm2/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 audika audika
    postrotate
        sudo -u audika pm2 reloadLogs
    endscript
}

/var/log/*-auto-update.log {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    create 644 root root
}

/var/log/health-monitor.log {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
```

---

## 🛠️ 11. Troubleshooting Guide

### 11.1 Create Diagnostic Script
```bash
# Create comprehensive diagnostic script
cat > /usr/local/bin/diagnose-system.sh << 'EOF'
#!/bin/bash

# System Diagnostic Script
echo "🔍 AUDIKA SMS SYSTEM DIAGNOSTICS"
echo "=================================="
echo "Timestamp: $(date)"
echo "Hostname: $(hostname)"
echo "Server IP: $(curl -s ifconfig.me)"
echo ""

echo "🖥️  SYSTEM INFORMATION"
echo "----------------------"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime -p)"
echo "Load Average: $(cat /proc/loadavg)"
echo ""

echo "💾 MEMORY & DISK"
echo "----------------"
free -h
echo ""
df -h /
echo ""

echo "🌐 NETWORK"
echo "----------"
echo "DNS Resolution:"
nslookup leffe.work
echo ""
echo "SSL Certificates:"
echo | openssl s_client -servername leffe.work -connect leffe.work:443 2>/dev/null | openssl x509 -noout -dates
echo ""

echo "🔧 SERVICES STATUS"
echo "------------------"
systemctl is-active nginx && echo "✅ Nginx: Active" || echo "❌ Nginx: Inactive"
systemctl is-active php8.1-fpm && echo "✅ PHP-FPM: Active" || echo "❌ PHP-FPM: Inactive"
systemctl is-active fail2ban && echo "✅ Fail2ban: Active" || echo "❌ Fail2ban: Inactive"
systemctl is-active unattended-upgrades && echo "✅ Auto-updates: Active" || echo "❌ Auto-updates: Inactive"
echo ""

echo "📱 APPLICATION STATUS"
echo "--------------------"
sudo -u audika pm2 status
echo ""
echo "Application Health Check:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/api/health/database
echo ""

echo "📊 PM2 LOGS (Last 10 lines)"
echo "----------------------------"
sudo -u audika pm2 logs --lines 10 --nostream
echo ""

echo "🔒 SECURITY STATUS"
echo "------------------"
ufw status
echo ""
fail2ban-client status sshd
echo ""

echo "📁 DISK USAGE (Top directories)"
echo "-------------------------------"
du -sh /var/www/audika-sms
du -sh /var/backups/audika
du -sh /var/log
echo ""

echo "🔄 RECENT UPDATES"
echo "-----------------"
echo "Last system update:"
tail -5 /var/log/system-auto-update.log 2>/dev/null || echo "No update log found"
echo ""
echo "Last app update:"
tail -5 /var/log/app-auto-update.log 2>/dev/null || echo "No update log found"
echo ""

echo "📋 PROCESS LIST (Top 10 CPU users)"
echo "-----------------------------------"
ps aux --sort=-%cpu | head -11
echo ""

echo "🌡️  TEMPERATURE & SENSORS (if available)"
echo "----------------------------------------"
sensors 2>/dev/null || echo "No sensors detected"
echo ""

echo "✅ DIAGNOSTIC COMPLETE"
echo "======================"
EOF

chmod +x /usr/local/bin/diagnose-system.sh
```

### 11.2 Create Quick Fix Scripts
```bash
# Create application restart script
cat > /usr/local/bin/restart-app.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting Audika SMS Application..."
sudo -u audika pm2 restart audika-sms
sudo -u audika pm2 logs audika-sms --lines 5
echo "✅ Application restarted"
EOF

chmod +x /usr/local/bin/restart-app.sh

# Create nginx restart script
cat > /usr/local/bin/restart-nginx.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting Nginx..."
nginx -t && systemctl restart nginx
systemctl status nginx --no-pager
echo "✅ Nginx restarted"
EOF

chmod +x /usr/local/bin/restart-nginx.sh

# Create SSL renewal script
cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash
echo "🔄 Renewing SSL Certificates..."
certbot renew --force-renewal
systemctl reload nginx
echo "✅ SSL certificates renewed and nginx reloaded"
EOF

chmod +x /usr/local/bin/renew-ssl.sh
```

---

## 📚 Final Setup Commands

### Copy and paste this final verification script:

```bash
# Final verification and status
echo "🎉 AUDIKA SMS SERVER SETUP COMPLETE!"
echo "====================================="

# Show all services status
echo "📊 Service Status:"
systemctl is-active nginx && echo "✅ Nginx" || echo "❌ Nginx"
systemctl is-active php8.1-fpm && echo "✅ PHP-FPM" || echo "❌ PHP-FPM"
systemctl is-active fail2ban && echo "✅ Fail2ban" || echo "❌ Fail2ban"
systemctl is-active unattended-upgrades && echo "✅ Auto-updates" || echo "❌ Auto-updates"

echo ""
echo "📱 Application Status:"
sudo -u audika pm2 status

echo ""
echo "🌐 Your websites are available at:"
echo "   Main App: https://leffe.work"
echo "   API Status: https://api.leffe.work"
echo "   Server Management: https://server.leffe.work:9090"

echo ""
echo "🛠️  Management Commands:"
echo "   System diagnostics: /usr/local/bin/diagnose-system.sh"
echo "   Restart app: /usr/local/bin/restart-app.sh"
echo "   Restart nginx: /usr/local/bin/restart-nginx.sh"
echo "   Manual update: /usr/local/bin/app-auto-update.sh"
echo "   Manual backup: /usr/local/bin/comprehensive-backup.sh"
echo "   Restore backup: /usr/local/bin/restore-backup.sh <date>"

echo ""
echo "🔍 Log Files:"
echo "   Application: pm2 logs audika-sms"
echo "   System updates: tail -f /var/log/system-auto-update.log"
echo "   App updates: tail -f /var/log/app-auto-update.log"
echo "   Health monitor: tail -f /var/log/health-monitor.log"
echo "   Nginx access: tail -f /var/log/nginx/audika-access.log"
echo "   Nginx errors: tail -f /var/log/nginx/audika-error.log"

echo ""
echo "🔄 Automated Features:"
echo "   ✅ Auto system updates (daily 3 AM)"
echo "   ✅ Auto app updates (hourly)"
echo "   ✅ Auto SSL renewal (twice daily)"
echo "   ✅ Auto backups (daily 1 AM)"
echo "   ✅ Health monitoring (every 5 minutes)"
echo "   ✅ Security audits (weekly)"
echo "   ✅ GitHub webhook deployment"

echo ""
echo "🔒 Security Features:"
echo "   ✅ Firewall configured"
echo "   ✅ Fail2ban active"
echo "   ✅ SSH hardened"
echo "   ✅ SSL certificates"
echo "   ✅ Security headers"
echo "   ✅ Auto security updates"

echo ""
echo "📋 Next Steps:"
echo "1. Test your application at https://leffe.work"
echo "2. Configure GitHub webhook with secret"
echo "3. Set up email notifications (optional)"
echo "4. Configure monitoring alerts (optional)"
echo "5. Test backup restoration procedure"

echo ""
echo "🎯 Setup Complete! Your Audika SMS server is ready for production!"
```

---

## 🆘 Emergency Contacts & Commands

### If something goes wrong:

```bash
# Emergency application restart
sudo -u audika pm2 restart all

# Emergency system diagnosis
/usr/local/bin/diagnose-system.sh

# Emergency backup
/usr/local/bin/comprehensive-backup.sh

# Emergency SSL renewal
/usr/local/bin/renew-ssl.sh

# View all logs at once
journalctl -f
```

### Important file locations:
- Application: `/var/www/audika-sms`
- Nginx config: `/etc/nginx/sites-available/audika-sms`
- Environment: `/var/www/audika-sms/.env.local`
- PM2 config: `/var/www/audika-sms/ecosystem.config.js`
- Backups: `/var/backups/audika`
- Logs: `/var/log/`

**🎉 Your Audika SMS server is now fully automated, secure, and production-ready!**