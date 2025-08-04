import React from "react";

interface HemLayoutProps {
  readonly children: React.ReactNode;
}

export default function HemLayout({ children }: Readonly<HemLayoutProps>) {
  return (
    <>
      {children}
    </>
  );
}
