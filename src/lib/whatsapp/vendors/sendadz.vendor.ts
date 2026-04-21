import {
  IWhatsAppVendor,
  WaSendTemplateOptions,
  WaSendTextOptions,
  WaTemplateFromVendor,
  WaSendResult,
  WaStatusResult,
  WaBalanceResult,
} from "./base.vendor";

// HTTP status codes and vendor error codes that indicate permanent failure (no retry)
const PERMANENT_HTTP_STATUS = new Set([401, 403, 404, 422]);
const PERMANENT_ERROR_CODES = new Set([
  "CONTACT_OPTED_OUT",
  "NOT_FOUND",
  "INSUFFICIENT_SCOPE",
  "FEATURE_NOT_AVAILABLE",
  "WHATSAPP_NOT_CONFIGURED",
  "VALIDATION_ERROR",
]);

interface SendAdzTemplateComponent {
  type: string;
  text?: string;
  format?: string;
  buttons?: unknown[];
}

interface SendAdzTemplateItem {
  name?: string;
  template_name?: string;
  language?: string;
  category?: string;
  status?: string;
  body_data?: string;
  header_data_text?: string;
  header_data_format?: string;
  footer_data?: string;
  buttons_data?: string | unknown[];
  components?: SendAdzTemplateComponent[];
}

export class SendAdzVendor implements IWhatsAppVendor {
  constructor(
    private readonly apiBaseUrl: string,
    private readonly apiKey: string
  ) {}

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async sendTemplate(options: WaSendTemplateOptions): Promise<WaSendResult> {
    try {
      // Normalize language: SendAdz accepts "en", "en_GB" etc (max 10 chars)
      // Convert long names like "English" → "en", strip invalid suffixes
      const rawLang = (options.language || "en").trim();
      const language = /^[a-z]{2}(_[A-Z]{2})?$/.test(rawLang)
        ? rawLang
        : rawLang.slice(0, 2).toLowerCase() || "en";

      // SendAdz flat body format: phone, template_name, language, field_1..field_N
      const body: Record<string, string> = {
        phone: options.to,
        template_name: options.templateName,
        language,
      };

      // Body variables map to field_1, field_2, ... field_10
      if (Array.isArray(options.variables)) {
        options.variables.forEach((v, i) => {
          body[`field_${i + 1}`] = v;
        });
      } else {
        Object.entries(options.variables).forEach(([key, val]) => {
          // SendAdz expects field_1, field_2...
          // If key is "1", "2" etc, we use it directly.
          const idx = parseInt(key);
          if (!isNaN(idx)) {
            body[`field_${idx}`] = val;
          }
        });
      }

      const url = `${this.apiBaseUrl}/messages/template`;
      console.log(`[SendAdz] POST ${url}`, JSON.stringify(body));
      const res = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json().catch(() => ({}));
      const fullResponse = JSON.stringify(data);

      if (!res.ok) {
        console.error(`[SendAdz] HTTP ${res.status}`, fullResponse);
        const errorCode = data?.error_code || data?.code || data?.error?.code;
        const isPermanent =
          PERMANENT_HTTP_STATUS.has(res.status) || PERMANENT_ERROR_CODES.has(errorCode);
        return {
          success: false,
          error: data?.message || data?.error?.message || `HTTP ${res.status}: ${fullResponse}`,
          isPermanentFailure: isPermanent,
        };
      }

      console.log(`[SendAdz] Sent OK — response: ${fullResponse}`);
      return {
        success: true,
        messageId: data?.message_id || data?.id,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
        isPermanentFailure: false,
      };
    }
  }

  async sendText(options: WaSendTextOptions): Promise<WaSendResult> {
    try {
      // SendAdz V2 flat format
      const body = {
        phone: options.to,
        message: options.text,
      };

      const res = await fetch(`${this.apiBaseUrl}/messages/text`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json().catch(() => ({}));
      const fullResponse = JSON.stringify(data);

      if (!res.ok) {
        return {
          success: false,
          error: data?.message || data?.error?.message || `HTTP ${res.status}: ${fullResponse}`,
          isPermanentFailure: PERMANENT_HTTP_STATUS.has(res.status),
        };
      }

      return {
        success: true,
        messageId: data?.message_id || data?.id,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
        isPermanentFailure: false,
      };
    }
  }

  async getTemplates(): Promise<WaTemplateFromVendor[]> {
    const res = await fetch(`${this.apiBaseUrl}/templates`, {
      headers: this.headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`Failed to fetch templates: HTTP ${res.status}`);

    const data = await res.json();
    const items: unknown[] = data?.templates || data?.data || data?.waba_templates || [];

    return items.map((t: unknown) => {
      const item = t as SendAdzTemplateItem;
      const { body, variables, headerText, headerFormat, footerText, buttons } = extractTemplateInfo(item);
      return {
        name: item.name || item.template_name || "",
        language: item.language || "en",
        category: (item.category || "custom").toLowerCase(),
        status: item.status || "APPROVED",
        variables,
        body,
        headerText,
        headerFormat,
        footerText,
        buttons,
      };
    });
  }

  async checkBalance(): Promise<WaBalanceResult> {
    const res = await fetch(`${this.apiBaseUrl}/balance`, {
      headers: this.headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Failed to check balance: HTTP ${res.status}`);

    const data = await res.json();
    return {
      balance: parseFloat(String(data?.balance ?? data?.credits ?? data?.wallet ?? "0")),
      currency: data?.currency,
    };
  }

  async getMessageStatus(_messageId: string): Promise<WaStatusResult> {
    // Delivery status tracking not yet implemented for SendAdz
    // We return 'sent' as a fallback to avoid infinite polling if implementation is missing
    return { status: "sent" };
  }
}

function extractTemplateInfo(t: SendAdzTemplateItem): {
  body: string;
  variables: string[];
  headerText?: string;
  headerFormat?: string;
  footerText?: string;
  buttons?: unknown[];
} {
  // Prioritize SendAdz specific fields from the user sample
  const body = t.body_data || t.components?.find((c) => c.type === "BODY")?.text || "";
  const headerText = t.header_data_text || t.components?.find((c) => c.type === "HEADER")?.text;
  const headerFormat = t.header_data_format || t.components?.find((c) => c.type === "HEADER")?.format;
  const footerText = t.footer_data || t.components?.find((c) => c.type === "FOOTER")?.text;

  let buttons: unknown[] = [];
  try {
    if (t.buttons_data) {
      buttons = typeof t.buttons_data === "string" ? JSON.parse(t.buttons_data) : t.buttons_data as unknown[];
    } else {
      buttons = t.components?.find((c) => c.type === "BUTTONS")?.buttons || [];
    }
  } catch (err) {
    console.warn("Failed to parse buttons_data", err);
  }

  const matches = body.match(/\{\{(\d+)\}\}/g) || [];
  const variables = matches.map((m: string) => m.replace(/[{}]/g, ""));

  return { body, variables, headerText, headerFormat, footerText, buttons };
}
