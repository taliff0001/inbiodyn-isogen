import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IsoForge — InBioDyn Asset Generator",
  description: "Generate isometric weight reference images for the InBioDyn Lift Training System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
