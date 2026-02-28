import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CareerForge — AI-Powered Career Tools',
  description: 'Generate tailored CVs, cover letters, and interview prep with AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
