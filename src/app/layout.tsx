import type { Metadata } from "next";
import "./globals.css";

import { prisma } from "@/lib/prisma";
import { DatabaseError } from "@/components/shared/database-error";

export async function generateMetadata(): Promise<Metadata> {
  try {
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
  } catch (error) {
    console.error("Failed to fetch settings for metadata:", error);
    return {
      title: "FTTDDWA - Member Portal",
      description: "Federation of Tamil Nadu Tent Dealers & Decorators Welfare Association",
    };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let isDbConnected = true;

  try {
    // Proactive check for database connection
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("Database connection check failed in RootLayout:", error);
    isDbConnected = false;
  }

  return (
    <html lang="en">
      <body className="antialiased">
        {isDbConnected ? children : <DatabaseError />}
      </body>
    </html>
  );
}
