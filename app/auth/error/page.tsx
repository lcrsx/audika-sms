"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Page({
  searchParams,
}: Readonly<{
  searchParams: { error: string };
}>) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/50 to-slate-100/80 dark:from-slate-900 dark:via-slate-800/90 dark:to-blue-900/30 transition-all duration-700"></div>
      
      {/* Primary gradient orbs */}
      <motion.div 
        className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-400/20 via-orange-400/15 to-amber-600/20 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.7, 0.5]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity,
          repeatType: "reverse" 
        }}
      />
      
      <motion.div 
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-purple-600/15 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.6, 0.4]
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity,
          repeatType: "reverse",
          delay: 1
        }}
      />
      
      {/* Secondary floating elements */}
      <motion.div 
        className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-red-300/30 to-orange-300/30 rounded-full blur-2xl"
        animate={{ 
          y: [0, 15, 0],
          x: [0, 10, 0]
        }}
        transition={{ 
          duration: 5, 
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
      
      <motion.div 
        className="absolute bottom-20 right-20 w-24 h-24 bg-gradient-to-br from-blue-300/30 to-indigo-300/30 rounded-full blur-2xl"
        animate={{ 
          y: [0, -15, 0],
          x: [0, -10, 0]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity,
          repeatType: "reverse",
          delay: 1
        }}
      />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="relative z-10 max-w-md w-full"
      >
        <Card className="relative overflow-hidden backdrop-blur-xl bg-white/40 dark:bg-slate-800/30 rounded-3xl border-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
          {/* Card background gradient */}
          <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10 dark:from-red-300/8 dark:via-orange-300/8 dark:to-amber-300/8" />
          
          {/* Glassmorphism effect */}
          <div className="absolute inset-0 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent dark:before:from-white/10 before:rounded-3xl before:pointer-events-none" />
          
          <CardHeader className="relative z-10 text-center pt-8 space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="relative mx-auto"
            >
              <div className="absolute inset-0 scale-110 bg-gradient-to-r from-red-400/50 to-amber-600/50 rounded-full blur-xl opacity-50 animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center shadow-xl ring-4 ring-white/30 dark:ring-slate-700/30">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/50 via-orange-500/50 to-red-500/50 opacity-70"
                />
                <AlertTriangle className="h-10 w-10 text-white relative z-10" />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 dark:from-red-400 dark:via-orange-400 dark:to-amber-400 bg-clip-text text-transparent drop-shadow-lg">
                Something Went Wrong
              </CardTitle>
            </motion.div>
          </CardHeader>

          <CardContent className="relative z-10 px-8 py-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-2xl p-6 shadow-inner"
            >
              {searchParams?.error ? (
                <p className="text-gray-700 dark:text-gray-300 text-center">
                  <span className="font-semibold">Error:</span> {searchParams.error}
                </p>
              ) : (
                <p className="text-gray-700 dark:text-gray-300 text-center">
                  An unspecified error occurred. Please try again.
                </p>
              )}
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button
                asChild
                className="w-full py-6 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300"
              >
                <Link href="/auth">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Return to Login
                </Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
