import { differenceInYears } from "date-fns";

const IST = "Asia/Kolkata";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: IST,
  });
}

export function calculateAge(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return differenceInYears(new Date(), d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: IST,
  });
}

export function maskAadhaar(aadhaar: string): string {
  if (aadhaar.length !== 12) return aadhaar;
  return `XXXX XXXX ${aadhaar.slice(8)}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return phone;
}

export function truncate(str: string, maxLength = 50): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
