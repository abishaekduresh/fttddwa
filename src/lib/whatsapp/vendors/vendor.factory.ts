import { IWhatsAppVendor } from "./base.vendor";
import { SendAdzVendor } from "./sendadz.vendor";
import { WabridgeVendor } from "./wabridge.vendor";
import { decryptApiKey } from "@/lib/whatsapp/encryption";

export type VendorRow = {
  id: number;
  name: string;
  apiBaseUrl: string;
  apiKeyEncrypted: string;
};

/**
 * Creates an IWhatsAppVendor instance from a DB vendor row.
 * Decrypts the API key and selects the correct vendor implementation by name.
 *
 * To add a new vendor (e.g. Twilio, Meta Cloud):
 *   1. Create src/lib/whatsapp/vendors/twilio.vendor.ts implementing IWhatsAppVendor
 *   2. Add an `if` branch below matching the vendor name
 */
export function createVendor(row: VendorRow): IWhatsAppVendor {
  const apiKey = decryptApiKey(row.apiKeyEncrypted);
  const normalizedName = row.name.toLowerCase().replace(/[\s_-]/g, "");

  if (normalizedName.includes("sendadz")) {
    return new SendAdzVendor(row.apiBaseUrl, apiKey);
  }

  if (normalizedName.includes("wabridge")) {
    return new WabridgeVendor(row.apiBaseUrl, apiKey);
  }

  // Future vendors:
  // if (normalizedName.includes("meta") || normalizedName.includes("whatsappcloud")) {
  //   return new MetaCloudVendor(row.apiBaseUrl, apiKey);
  // }
  // if (normalizedName.includes("twilio")) {
  //   return new TwilioVendor(row.apiBaseUrl, apiKey);
  // }

  throw new Error(`Unsupported WhatsApp vendor: "${row.name}"`);
}
