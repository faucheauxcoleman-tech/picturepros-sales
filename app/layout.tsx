import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Picture Pros AI — Pro Sports Portraits from Any Photo",
  description: "Upload a photo of your kid. Get a professional AI-generated sports portrait in seconds. Try free.",
  keywords: ["sports portraits", "AI portraits", "youth sports", "team photos", "picture pros"],
  metadataBase: new URL("https://picturepros.ai"),
  openGraph: {
    title: "Picture Pros AI — Pro Sports Portraits",
    description: "Turn any photo into a professional sports portrait in seconds. AI-powered. Try free.",
    url: "https://picturepros.ai",
    siteName: "Picture Pros AI",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Picture Pros AI — Pro Sports Portraits",
    description: "Turn any photo into a professional sports portrait in seconds. AI-powered. Try free.",
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
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-white`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
