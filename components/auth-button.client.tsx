"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { LogoutButton } from "./logout-button";

interface AuthButtonClientProps {
    readonly email?: string;
}

export function AuthButtonClient({ email }: AuthButtonClientProps) {
    if (email) {
        const username = email?.split('@')[0]?.toLowerCase();
        return (
            <div className="flex items-center gap-4">
                <Button asChild size="sm" variant="outline" className="mr-2">
                    <Link href={`/${username}`}>
                        Hey, {(email?.split('@')[0]?.toUpperCase()) || 'USER'}!
                    </Link>
                </Button>
                <LogoutButton />
            </div>
        );
    }
    return (
        <Button asChild size="sm" variant="default">
            <Link href="/auth">Logga In</Link>
        </Button>
    );
}