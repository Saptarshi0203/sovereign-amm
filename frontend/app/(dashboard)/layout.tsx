// Pass-through layout — no auth redirects (Requirements: 9.2, 9.4)
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
