/**
 * Simple configuration management for Audika SMS
 */

export interface AppConfig {
  environment: string;
  isDevelopment: boolean;
  isProduction: boolean;
  sms: {
    provider: 'infobip' | 'mock';
  };
  features: {
    vipPatients: boolean;
    directMessaging: boolean;
    messageTemplates: boolean;
    analytics: boolean;
    realTimeChat: boolean;
    apiDocs: boolean;
    debugRoutes: boolean;
  };
  logging: {
    level: string;
    format: string;
    fileEnabled: boolean;
    filePath: string;
  };
  monitoring: {
    metricsEnabled: boolean;
  };
  rateLimiting: {
    api: { windowMs: number; maxRequests: number };
    sms: { windowMs: number; maxRequests: number };
  };
}

let config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!config) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    config = {
      environment: nodeEnv,
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
      sms: {
        provider: process.env.INFOBIP_API_KEY ? 'infobip' : 'mock'
      },
      features: {
        vipPatients: true,
        directMessaging: true,
        messageTemplates: true,
        analytics: true,
        realTimeChat: true,
        apiDocs: nodeEnv === 'development',
        debugRoutes: nodeEnv === 'development'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'pretty',
        fileEnabled: false,
        filePath: './logs/audika-sms.log'
      },
      monitoring: {
        metricsEnabled: true
      },
      rateLimiting: {
        api: { windowMs: 60000, maxRequests: 100 },
        sms: { windowMs: 300000, maxRequests: 10 }
      }
    };
  }
  return config;
}

export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  return getConfig().features[feature];
}


const configExports = {
  getConfig,
  isFeatureEnabled,
};

export default configExports;