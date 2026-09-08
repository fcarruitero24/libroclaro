import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LibroClaro · Libro de Reclamaciones Virtual para tu negocio",
    template: "%s · LibroClaro",
  },
  description:
    "Cumple con INDECOPI en 5 minutos. Libro de Reclamaciones Virtual con numeración correlativa, copia automática al consumidor y control del plazo de 15 días hábiles. Gratis para empezar.",
  keywords: [
    "libro de reclamaciones virtual",
    "libro de reclamaciones digital",
    "INDECOPI",
    "Perú",
    "reclamos",
    "quejas",
    "tienda online",
  ],
  openGraph: {
    title: "LibroClaro · Libro de Reclamaciones Virtual",
    description:
      "Libro de Reclamaciones Virtual para negocios peruanos. Gratis para empezar, listo en 5 minutos.",
    locale: "es_PE",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
