import React from 'react';
interface UserProfileLayoutProps {
  readonly children: React.ReactNode;
}

export default function UserProfileLayout({
                                            children,
                                          }: Readonly<UserProfileLayoutProps>) {
  return (
      <main className="min-h-screen flex flex-col items-center">
        <div className="flex-1 w-full flex flex-col items-center">

          {children}

        </div>
      </main>
  );
}