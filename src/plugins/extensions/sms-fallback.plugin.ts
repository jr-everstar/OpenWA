import { IPlugin, PluginContext, PluginType } from '../../core/plugins';
import { HookResult } from '../../core/hooks';

type MessageFailedHookData = {
  sessionId: string;
  error: string;
  input: { chatId: string; text?: string; caption?: string };
  type: string;
};

export class SmsFallbackPlugin implements IPlugin {
  readonly type = PluginType.EXTENSION;
  private context?: PluginContext;

  onEnable(context: PluginContext): Promise<void> {
    this.context = context;
    context.registerHook('message:failed', hookCtx => {
      const data = hookCtx.data as MessageFailedHookData;
      if (!this.isEnabled(context.config) || !this.isWhatsAppRegistrationError(data.error)) {
        return { continue: true } satisfies HookResult<MessageFailedHookData>;
      }

      const provider = typeof context.config.provider === 'string' ? context.config.provider : 'mock';

      context.logger.log('SMS fallback triggered (mock adapter)', {
        action: 'sms_fallback_triggered',
        to: this.normalizePhone(data.input.chatId),
        text: data.input.text ?? data.input.caption ?? '',
        reason: data.error,
        provider,
      });

      return Promise.resolve({ continue: true, data } satisfies HookResult<MessageFailedHookData>);
    });
    return Promise.resolve();
  }

  healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    if (!this.context) return Promise.resolve({ healthy: false, message: 'Plugin context not initialized' });
    return Promise.resolve({
      healthy: true,
      message: this.isEnabled(this.context.config)
        ? 'SMS fallback plugin enabled (mock provider)'
        : 'SMS fallback plugin installed but disabled',
    });
  }

  private isEnabled(config: Record<string, unknown>): boolean {
    return Boolean(config.enabled);
  }

  private isWhatsAppRegistrationError(error: string): boolean {
    const normalized = error.toLowerCase();
    return (
      normalized.includes('not a whatsapp user') ||
      normalized.includes('is not registered on whatsapp') ||
      normalized.includes('invalid wid')
    );
  }

  private normalizePhone(chatId: string): string {
    return chatId.replace(/@.*/, '');
  }
}
