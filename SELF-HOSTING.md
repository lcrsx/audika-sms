# Self-Hosting Audika SMS on Home Server

## Prerequisites

### Hardware Requirements
- Minimum: 2 CPU cores, 4GB RAM
- Recommended: 4 CPU cores, 8GB RAM
- Storage: 20GB minimum
- Static IP or Dynamic DNS service

### Software Requirements
- Ubuntu 20.04+ or Debian 11+ (or any Linux distro)
- Node.js 18+ and npm
- Nginx (reverse proxy)
- PM2 (process manager)
- Certbot (SSL certificates)
- Git

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Required Software
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install git
sudo apt install -y git
```

## Step 2: Domain Setup

### 2.1 Configure Your Domain
1. Point your domain to your home IP address:
   - Add an A record: `@` → Your public IP
   - Add an A record: `www` → Your public IP
   - Add an A record: `sms` → Your public IP (if using subdomain)

### 2.2 Router Configuration
Forward these ports to your server:
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 3000 (Next.js, internal only)

### 2.3 Dynamic DNS (if no static IP)
Options for dynamic DNS:
- DuckDNS (free): https://www.duckdns.org
- No-IP (free tier): https://www.noip.com
- Cloudflare (with API)

## Step 3: Application Deployment

### 3.1 Clone and Setup
```bash
# Create app directory
sudo mkdir -p /var/www/audika-sms
sudo chown $USER:$USER /var/www/audika-sms
cd /var/www/audika-sms

# Clone repository
git clone https://github.com/lcrsx/audika-sms.git .

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env.local
nano .env.local
```

### 3.2 Configure Environment
Edit `.env.local`:
```env
# Supabase (keep your existing Supabase cloud or self-host)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Infobip SMS
INFOBIP_API_KEY=your_api_key
INFOBIP_BASE_URL=your_base_url
INFOBIP_SENDER=your_sender

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### 3.3 Build Application
```bash
# Build the Next.js app
npm run build

# Test it works
npm start
# Press Ctrl+C to stop after verifying
```

## Step 4: Process Management with PM2

### 4.1 Create PM2 Configuration
```bash
nano ecosystem.config.js
```

Add this content:
```javascript
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
```

### 4.2 Start with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

### 4.3 PM2 Commands
```bash
pm2 status          # Check status
pm2 logs audika-sms # View logs
pm2 restart audika-sms # Restart app
pm2 reload audika-sms  # Zero-downtime reload
pm2 monit           # Monitor resources
```

## Step 5: Nginx Configuration

### 5.1 Create Nginx Site
```bash
sudo nano /etc/nginx/sites-available/audika-sms
```

Add this configuration:
```nginx
upstream audika_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL certificates (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Logging
    access_log /var/log/nginx/audika-access.log;
    error_log /var/log/nginx/audika-error.log;
    
    # Next.js app
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location /_next/static {
        proxy_pass http://audika_backend;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api {
        proxy_pass http://audika_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Disable buffering for SSE
        proxy_buffering off;
        proxy_cache off;
    }
}
```

### 5.2 Enable Site
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/audika-sms /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 6: SSL Certificate

### 6.1 Get Let's Encrypt Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 6.2 Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up a cron job for renewal
```

## Step 7: Security Hardening

### 7.1 Firewall Setup
```bash
# Install ufw
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 7.2 Fail2ban (Optional)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 7.3 Security Best Practices
1. Keep system updated: `sudo apt update && sudo apt upgrade`
2. Use strong passwords
3. Disable root SSH login
4. Use SSH keys instead of passwords
5. Regular backups

## Step 8: Monitoring & Maintenance

### 8.1 Health Check Endpoint
Your app has a health endpoint at `/api/health/database`

### 8.2 Monitoring with PM2
```bash
# Install PM2 web dashboard (optional)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 8.3 System Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop nethogs iotop

# Check resource usage
htop              # CPU and memory
nethogs          # Network usage per process
iotop            # Disk I/O
```

### 8.4 Log Management
```bash
# View logs
pm2 logs audika-sms --lines 100
tail -f /var/log/nginx/audika-access.log
tail -f /var/log/nginx/audika-error.log
```

## Step 9: Backup Strategy

### 9.1 Application Backup
```bash
# Create backup script
nano /home/$USER/backup-audika.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/audika-app-$DATE.tar.gz \
  -C /var/www/audika-sms \
  --exclude=node_modules \
  --exclude=.next \
  .

# Backup environment
cp /var/www/audika-sms/.env.local $BACKUP_DIR/env-$DATE.txt

# Keep only last 30 days of backups
find $BACKUP_DIR -name "audika-*" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 9.2 Schedule Backups
```bash
chmod +x /home/$USER/backup-audika.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/$USER/backup-audika.sh
```

## Step 10: Updates & Deployment

### 10.1 Update Script
```bash
nano /home/$USER/update-audika.sh
```

Add:
```bash
#!/bin/bash
cd /var/www/audika-sms

# Pull latest changes
git pull origin master

# Install dependencies
npm install

# Build application
npm run build

# Reload PM2 with zero downtime
pm2 reload audika-sms

echo "Update completed successfully"
```

### 10.2 Make Executable
```bash
chmod +x /home/$USER/update-audika.sh
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo lsof -i :3000
   kill -9 <PID>
   ```

2. **PM2 not starting on boot**
   ```bash
   pm2 startup
   pm2 save
   ```

3. **Nginx 502 Bad Gateway**
   - Check if app is running: `pm2 status`
   - Check logs: `pm2 logs audika-sms`

4. **SSL certificate issues**
   ```bash
   sudo certbot renew --force-renewal
   ```

5. **Database connection issues**
   - Check environment variables in `.env.local`
   - Test connection: `node test-db-connection.js`

## Performance Optimization

### 1. Enable Nginx Caching
```nginx
# Add to nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=audika_cache:10m max_size=1g inactive=60m;
```

### 2. Optimize Node.js
```bash
# Set Node options in ecosystem.config.js
env: {
  NODE_ENV: 'production',
  NODE_OPTIONS: '--max-old-space-size=4096'
}
```

### 3. Database Connection Pooling
Already configured in your Supabase client

## Security Checklist

- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Regular updates scheduled
- [ ] Backups automated
- [ ] Strong passwords set
- [ ] Environment variables secured
- [ ] Nginx security headers configured
- [ ] PM2 logs rotated
- [ ] Monitoring in place

## Support Resources

- PM2 Documentation: https://pm2.keymetrics.io/
- Nginx Documentation: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/
- Ubuntu Security: https://ubuntu.com/security

## Quick Commands Reference

```bash
# Application
pm2 status                    # Check app status
pm2 restart audika-sms       # Restart app
pm2 logs audika-sms --lines 50  # View logs

# Updates
cd /var/www/audika-sms && git pull && npm install && npm run build && pm2 reload audika-sms

# Nginx
sudo nginx -t                 # Test config
sudo systemctl reload nginx   # Reload config
sudo systemctl status nginx   # Check status

# SSL
sudo certbot certificates     # List certificates
sudo certbot renew           # Renew certificates

# System
df -h                        # Check disk space
free -m                      # Check memory
htop                         # Monitor resources
```