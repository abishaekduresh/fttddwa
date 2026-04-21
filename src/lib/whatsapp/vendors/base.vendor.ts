export interface WaSendTemplateOptions {
  to: string;               // "91XXXXXXXXXX" format
  templateName: string;     // human-readable name (for logs/fallback)
  vendorTemplateId?: string; // vendor-specific numeric ID (used as template_id in API call)
  language: string;         // e.g. "en", "en_US"
  variables: string[] | Record<string, string>;
}

export interface WaSendTextOptions {
  to: string;
  text: string;
}

export interface WaTemplateFromVendor {
  name: string;            // human-readable template name
  vendorTemplateId?: string; // vendor's own numeric/string ID used when sending
  language: string;
  category: string;
  status: string;       // "APPROVED", "PENDING", "REJECTED"
  variables: string[];  // Variable placeholder names/positions
  body?: string;        // Actual message text
  headerText?: string;
  headerFormat?: string;
  footerText?: string;
  buttons?: unknown[];
}

export interface WaSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isPermanentFailure?: boolean; // true = don't retry (invalid phone, template deleted, opted out)
}

export interface WaBalanceResult {
  balance: number;
  currency?: string;
}

export interface WaStatusResult {
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  error?: string;
  isPermanentFailure?: boolean;
}

export interface IWhatsAppVendor {
  sendTemplate(options: WaSendTemplateOptions): Promise<WaSendResult>;
  sendText(options: WaSendTextOptions): Promise<WaSendResult>;
  getTemplates(): Promise<WaTemplateFromVendor[]>;
  getMessageStatus(messageId: string): Promise<WaStatusResult>;
  checkBalance(): Promise<WaBalanceResult>;
}
