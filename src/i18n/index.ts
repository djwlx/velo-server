import { zhCN } from './locales/zh-CN.js';

export type MessageKey = keyof typeof zhCN;
export type MessageParams = Record<string, string | number>;
export type Locale = 'zh-CN';

export const DEFAULT_LOCALE: Locale = 'zh-CN';

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
};

export function t(
  key: MessageKey,
  params?: MessageParams,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const template = catalogs[locale][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
