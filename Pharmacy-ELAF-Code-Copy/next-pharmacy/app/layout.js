import "./globals.css";

export const metadata = {
  title: "Pharmacy ELAF | Your Health, Our Priority",
  description: "Browse Pharmacy ELAF products, manage your cart, and connect order records to Google Sheets.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
