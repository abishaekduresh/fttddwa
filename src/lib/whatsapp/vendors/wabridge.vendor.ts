import {
  IWhatsAppVendor,
  WaSendTemplateOptions,
  WaSendTextOptions,
  WaTemplateFromVendor,
  WaSendResult,
  WaStatusResult,
  WaBalanceResult,
} from "./base.vendor";

interface WabridgeConfig {
  appKey: string;
  authKey: string;
  deviceId: string;
}

interface WabridgeTemplateComponent {
  type: string;
  text?: string;
  format?: string;
  buttons?: unknown[];
}

interface WabridgeTemplateItem {
  components?: WabridgeTemplateComponent[];
  content?: string;
  name?: string;
  template_id?: string;
  id?: string | number;
  language?: string;
  category?: string;
  template_type?: string;
  status?: string;
}

export class WabridgeVendor implements IWhatsAppVendor {
  private config: WabridgeConfig;

  constructor(
    private readonly apiBaseUrl: string,
    apiKeyJson: string
  ) {
    try {
      this.config = JSON.parse(apiKeyJson);
    } catch {
      throw new Error("Invalid WABridge configuration: API Key must be a JSON string containing appKey, authKey, and deviceId.");
    }
  }

  async sendTemplate(options: WaSendTemplateOptions): Promise<WaSendResult> {
    try {
      const url = `${this.apiBaseUrl}/createmessage`;

      // Sort variables by numeric key so {{1}},{{2}}... map in correct order
      const varArray: string[] = Array.isArray(options.variables)
        ? options.variables
        : Object.entries(options.variables)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([, v]) => v);

      const body: Record<string, unknown> = {
        "app-key":            this.config.appKey,
        "auth-key":           this.config.authKey,
        "destination_number": options.to.replace(/\D/g, ""), // 12-digit string with country code e.g. "917708443543"
        "template_id":        options.vendorTemplateId || options.templateName, // numeric ID preferred
        "device_id":          this.config.deviceId,
        "variables":          varArray,
        "button_variable":    [],
        "media":              "",
        "message":            "", // required field per WABridge docs even for template sends
      };

      console.log(`[WABridge] POST ${url}`, JSON.stringify(body));
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json().catch(() => ({}));
      const fullResponse = JSON.stringify(data);

      if (!res.ok || data.status === false) {
        const requestSent = JSON.stringify(body);
        console.error(`[WABridge] HTTP ${res.status} — Response: ${fullResponse}`);
        console.error(`[WABridge] Request sent: ${requestSent}`);
        return {
          success: false,
          error: `HTTP ${res.status} | Response: ${fullResponse} | Request: ${requestSent}`,
          isPermanentFailure: res.status === 401 || res.status === 403,
        };
      }

      console.log(`[WABridge] Sent OK — response: ${fullResponse}`);
      return {
        success: true,
        messageId: data.data?.messageid || data.messageid || data.data?.id,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
        isPermanentFailure: false,
      };
    }
  }

  async sendText(_options: WaSendTextOptions): Promise<WaSendResult> {
    // Note: WABridge documented API primarily focuses on templates.
    // We try to use a placeholder or check if they support a 'text' type message.
    // Based on generic WABridge docs, they might support 'media_type': 'text' but it's not in the snippet provided.
    // For now, we return a failure if no text-specific endpoint is known.
    return {
      success: false,
      error: "Plain text messages are not yet implemented for WABridge. Please use templates.",
      isPermanentFailure: true,
    };
  }

  async getTemplates(): Promise<WaTemplateFromVendor[]> {
    try {
      const url = `${this.apiBaseUrl}/gettemplate`;
      const body = {
        "app-key": this.config.appKey,
        "auth-key": this.config.authKey,
        "device_id": this.config.deviceId,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error(`Failed to fetch templates: HTTP ${res.status}`);

      const json = await res.json();
      const items: unknown[] = Array.isArray(json.data) ? json.data : [];

      return items.map((t: unknown) => {
        const item = t as WabridgeTemplateItem;
        let bodyText = "";
        let headerText: string | undefined;
        let headerFormat: string | undefined;
        let footerText: string | undefined;
        let buttons: unknown[] = [];

        if (Array.isArray(item.components)) {
          for (const comp of item.components) {
            switch (comp.type) {
              case "BODY":
                bodyText = comp.text || "";
                break;
              case "HEADER":
                headerText = comp.text;
                headerFormat = comp.format;
                break;
              case "FOOTER":
                footerText = comp.text;
                break;
              case "BUTTONS":
                buttons = Array.isArray(comp.buttons) ? comp.buttons : [];
                break;
            }
          }
        } else {
          // Fallback to legacy fields if components missing
          bodyText = item.content || "";
        }

        // Variable extraction (matches {{1}}, {{2}}, etc) from all text parts
        const combinedText = `${headerText || ""} ${bodyText} ${footerText || ""}`;
        const matches = combinedText.match(/\{\{(\d+)\}\}/g) || [];
        // Unique variables sorted by index
        const variables = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, ""))))
          .sort((a, b) => parseInt(a) - parseInt(b));

        return {
          name: item.name || item.template_id || "",  // human-readable name stored in templateName
          vendorTemplateId: String(item.id || ""),    // numeric ID used as template_id when sending
          language: item.language || "en",
          category: (item.category || item.template_type || "custom").toLowerCase(),
          status: (item.status || "APPROVED").toUpperCase(),
          variables,
          body: bodyText,
          headerText,
          headerFormat,
          footerText,
          buttons,
        };
      });
    } catch (err) {
      console.error("[WABridge] getTemplates error:", err);
      return [];
    }
  }

  async checkBalance(): Promise<WaBalanceResult> {
    // No public API endpoint found for balance.
    return { balance: 0 };
  }

  async getMessageStatus(messageId: string): Promise<WaStatusResult> {
    try {
      const url = `${this.apiBaseUrl}/getdlr`;
      const body = {
        "app-key": this.config.appKey,
        "auth-key": this.config.authKey,
        "device_id": this.config.deviceId,
        "messageid": messageId,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json().catch(() => ({}));

      // HTTP-level failure
      if (!res.ok) {
        return {
          status: "failed",
          error: data.message || `HTTP ${res.status}`,
          isPermanentFailure: res.status === 401 || res.status === 403,
        };
      }

      // WABridge returns status:false when there is no DLR record yet (message still in flight).
      // This is NOT a real failure — keep the log as "sent" until data arrives.
      if (data.status === false) {
        return { status: "sent" };
      }

      const vendorStatus = (data.data?.status || "").toLowerCase();

      // Map WABridge statuses to internal status
      let status: WaStatusResult["status"] = "sent";
      if (vendorStatus === "delivered") status = "delivered";
      else if (vendorStatus === "read") status = "read";
      else if (vendorStatus === "failed" || vendorStatus === "insufficient") status = "failed";
      else if (vendorStatus === "pending" || vendorStatus === "accepted") status = "pending";

      // Only surface a vendor error reason when the message actually failed
      const errorReason = status === "failed" ? (data.data?.reason || data.message || null) : null;

      return { status, error: errorReason ?? undefined };
    } catch (err) {
      return {
        status: "failed",
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }
}
