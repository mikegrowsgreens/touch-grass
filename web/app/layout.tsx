import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Alfa_Slab_One, Public_Sans } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

const slab = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-slab",
});

const sans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Touch Grass National Park",
  description:
    "Closes social media for maintenance, permanently. You're not giving anything up.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Touch Grass",
  },
};

export const viewport: Viewport = {
  themeColor: "#142A1D",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${slab.variable} ${sans.variable} antialiased`}>
        {children}
        <RegisterSW />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-LCRF7SMS2P"
          strategy="afterInteractive"
        />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LCRF7SMS2P');`}
        </Script>
      </body>
    </html>
  );
}
