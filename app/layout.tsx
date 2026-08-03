import "./globals.css";
import type { Metadata } from "next";
import { MotionSystem } from "@/components/MotionSystem";

export const metadata: Metadata = {
  title: "BoroTech Voice Demo Invites",
  description: "Private single-use invitation flow for the BoroTech voice demo."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <MotionSystem />
      </body>
    </html>
  );
}
