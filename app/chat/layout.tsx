import React from 'react';

interface ChatLayoutProps {
  readonly children: React.ReactNode;
}

export default function ChatLayout({ children }: Readonly<ChatLayoutProps>) {
  return (
      <main className="min-h-screen flex flex-col items-center">
        <div className="flex-1 w-full flex flex-col items-center">
          {children}
        </div>
      </main>
  );
}