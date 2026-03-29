import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Econ 177 — Auction Lab',
  description: 'Classroom auction simulations for Econ 177',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
