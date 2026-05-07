import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Noé — Développeur @ Ynov Lyon",
  description: "Portfolio de Noé, étudiant développeur à Ynov Lyon. Projets, compétences et contact.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#13131d",
              color: "#fafafa",
              border: "1px solid #1f1f2c",
            },
          }}
        />
      </body>
    </html>
  );
}
