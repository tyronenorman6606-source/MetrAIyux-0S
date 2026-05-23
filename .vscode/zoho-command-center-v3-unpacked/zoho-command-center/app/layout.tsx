import "./globals.css";

export const metadata = {
  title: process.env.DASHBOARD_BRAND_NAME || "Command Center",
  description: "Zoho Mail powered dashboard and inbox"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = process.env.DASHBOARD_BRAND_NAME || "Command Center";
  const accent = process.env.DASHBOARD_ACCENT || "Executive Ops";

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">{brand}</div>
            <div className="kicker">{accent}</div>
            <nav className="nav">
              <a href="/">Dashboard</a>
              <a href="/inbox">Inbox</a>
              <a href="/compose">Compose</a>
              <a href="/onboard">Onboard Client</a>
              <a href="/clients">Clients</a>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
