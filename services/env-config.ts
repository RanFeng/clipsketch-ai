/**
 * 环境变量配置加载器
 * 支持从多个来源读取配置：
 * 1. import.meta.env (Vite)
 * 2. process.env (Node/构建时)
 * 3. window.ENV (运行时全局注入)
 */

export interface EnvConfig {
  providerType: 'google' | 'openai' | 'siliconflow';
  apiKey: string;
  baseUrl: string;
}

function getEnvVariable(key: string): string | undefined {
  // 尝试从 Vite 环境变量读取 (REACT_APP_ 前缀)
  const viteKey = `REACT_APP_${key}`;
  if (import.meta.env[viteKey]) {
    return import.meta.env[viteKey] as string;
  }

  // 尝试从 process.env 读取
  if (typeof process !== 'undefined' && process.env[viteKey]) {
    return process.env[viteKey];
  }

  // 尝试从全局注入的 ENV 读取 (EdgeOne 运行时)
  if (typeof window !== 'undefined' && (window as any).ENV) {
    return (window as any).ENV[key];
  }

  return undefined;
}

export function loadEnvConfig(): Partial<EnvConfig> {
  const providerType = getEnvVariable('PROVIDER_TYPE') || 'google';
  const baseUrl = getEnvVariable('AI_GATEWAY_URL') || '';
  
  // 根据提供商类型加载对应的 API Key
  let apiKey = '';
  
  if (providerType === 'google') {
    apiKey = getEnvVariable('GEMINI_API_KEY') || '';
  } else if (providerType === 'openai') {
    apiKey = getEnvVariable('OPENAI_API_KEY') || '';
  } else if (providerType === 'siliconflow') {
    apiKey = getEnvVariable('SILICONFLOW_API_KEY') || '';
  }

  return {
    providerType: providerType as any,
    apiKey,
    baseUrl
  };
}

/**
 * 获取默认的提供商基础 URL
 */
export function getDefaultBaseUrl(provider: 'google' | 'openai' | 'siliconflow'): string {
  switch (provider) {
    case 'google':
      return 'https://generativelanguage.googleapis.com';
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'siliconflow':
      return 'https://api.siliconflow.cn/v1';
    default:
      return '';
  }
}
