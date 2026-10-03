import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASC-ASTS | Apayao State College Tabulation Suite',
  description: 'Apayao State College ASC-ASTS Tabulation System with Google Sheets & Drive Integration',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-amber-500 selection:text-navy-950">
        {children}
      </body>
    </html>
  );
}
