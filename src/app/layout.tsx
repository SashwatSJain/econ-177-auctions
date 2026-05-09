import type { Metadata } from 'next'
import './globals.css'
import PageTransition from '@/components/PageTransition'

export const metadata: Metadata = {
  title: 'Auction Experiments — UCSB Econ 177',
  description: 'Classroom auction simulations for UCSB Econ 177',
  icons: [],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased"><PageTransition>{children}</PageTransition></body>
    </html>
  )
}
