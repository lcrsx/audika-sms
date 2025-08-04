"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const ThemeSwitcher = () => {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme, resolvedTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="h-8 w-8 rounded-lg bg-transparent animate-pulse" />
        );
    }

    const isDark = (resolvedTheme ?? theme) === "dark";
    const nextTheme = isDark ? "light" : "dark";

    return (
        <button
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} mode`}
            className="
                h-8 w-8 rounded-lg
                text-gray-600 dark:text-slate-400
                hover:text-gray-800 dark:hover:text-slate-200
                hover:bg-gray-100/50 dark:hover:bg-slate-700/30
                transition-all duration-200 ease-out
                hover:scale-110 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
                flex items-center justify-center
            "
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={isDark ? "moon" : "sun"}
                    initial={{ opacity: 0, rotate: isDark ? -30 : 30, scale: 0.9 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: isDark ? 30 : -30, scale: 0.9 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                >
                    {isDark ? (
                        <Moon size={16} />
                    ) : (
                        <Sun size={16} />
                    )}
                </motion.div>
            </AnimatePresence>
        </button>
    );
};
