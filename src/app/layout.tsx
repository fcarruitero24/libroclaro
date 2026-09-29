import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Títulos. Es variable: un solo archivo trae todos los pesos. */
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LibroClaro · Libro de Reclamaciones Virtual para tu negocio",
    template: "%s · LibroClaro",
  },
  description:
    "Cumple con INDECOPI en 5 minutos. Libro de Reclamaciones Virtual con numeración correlativa, copia automática al consumidor y control del plazo de 15 días hábiles. Prueba 30 días gratis.",
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
      "Libro de Reclamaciones Virtual para negocios peruanos. Prueba 30 días gratis, listo en 5 minutos.",
    locale: "es_PE",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
