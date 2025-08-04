"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { AudikaLogo } from "./audika-logo";
import { MessageSquare, Shield, Zap } from "lucide-react";

export function Hero() {
    return (
        <section className="flex flex-col gap-12 items-center text-center">
            {/* Enhanced Logo with Glow Effect */}
            <motion.div
                initial={{ opacity: 0, y: -40, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.1, type: "spring", stiffness: 100, damping: 15 }}
                className="relative"
            >
                {/* Logo glow effect */}
                <div className="
          absolute inset-0 scale-110
          bg-gradient-to-r from-blue-400/50 to-purple-600/50
          rounded-full blur-2xl
          animate-pulse
        " style={{ animationDuration: '3s' }} />

                <div className="relative z-10">
                    <AudikaLogo />
                </div>
            </motion.div>

            {/* Enhanced Title with Better Typography */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.3 }}
                className="space-y-4"
            >
                <motion.h1
                    initial={{ letterSpacing: "-.08em", opacity: 0 }}
                    animate={{ letterSpacing: "0em", opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1.5, ease: "easeOut" }}
                    className="
            text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight
            bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500
            dark:from-blue-400 dark:via-purple-400 dark:to-cyan-400
            bg-clip-text text-transparent
            drop-shadow-2xl
          "
                >
                    Audika SMS
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.8 }}
                    className="
            inline-block px-6 py-2 rounded-full
            bg-gradient-to-r from-blue-500/20 to-purple-500/20
            backdrop-blur-sm
            border border-white/20 dark:border-white/10
          "
                >
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            SMS Tjänst
          </span>
                </motion.div>
            </motion.div>

            {/* Enhanced Description */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
                className="space-y-6 max-w-3xl"
            >
                <p className="
          text-xl md:text-2xl lg:text-3xl
          text-gray-700 dark:text-gray-200
          font-medium leading-relaxed
        ">
                    Skicka SMS Säkert med Audika SMS
                </p>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                    className="flex flex-wrap justify-center gap-6 text-lg"
                >
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Zap className="h-5 w-5" />
                        <span className="font-semibold">Fast</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Shield className="h-5 w-5" />
                        <span className="font-semibold">Secure</span>
                    </div>
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <MessageSquare className="h-5 w-5" />
                        <span className="font-semibold">Effortless</span>
                    </div>
                </motion.div>
            </motion.div>

            {/* Animated Divider */}
            <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.9, duration: 1.5, ease: "easeInOut" }}
                className="relative w-full max-w-2xl h-px my-8"
            >
                <div className="
          absolute inset-0
          bg-gradient-to-r from-transparent via-blue-500/50 to-transparent
          rounded-full
        " />
                <div className="
          absolute inset-0
          bg-gradient-to-r from-transparent via-purple-500/30 to-transparent
          rounded-full blur-sm
        " />
            </motion.div>

            {/* Enhanced Security Features */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.8, ease: "easeOut" }}
                className="
          relative p-6 rounded-3xl
          bg-white/20 dark:bg-black/20
          backdrop-blur-xl
          border border-white/20 dark:border-white/10
          shadow-[0_8px_32px_rgba(31,38,135,0.37)]
          dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
          max-w-2xl w-full
        "
            >
                {/* Inner glow */}
                <div className="
          absolute inset-0
          bg-gradient-to-br from-white/10 to-transparent
          dark:from-white/5
          rounded-3xl pointer-events-none
        " />

                <div className="relative z-10 space-y-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.3, duration: 0.6 }}
                        className="text-center"
                    >
            <span className="
              inline-block px-4 py-2 rounded-full
              bg-gradient-to-r from-blue-600/20 to-purple-600/20
              text-sm font-bold uppercase tracking-wider
              text-blue-700 dark:text-blue-300
              border border-blue-200/30 dark:border-blue-400/30
            ">
              Exklusivt för Audika
            </span>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5, duration: 0.6 }}
                        className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-300"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span>Inloggning krävs</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                            <span>All aktivitet loggas</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                            <span>100% Dataskydd</span>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Enhanced CTA Button */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.8, type: "spring", stiffness: 100, damping: 15 }}
                className="relative group"
            >
                {/* Button glow effect */}
                <div className="
          absolute -inset-1 rounded-3xl
          bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500
          opacity-50 group-hover:opacity-75
          blur-lg transition-opacity duration-300
          animate-pulse
        " style={{ animationDuration: '2s' }} />

                <Link
                    href="/auth"
                    className="
            relative block px-12 py-5 rounded-3xl
            text-xl font-bold text-white
            bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500
            hover:from-blue-700 hover:via-purple-700 hover:to-cyan-600
            shadow-[0_8px_32px_rgba(31,38,135,0.37)]
            dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
            hover:shadow-[0_12px_40px_rgba(31,38,135,0.5)]
            dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.7)]
            transform hover:scale-105 active:scale-95
            transition-all duration-300
            border border-white/20
            backdrop-blur-sm
            focus:outline-none focus:ring-4 focus:ring-blue-500/50
          "
                    tabIndex={0}
                    aria-label="Logga in till Audika SMS"
                >
                    {/* Button inner glow */}
                    <div className="
            absolute inset-0 rounded-3xl
            bg-gradient-to-br from-white/20 to-transparent
            opacity-0 group-hover:opacity-100
            transition-opacity duration-300
          " />

                    <span className="relative z-10 flex items-center gap-3">
            <MessageSquare className="h-6 w-6" />
            Logga in
          </span>
                </Link>
            </motion.div>
        </section>
    );
}
