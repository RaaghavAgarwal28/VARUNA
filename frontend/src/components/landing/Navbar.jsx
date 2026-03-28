import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [atDark, setAtDark] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      // Approximate: features section starts at ~100vh, check if we're in a dark section
      const vh = window.innerHeight;
      const inDark = (y > vh * 0.85 && y < vh * 3.5) || (y > vh * 4.8);
      setAtDark(inDark);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLight = !atDark;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        scrolled
          ? isLight
            ? "border-b border-black/8 bg-[#FAF9F6]/85 backdrop-blur-2xl"
            : "border-b border-white/8 bg-black/85 backdrop-blur-2xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 md:py-5">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF4500] text-white shadow-[0_4px_14px_rgba(255,69,0,0.4)] transition group-hover:scale-110">
            <ShieldCheck size={18} />
          </div>
          <span
            className={`font-display text-[1.35rem] font-bold tracking-[-0.04em] transition ${
              isLight ? "text-[#111]" : "text-white"
            }`}
          >
            VARUNA
          </span>
        </Link>

        {/* Nav links */}
        <div
          className={`hidden items-center gap-8 text-sm font-semibold tracking-[-0.01em] md:flex transition ${
            isLight ? "text-[#666]" : "text-[#888]"
          }`}
        >
          {["Features", "Network", "Security"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="hover-underline transition-colors hover:text-[#FF4500]"
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <Link to="/dashboard">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-[0.8rem] font-bold tracking-[0.06em] uppercase shadow-sm transition-all ${
              isLight
                ? "bg-[#111111] text-white hover:bg-black"
                : "bg-white text-black hover:bg-white/90"
            }`}
          >
            Dashboard
            <ArrowRight size={13} />
          </motion.button>
        </Link>
      </div>
    </motion.nav>
  );
}
