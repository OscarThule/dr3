import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Medical Syndicate | Book Doctor Appointments Online South Africa",
    template: "%s | Medical Syndicate",
  },
  description:
    "Medical Syndicate allows you to book doctor appointments online in South Africa. Find nearby medical centers, choose time slots, and get treated without waiting in queues.",

  keywords: [
    "doctor appointment online South Africa",
    "book doctor near me",
    "medical centers near me",
    "clinic booking South Africa",
    "online doctor consultation",
    "hospital booking system",
    "Surgery  near me",
    "emergency ",
  ],

  authors: [{ name: "Medical Syndicate" }],

  metadataBase: new URL("https://medical-syndicate.com"),

  openGraph: {
    title: "Medical Syndicate | Book Doctor Appointments Online",
    description:
      "Find doctors, book appointments, and avoid long queues in South Africa.",
    url: "https://medical-syndicate.com",
    siteName: "Medical Syndicate",
    locale: "en_ZA",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Medical Syndicate",
    description:
      "Book doctor appointments online in South Africa quickly and easily.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        {children}
      </body>
    </html>
  );
}