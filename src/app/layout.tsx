import type { Metadata } from "next";
import "./globals.css";

import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.associationSetting.findFirst({
    where: { id: 1 },
  });

  const name = settings?.name || "FTTDDWA";
  const logo = settings?.logo1Url || "/favicon.ico";

  return {
    title: {
      default: `${name} - Member Portal`,
      template: `%s | ${name}`,
    },
    description: `Federation of Tamil Nadu Tent Dealers & Decorators Welfare Association - Member Management System`,
    icons: {
      icon: logo,
      apple: logo,
    },
    keywords: [name, "Tamil Nadu", "Tent Dealers", "Decorators", "Member Management"],
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
