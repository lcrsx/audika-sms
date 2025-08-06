# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audika SMS is a production-ready SMS management system built with Next.js 15, Supabase, and the Infobip SMS API. It's optimized for 300+ concurrent users and serves as a healthcare communication platform in Swedish. The application was fully restored from a broken state and now includes comprehensive automation, security, and deployment infrastructure.

## Development Commands

### Core Development
```bash
npm run dev                # Start development server
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint
```

### Database & Types
```bash
npm run update-types       # Generate TypeScript types from Supabase schema
```

### Installation & Validation
```bash
npm run install:app        # Run interactive installation wizard
npm run validate           # Validate complete setup
npm run validate:quick     # Quick validation (skip build)
```

### Docker Deployment
```bash
npm run docker:build       # Build Docker image
npm run docker:run         # Run Docker container
npm run docker:compose     # Run with Docker Compose
```

### Testing Database Connection
```bash
node test-db-connection.js  # Test Supabase connection
```

## Architecture Overview

### Application Structure
- **Next.js 15 App Router**: All pages use the `app/` directory structure
- **Supabase Integration**: Full-stack with real-time features, RLS policies, and Edge Functions
- **Multi-layer Architecture**: API routes, server actions, client components, and utility layers
- **Swedish Language**: All UI text is in Swedish for healthcare professionals

### Core Data Flow
1. **Authentication**: Supabase Auth with OTP verification and 2-hour auto-logout
2. **SMS Pipeline**: User input → validation → Infobip API → status tracking → database storage
3. **Real-time Updates**: Supabase real-time for chat, presence, and message status
4. **Performance**: Virtual scrolling, pagination, caching, and debounced search

### Key Architectural Components

#### Database Layer (`lib/supabase/`)
- `client.ts`: Browser client with environment validation
- `server.ts`: Server-side client for API routes and actions
- `middleware.ts`: Route protection and authentication

#### Services Layer (`lib/services/`)
- `infobip-sms.ts`: Production SMS service with comprehensive error handling
- Integrates with database for message logging and status tracking

#### Caching & Performance (`lib/hooks/`)
- `use-cache.ts`: Multi-tier memory caching with TTL and LRU eviction
- `use-virtual-scroll.ts`: Virtualization for large datasets
- `use-debounced-search.ts`: 300ms debounced search inputs
- `use-pagination.ts`: Server-side pagination with state management

#### Real-time Features (`hooks/`)
- `use-realtime-chat.tsx`: Real-time messaging with presence
- `use-realtime-presence-room.ts`: User presence tracking
- Auto-scrolling and message state management

### Environment Configuration
The application requires specific environment variables in `.env.local`:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key (safe for client)
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only service role key

**Optional (SMS functionality):**
- `INFOBIP_API_KEY`: Infobip SMS API key (server-only)
- `INFOBIP_BASE_URL`: Infobip base URL
- `INFOBIP_SENDER`: Default sender ID

### Component Architecture

#### Page Structure
- Each major feature has its own page in `app/`: sms, patients, historik, chat, hem
- Layouts provide consistent navigation and styling
- Error boundaries wrap all pages for graceful error handling

#### UI Components (`components/ui/`)
- Shadcn/ui components with custom styling
- All components use Tailwind CSS with design system consistency
- Dark/light theme support throughout

#### Feature Components
- `advanced-patient-search.tsx`: Complex patient search with debouncing
- `enhanced-composer.tsx`: SMS composition with templates and validation
- `patient-vip-manager.tsx`: VIP patient marking system
- `auto-logout-provider.tsx`: Session management with 2-hour timeout

### Database Schema
The application uses several key tables:
- `users`: User profiles with display names and metadata
- `messages`: SMS messages with status tracking and relationships
- `patients`: Patient records with VIP status and contact information  
- `chat`: Real-time messaging between users
- `rate_limits`: API rate limiting implementation

### SMS Status Management
The system implements a sophisticated SMS status pipeline:
1. **Immediate**: Status set to 'pending' on send
2. **Infobip Response**: Status updated based on API response
3. **Webhook Updates**: Real-time status updates from Infobip
4. **Fallback Logic**: Automatic status progression for better UX
5. **Error Handling**: Comprehensive error mapping and user feedback

### Performance Optimizations
- **Virtual Scrolling**: For lists with 1000+ items
- **Memory Caching**: Three-tier caching for messages, patients, and stats
- **Database Indexes**: Optimized queries with proper indexing
- **Lazy Loading**: Non-critical components load on demand
- **Request Debouncing**: All search inputs use 300ms debounce
- **Connection Pooling**: Database connections managed efficiently

### Security Implementation
- **Row Level Security (RLS)**: All Supabase tables use RLS policies
- **Rate Limiting**: API endpoints protected against abuse
- **Input Sanitization**: All user inputs sanitized before processing
- **CSRF Protection**: Built into Next.js and Supabase integration
- **Environment Validation**: Runtime checks for required environment variables

### Development Notes

#### Testing Database Connection
Always test the Supabase connection after environment changes:
```bash
node test-db-connection.js
```

#### Type Safety
The application uses strict TypeScript with auto-generated Supabase types. Regenerate types after schema changes:
```bash
npm run update-types
```

#### SMS Testing
In development, SMS functionality requires valid Infobip credentials. The application gracefully handles missing SMS configuration by showing appropriate warnings.

#### Performance Monitoring
The application includes built-in health checks at `/api/health/database` for monitoring database connectivity and application status.

### Deployment Architecture
The project includes comprehensive deployment automation:
- **Self-hosting**: Complete server setup with security hardening
- **Docker**: Multi-stage builds with optimization
- **GitHub Webhooks**: Automatic deployment on code changes
- **SSL**: Automated certificate management with Let's Encrypt
- **Monitoring**: Health checks, backups, and system monitoring
- **Security**: Firewall, fail2ban, and regular security audits

The deployment system is designed to be zero-maintenance with automatic updates, backups, and monitoring.