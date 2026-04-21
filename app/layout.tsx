import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import AmbientLayer from "@/components/fx/AmbientLayer";

export const metadata: Metadata = {
  title: "Aether Tactical",
  description: "Tactical Command Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className="relative min-h-full bg-background text-on-surface font-body">
        <AmbientLayer />
        <TopBar />
        <main className="relative z-10 min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
