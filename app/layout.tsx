import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI Text Similarity Playground",
  description:
    "Write in the editor and watch how your draft compares to saved snippets across four similarity dimensions — lexical, structural, semantic, and sentiment.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
