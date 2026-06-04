import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forge — Fitness OS',
  description: 'Your personal fitness, nutrition and progress tracking app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
