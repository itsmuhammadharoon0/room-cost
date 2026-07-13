import "./globals.css";

export const metadata = {
  title: "Room cost calculator",
  description: "Per-person room cost calculator with SAR to PKR conversion",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
