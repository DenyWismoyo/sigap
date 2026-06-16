"use client";

import Image from 'next/image';
import Link from 'next/link';
import logo from '@/logo-sigap.png';
import { FC, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useTheme } from '@/context/ThemeContext';
// Import icons (Hanya yang digunakan)
import { 
    Sparkles, Moon, Sun, ArrowRight
} from 'lucide-react';

// Komponen ThemeToggle
const ThemeToggle = () => {
    const [isClient, setIsClient] = useState(false);
    const themeContext = useTheme();

    useEffect(() => {
        setIsClient(true);
    }, []);

    const theme = isClient ? themeContext.theme : 'light';
    const toggleTheme = isClient ? themeContext.toggleTheme : () => {};

    if (!isClient) {
        return <div className="w-10 h-10"></div>;
    }

    return (
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      );
}

const Navbar = () => (
    <header className="w-full bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-colors duration-300">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-9 h-9 overflow-hidden rounded-lg">
                   <Image src={logo} alt="SIGAP Logo" fill className="object-cover group-hover:scale-110 transition-transform duration-300" priority />
                </div>
                <span className="text-2xl font-bold tracking-tight text-foreground">SIGAP</span>
            </Link>
            <div className="flex items-center gap-4">
                <ThemeToggle />
                <Link href="/login" className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    Login
                </Link>
            </div>
        </div>
    </header>
);

const AnimatedDiv: FC<{ children: React.ReactNode; className?: string, delay?: number }> = ({ children, className = '', delay = 0 }) => {
    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    return (
        <div
            ref={ref}
            className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
            style={{ transitionDelay: `${delay}ms`}}
        >
            {children}
        </div>
    );
};

const HeroSection = () => (
    <section className="bg-background text-foreground w-full">
        <div className="container mx-auto flex px-6 md:flex-row flex-col items-center">
            <div className="lg:flex-grow md:w-1/2 lg:pr-24 md:pr-16 flex flex-col md:items-start md:text-left mb-12 md:mb-0 items-center text-center">
                 <AnimatedDiv>
                    <div className="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground mb-6 bg-muted/50">
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                      Sistem Integrasi Administrasi Persuratan
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-foreground">
                        Transformasi Digital untuk <span className="text-primary">Birokrasi Modern</span>
                    </h1>
                 </AnimatedDiv>
                 <AnimatedDiv delay={200}>
                    <p className="mb-8 leading-relaxed text-muted-foreground text-lg max-w-2xl">
                        SIGAP adalah ekosistem kerja digital terpadu yang dirancang untuk merevolusi cara institusi pemerintah beroperasi. Kami mengorkestrasikan seluruh alur kerja—dari surat masuk hingga laporan kinerja—dengan bantuan asisten AI cerdas.
                    </p>
                 </AnimatedDiv>
                 <AnimatedDiv delay={400}>
                    <div className="flex justify-center md:justify-start gap-4">
                        <Link href="/login" className="inline-flex items-center justify-center px-8 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors shadow-sm">
                            Masuk ke Dashboard
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                    </div>
                 </AnimatedDiv>
            </div>
            <AnimatedDiv className="lg:max-w-lg lg:w-full md:w-1/2 w-5/6 relative" delay={300}>
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl -z-10"></div>
                <div className="bg-card p-4 rounded-2xl border border-border shadow-2xl">
                    <Image
                        className="object-cover object-center rounded-xl bg-muted"
                        alt="Hero Image SIGAP"
                        src={logo}
                        width={500}
                        height={500}
                        priority
                    />
                </div>
            </AnimatedDiv>
        </div>
    </section>
);

export default function Home() {
  return (
    // Menggunakan h-screen dan overflow-hidden agar tidak bisa di-scroll
    <div className="bg-background h-screen overflow-hidden selection:bg-primary/20 selection:text-primary flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <HeroSection />
      </main>
    </div>
  );
}