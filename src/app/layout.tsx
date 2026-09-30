import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASC-STS | Automated Scoring & Tabulation System',
  description: 'Apayao State College Automated Scoring & Tabulation System with Google Sheets Database',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-amber-500 selection:text-navy-950">
        {children}
      </body>
    </html>
  );
}
