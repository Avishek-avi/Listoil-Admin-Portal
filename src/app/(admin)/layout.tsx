import Layout from "@/components/Layout/Layout"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Layout>{children}</Layout>
  )
}