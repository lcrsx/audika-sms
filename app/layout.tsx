import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import ErrorBoundary from "@/components/error-boundary";
import "./globals.css";
import React from "react";

const defaultUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
    metadataBase: new URL(defaultUrl),
    title: "Audika SMS Tjänst",
    description: "Audika SMS Tjänst",
};

const geistSans = Geist({
    variable: "--font-geist-sans",
    display: "swap",
    subsets: ["latin"],
});

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <div className="
            flex flex-col min-h-screen relative overflow-hidden
            bg-gradient-to-br from-gray-50 via-blue-50/50 to-slate-100/80
            dark:from-slate-900 dark:via-slate-800/90 dark:to-blue-900/30
            transition-all duration-700
          ">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Primary gradient orbs */}
                    <div className="
                absolute -top-40 -right-40 w-80 h-80
                bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-purple-600/20
                rounded-full blur-3xl
                animate-pulse
              " style={{ animationDelay: '0s', animationDuration: '4s' }} />

                    <div className="
                absolute -bottom-40 -left-40 w-96 h-96
                bg-gradient-to-tr from-cyan-400/15 via-sky-400/10 to-blue-600/15
                rounded-full blur-3xl
                animate-pulse
              " style={{ animationDelay: '2s', animationDuration: '6s' }} />

                    <div className="
                absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]
                bg-gradient-to-r from-purple-400/8 via-violet-400/6 via-pink-400/8 via-rose-400/6 to-blue-400/8
                rounded-full blur-3xl
                animate-pulse
              " style={{ animationDelay: '1s', animationDuration: '8s' }} />

                    {/* Secondary floating elements */}
                    <div className="
                absolute top-20 left-20 w-32 h-32
                bg-gradient-to-br from-blue-300/40 to-cyan-300/40
                rounded-full blur-2xl
                animate-bounce
              " style={{ animationDelay: '3s', animationDuration: '5s' }} />

                    <div className="
                absolute bottom-20 right-20 w-24 h-24
                bg-gradient-to-br from-purple-300/40 to-pink-300/40
                rounded-full blur-2xl
                animate-bounce
              " style={{ animationDelay: '1.5s', animationDuration: '4s' }} />
                </div>

                <div className="relative z-10 flex flex-col min-h-screen">
                    {/* Move Header outside of main */}
                    <Header />
                    <main className="flex-grow relative">
                        <ErrorBoundary>
                            {children}
                        </ErrorBoundary>
                    </main>
                    <div className="mt-auto">
                        <Footer />
                    </div>
                </div>
            </div>
        </ThemeProvider>
        </body>
        </html>
    );
}