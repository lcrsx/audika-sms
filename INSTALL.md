# Audika SMS - Installation Guide

## Quick Start

### Automated Installation (Recommended)

```bash
npm run install:app
```

This will guide you through the complete setup process.

### Validation

After installation, verify your setup:

```bash
npm run validate
```

For a quick validation without build checks:

```bash
npm run validate:quick
```

## Manual Installation

### Prerequisites

- Node.js 18+ 
- npm 9+
- Supabase account

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd audika-sms
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
INFOBIP_API_KEY=your_infobip_key
INFOBIP_BASE_URL=your_infobip_base_url
INFOBIP_SENDER=your_sender
```

### Step 4: Database Setup

Run migrations:

```bash
npx supabase db push
```

Generate TypeScript types:

```bash
npm run update-types
```

### Step 5: Build & Run

Development:

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

## Docker Installation

### Build Image

```bash
npm run docker:build
```

### Run Container

```bash
npm run docker:run
```

### Docker Compose

```bash
npm run docker:compose
```

## Available Scripts

- `npm run install:app` - Run installation wizard
- `npm run validate` - Validate setup
- `npm run validate:quick` - Quick validation (no build)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run linter
- `npm run update-types` - Generate TypeScript types
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container
- `npm run docker:compose` - Run with Docker Compose

## Troubleshooting

### Database Connection Issues

1. Verify Supabase credentials in `.env.local`
2. Check network connectivity
3. Run `node test-db-connection.js` to test connection

### Build Errors

1. Clear cache: `rm -rf .next node_modules`
2. Reinstall: `npm install`
3. Rebuild: `npm run build`

### TypeScript Errors

1. Update types: `npm run update-types`
2. Check for missing dependencies

## Support

For issues, please check:
- DEVELOPMENT_SUMMARY.md for detailed documentation
- GitHub Issues for known problems