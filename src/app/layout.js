export const metadata = {
  title: 'Diana Dashboard',
  description: 'Project tracker with AI',
}
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0A0A0A', color: '#E8E8E0', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
