"use client";

import React, {useState, useEffect, useCallback} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {cn} from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {Alert, AlertTitle, AlertDescription} from "@/components/ui/alert";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import {
    Mail as MailIcon,
    Clock as ClockIcon,
    Loader2 as SpinnerIcon,
    ArrowRight as ArrowIcon,
    Sparkles,
    ShieldCheck,
    RefreshCw,
} from "lucide-react";

export function AuthForm({
                             className,
                             ...props
                         }: Readonly<React.ComponentPropsWithoutRef<"div">>) {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const router = useRouter();

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleVerifyOtp = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (otp.length !== 6) return;

        const supabase = createClient();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: "email",
            });
            
            if (error) {
                // Special handling for 403 errors - might be Supabase configuration issue
                if (error.message.includes('403') || error.message.includes('Forbidden')) {
                    throw new Error("Autentiseringsfel - Supabase konfiguration behöver kontrolleras");
                }
                
                // Skip token validation errors for console spam reduction
                if (error.message.includes('Token has expired or is invalid')) {
                    console.warn('Token validation failed, but continuing with authentication');
                    // Continue with normal error handling
                }
                
                throw error;
            }
            
            router.push("/hem");
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Ogiltig kod. Försök igen.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [email, otp, router]);

    const handleSendOtp = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const supabase = createClient();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: `${window.location.origin}/hem` },
            });
            if (error) throw error;
            setOtpSent(true);
            setTimeLeft(120);
            setCanResend(false);
            setSuccess("Kolla din inkorg för din kod!");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Något gick fel. Försök igen.");
        } finally {
            setIsLoading(false);
        }
    }, [email]);

    const handleResendOtp = useCallback(async () => {
        setIsResending(true);
        await handleSendOtp();
        setIsResending(false);
    }, [handleSendOtp]);

    // Timer effect for countdown
    useEffect(() => {
        if (!otpSent) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [otpSent]);

    // Auto-submit when OTP is complete - with debounce to prevent jumping
    useEffect(() => {
        if (otp.length === 6 && !isLoading && otpSent) {
            const timer = setTimeout(() => {
                handleVerifyOtp();
            }, 300); // Small delay to prevent immediate jumping
            return () => clearTimeout(timer);
        }
    }, [otp, isLoading, otpSent, handleVerifyOtp]);

    return (
        <div
            className={cn(
                "min-h-screen flex items-center justify-center p-6 relative overflow-hidden",
                className
            )}
            {...props}
        >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/50 to-slate-100/80 dark:from-slate-900 dark:via-slate-800/90 dark:to-blue-900/30 transition-all duration-700"></div>

            {/* Primary gradient orbs */}
            <motion.div
                className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-purple-600/20 rounded-full blur-3xl"
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
                className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-400/15 via-sky-400/10 to-blue-600/15 rounded-full blur-3xl"
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

            <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-purple-400/8 via-violet-400/6 via-pink-400/8 via-rose-400/6 to-blue-400/8 rounded-full blur-3xl"
                animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.3, 0.5, 0.3]
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: 2
                }}
            />

            {/* Secondary floating elements */}
            <motion.div
                className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-blue-300/40 to-cyan-300/40 rounded-full blur-2xl"
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
                className="absolute bottom-20 right-20 w-24 h-24 bg-gradient-to-br from-purple-300/40 to-pink-300/40 rounded-full blur-2xl"
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
                    <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-300/8 dark:via-purple-300/8 dark:to-pink-300/8" />

                    {/* Glassmorphism effect */}
                    <div className="absolute inset-0 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent dark:before:from-white/10 before:rounded-3xl before:pointer-events-none" />

                    <CardHeader className="relative z-10 text-center pt-8 space-y-4">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, type: "spring" }}
                            className="relative mx-auto"
                        >
                            <div className="absolute inset-0 scale-110 bg-gradient-to-r from-blue-400/50 to-purple-600/50 rounded-full blur-xl opacity-50 animate-pulse" style={{ animationDuration: '3s' }} />
                            <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl ring-4 ring-white/30 dark:ring-slate-700/30">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/50 via-purple-500/50 to-blue-500/50 opacity-70"
                                />
                                <MailIcon className="h-10 w-10 text-white relative z-10" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 dark:from-blue-400 dark:via-purple-400 dark:to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
                                Audika SMS
                            </CardTitle>
                            <CardDescription className="text-gray-700 dark:text-gray-300 mt-2 text-lg">
                                {!otpSent ? "Endast Audika.se & Demant.com" : "Ange 6-siffrig kod"}
                            </CardDescription>
                        </motion.div>
                    </CardHeader>

                    <CardContent className="relative z-10 px-8 py-6 space-y-6">
                        <AnimatePresence mode="wait">
                            {otpSent ? (
                                // VERIFY OTP
                                <motion.div
                                    key="verify-form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    {/* Timer Display */}
                                    <motion.div
                                        className="text-center space-y-2"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                            <ClockIcon className="h-4 w-4" />
                                            <span>
                                                {timeLeft > 0 ? `Kod upphör om ${formatTime(timeLeft)}` : "Koden har upphört"}
                                            </span>
                                        </div>

                                        {canResend && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleResendOtp}
                                                    disabled={isResending}
                                                    className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-gray-300 dark:border-slate-600 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-xl"
                                                >
                                                    {isResending ? (
                                                        <>
                                                            <SpinnerIcon className="animate-spin mr-2 h-4 w-4" />
                                                            Skickar...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RefreshCw className="mr-2 h-4 w-4" />
                                                            Skicka ny kod
                                                        </>
                                                    )}
                                                </Button>
                                            </motion.div>
                                        )}
                                    </motion.div>

                                    <motion.div
                                        className="space-y-2"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: 0.05 }}
                                    >
                                        <Label htmlFor="otp" className="text-gray-700 dark:text-gray-300 font-medium">Kod</Label>
                                        <div className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-2xl p-4 shadow-inner">
                                            <div className="flex justify-center items-center">
                                                <InputOTP
                                                    value={otp}
                                                    onChange={(v) => setOtp(v)}
                                                    maxLength={6}
                                                    textAlign="center"
                                                    disabled={isLoading}
                                                    className="font-mono tracking-widest"
                                                    containerClassName="flex justify-center items-center"
                                                >
                                                    <InputOTPGroup className="gap-2 flex justify-center">
                                                        <InputOTPSlot
                                                            className="bg-white/80 dark:bg-slate-600/80 border-gray-300 dark:border-slate-500 rounded-xl h-12 w-12 text-lg transition-all duration-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
                                                            index={0} />
                                                        <InputOTPSlot
                                                            className="bg-white/80 dark:bg-slate-600/80 border-gray-300 dark:border-slate-500 rounded-xl h-12 w-12 text-lg transition-all duration-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
                                                            index={1} />
                                                        <InputOTPSlot
                                                            className="bg-white/80 dark:bg-slate-600/80 border-gray-300 dark:border-slate-500 rounded-xl h-12 w-12 text-lg transition-all duration-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
                                                            index={2} />
                                                        <InputOTPSlot
                                                            className="bg-white/80 dark:bg-slate-600/80 border-gray-300 dark:border-slate-500 rounded-xl h-12 w-12 text-lg transition-all duration-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
                                                            index={3} />
                                                        <InputOTPSlot
                                                            className="bg-white/80 dark:bg-slate-600/80 border-gray-300 dark:border-slate-500 rounded-xl h-12 w-12 text-lg transition-all duration-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
                                                            index={4} />
                                                        <InputOTPSlot
                                                            className="bg-white/80 dark:bg-slate-600/80 border-gray-300 dark:border-slate-500 rounded-xl h-12 w-12 text-lg transition-all duration-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
                                                            index={5} />
                                                    </InputOTPGroup>
                                                </InputOTP>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                            >
                                                <Alert variant="destructive" className="border-0 rounded-2xl">
                                                    <AlertTitle>Fel</AlertTitle>
                                                    <AlertDescription>{error}</AlertDescription>
                                                </Alert>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                    >
                                        <Button
                                            onClick={handleVerifyOtp}
                                            disabled={isLoading || otp.length !== 6}
                                            className="w-full py-6 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <SpinnerIcon className="animate-spin mr-2 h-5 w-5" />
                                                    Verifierar...
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck className="mr-2 h-5 w-5" />
                                                    Verifiera och logga in
                                                </>
                                            )}
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            ) : (
                                // SEND OTP
                                <motion.form
                                    key="send-form"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                    onSubmit={handleSendOtp}
                                    className="space-y-6"
                                >
                                    <motion.div
                                        className="space-y-2"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: 0.05 }}
                                    >
                                        <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium">E-postadress</Label>
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-md opacity-50" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="xxxx@audika.se"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                                                disabled={isLoading}
                                                className="relative z-10 h-12 px-4 rounded-2xl bg-white/80 dark:bg-slate-700/80 border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 shadow-inner"
                                            />
                                        </div>
                                    </motion.div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                            >
                                                <Alert variant="destructive" className="border-0 rounded-2xl">
                                                    <AlertTitle>Fel</AlertTitle>
                                                    <AlertDescription>{error}</AlertDescription>
                                                </Alert>
                                            </motion.div>
                                        )}

                                        {success && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                            >
                                                <Alert variant="default" className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-0 rounded-2xl">
                                                    <AlertTitle className="text-green-700 dark:text-green-400 flex items-center">
                                                        <Sparkles className="h-4 w-4 mr-2" />
                                                        Klar
                                                    </AlertTitle>
                                                    <AlertDescription className="text-green-600 dark:text-green-300">{success}</AlertDescription>
                                                </Alert>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                    >
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-6 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <SpinnerIcon className="animate-spin mr-2 h-5 w-5" />
                                                    Skickar...
                                                </>
                                            ) : (
                                                <>
                                                    Skicka kod
                                                    <ArrowIcon className="ml-2 h-5 w-5" />
                                                </>
                                            )}
                                        </Button>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: 0.1 }}
                                        className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-white/30 dark:bg-slate-700/30 backdrop-blur-sm p-3 rounded-xl"
                                    >
                                        <ClockIcon className="h-4 w-4" />
                                        <span>One-time password via email</span>
                                    </motion.div>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
