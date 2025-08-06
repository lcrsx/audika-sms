#!/bin/bash

# Setup script for deploying Audika SMS on leffe.work
# Run this on your server as root or with sudo

set -e  # Exit on any error

echo "🚀 Setting up Audika SMS on leffe.work..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/audika-sms"
NGINX_CONF="/etc/nginx/sites-available/audika-sms"
DOMAIN_MAIN="leffe.work"
DOMAIN_WWW="www.leffe.work"
DOMAIN_API="api.leffe.work"
PORT=3000

echo -e "${BLUE}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

echo -e "${BLUE}Step 2: Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | cut -d'v' -f2) -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

echo -e "${BLUE}Step 3: Installing required packages...${NC}"
apt install -y nginx git ufw

echo -e "${BLUE}Step 4: Installing PM2...${NC}"
npm install -g pm2

echo -e "${BLUE}Step 5: Setting up application directory...${NC}"
if [ ! -d "$APP_DIR" ]; then
    mkdir -p $APP_DIR
fi

# Change to app directory
cd $APP_DIR

echo -e "${BLUE}Step 6: Cloning repository...${NC}"
if [ ! -d ".git" ]; then
    git clone https://github.com/lcrsx/audika-sms.git .
else
    git pull origin master
fi

echo -e "${BLUE}Step 7: Installing dependencies...${NC}"
npm install

echo -e "${BLUE}Step 8: Setting up environment file...${NC}"
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo -e "${YELLOW}⚠️  Please edit .env.local with your configuration:${NC}"
    echo "nano $APP_DIR/.env.local"
    echo ""
    echo "Required variables:"
    echo "- NEXT_PUBLIC_SUPABASE_URL"
    echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "- SUPABASE_SERVICE_ROLE_KEY"
    echo "- INFOBIP_API_KEY (optional)"
    echo "- INFOBIP_BASE_URL (optional)"
    echo "- INFOBIP_SENDER (optional)"
    echo ""
    echo "Update NEXT_PUBLIC_APP_URL to: https://$DOMAIN_MAIN"
    echo ""
    read -p "Press Enter after you've configured .env.local..."
fi

echo -e "${BLUE}Step 9: Building application...${NC}"
npm run build

echo -e "${BLUE}Step 10: Setting up PM2 configuration...${NC}"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'audika-sms',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '$APP_DIR',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: '/var/log/pm2/audika-error.log',
    out_file: '/var/log/pm2/audika-out.log',
    log_file: '/var/log/pm2/audika-combined.log',
    time: true
  }]
};
EOF

echo -e "${BLUE}Step 11: Starting application with PM2...${NC}"
# Create log directory
mkdir -p /var/log/pm2

# Start app
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup systemd -u root --hp /root

echo -e "${BLUE}Step 12: Configuring Nginx...${NC}"
# Copy our nginx configuration
cp nginx-leffe.conf $NGINX_CONF

# Enable the site
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/audika-sms

# Remove default nginx site if it exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Test nginx configuration
if nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    systemctl reload nginx
else
    echo -e "${RED}❌ Nginx configuration error${NC}"
    exit 1
fi

echo -e "${BLUE}Step 13: Setting up firewall...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 9090  # Cockpit (already configured)

echo -e "${BLUE}Step 14: Installing SSL certificates...${NC}"
# Install certbot
apt install -y certbot python3-certbot-nginx

# Get certificates for all domains
certbot --nginx -d $DOMAIN_MAIN -d $DOMAIN_WWW -d $DOMAIN_API --non-interactive --agree-tos --email admin@$DOMAIN_MAIN || {
    echo -e "${YELLOW}⚠️  SSL setup failed. You may need to configure DNS first.${NC}"
    echo "Run this command manually after DNS is configured:"
    echo "sudo certbot --nginx -d $DOMAIN_MAIN -d $DOMAIN_WWW -d $DOMAIN_API"
}

echo -e "${BLUE}Step 15: Setting up monitoring...${NC}"
# Create simple health check script
cat > /usr/local/bin/audika-health-check.sh << 'EOF'
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health/database)
if [ "$response" != "200" ]; then
    echo "Health check failed with status: $response"
    pm2 restart audika-sms
    logger "Audika SMS app restarted due to health check failure"
fi
EOF

chmod +x /usr/local/bin/audika-health-check.sh

# Add to cron (check every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/audika-health-check.sh") | crontab -

echo -e "${BLUE}Step 16: Creating update script...${NC}"
cat > /usr/local/bin/update-audika.sh << EOF
#!/bin/bash
cd $APP_DIR
git pull origin master
npm install
npm run build
pm2 reload audika-sms
echo "Audika SMS updated successfully"
EOF

chmod +x /usr/local/bin/update-audika.sh

echo -e "${BLUE}Step 17: Creating backup script...${NC}"
cat > /usr/local/bin/backup-audika.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/audika"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# Backup application
tar -czf \$BACKUP_DIR/audika-app-\$DATE.tar.gz \\
  -C $APP_DIR \\
  --exclude=node_modules \\
  --exclude=.next \\
  .

# Backup environment
cp $APP_DIR/.env.local \$BACKUP_DIR/env-\$DATE.txt

# Keep only last 30 days of backups
find \$BACKUP_DIR -name "audika-*" -mtime +30 -delete

echo "Backup completed: \$DATE"
EOF

chmod +x /usr/local/bin/backup-audika.sh

# Add daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-audika.sh") | crontab -

echo -e "${GREEN}🎉 Setup completed!${NC}"
echo ""
echo -e "${BLUE}Your Audika SMS application is now running at:${NC}"
echo -e "  🌐 Main app: https://$DOMAIN_MAIN"
echo -e "  📊 API status: https://$DOMAIN_API"
echo -e "  ⚙️  Server management: https://server.leffe.work:9090 (Cockpit)"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  📱 Check app status: ${GREEN}pm2 status${NC}"
echo -e "  📋 View logs: ${GREEN}pm2 logs audika-sms${NC}"
echo -e "  🔄 Restart app: ${GREEN}pm2 restart audika-sms${NC}"
echo -e "  🆙 Update app: ${GREEN}/usr/local/bin/update-audika.sh${NC}"
echo -e "  💾 Manual backup: ${GREEN}/usr/local/bin/backup-audika.sh${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Configure your DNS to point $DOMAIN_MAIN, $DOMAIN_WWW, and $DOMAIN_API to this server"
echo "2. Update your .env.local file if needed: nano $APP_DIR/.env.local"
echo "3. Test the application at https://$DOMAIN_MAIN"
echo "4. Check API status at https://$DOMAIN_API"
echo ""
echo -e "${GREEN}Setup complete! 🚀${NC}"