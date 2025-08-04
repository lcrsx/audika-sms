import React from "react";

interface ProtectedLayoutProps {
  readonly children: React.ReactNode;
}

export default function ProtectedLayout({
  children,
}: Readonly<ProtectedLayoutProps>) {
  return (
    <>
      {children}
    </>
  );
}
