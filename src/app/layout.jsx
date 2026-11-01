import '../index.css';

export const metadata = {
  title: 'Mahall Coordinating System',
  description: 'Smart Community & Masjid ERP',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50">{children}</body>
    </html>
  );
}
