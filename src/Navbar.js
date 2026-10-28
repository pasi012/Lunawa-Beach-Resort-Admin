import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import logo from "../assets/logo.png";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItemClass = ({ isActive }) =>
    `relative text-lg font-medium tracking-wide transition px-4 py-2 
   ${isActive
      ? "bg-[#c47a3d] text-white shadow-lg"
      : "text-white hover:bg-black/50 hover:text-white hover:shadow-lg"}`;

  return (
    <header className="fixed top-0 z-[999] w-full">
      <div
        className={`transition-all duration-300 ${scrolled
          ? "bg-black/80 backdrop-blur-md"
          : "bg-transparent"
          }`}
      >
        <div className="mx-auto flex h-[90px] max-w-[1400px] items-center justify-between px-4 md:px-8">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-16 w-auto" />
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-8">
            <NavLink to="/" className={navItemClass}>
              Home
            </NavLink>

            <NavLink to="/about" className={navItemClass}>
              About Us
            </NavLink>

            <NavLink to="/accommodation" className={navItemClass}>
              Accommodation
            </NavLink>

            <NavLink to="/dining" className={navItemClass}>
              Dining
            </NavLink>

            {/* Explore Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setExploreOpen(true)}
              onMouseLeave={() => setExploreOpen(false)}
            >
              <button className="flex items-center gap-1 text-lg text-white hover:text-[#c47a3d]">

                Explore <ChevronDown size={18} />
              </button>

              {exploreOpen && (
                <div className="absolute top-8 left-0 w-44 rounded-md bg-white/90 backdrop-blur-md shadow-lg">
                  <Link
                    to="/kalutara-bodhiya"
                    className="block px-4 py-3 text-sm text-black hover:bg-[#c47a3d]"
                  >
                    Kalutara Bodhiya
                  </Link>
                  <Link
                    to="/kalutara-beach"
                    className="block px-4 py-3 text-sm text-black hover:bg-[#c47a3d]"
                  >
                    Kalutara Beach
                  </Link>
                  <Link
                    to="/richmond-castle"
                    className="block px-4 py-3 text-sm text-black hover:bg-[#c47a3d]"
                  >
                    Richmond Castle
                  </Link>
                </div>
              )}
            </div>

            <NavLink to="/gallery" className={navItemClass}>
              Gallery
            </NavLink>

            <NavLink to="/contact" className={navItemClass}>
              Contact Us
            </NavLink>
          </nav>

          {/* Book Now Button */}
          <div className="hidden lg:block">
            <Link
              to="/book-now"
              className="mt-8 bg-[#b8742c] px-8 py-3 text-white tracking-wide hover:bg-[#9e6325] transition"
            >
              Book Now
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-white"
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-black/95 backdrop-blur-md">
          <ul className="flex flex-col text-white">
            {[
              ["Home", "/"],
              ["About Us", "/about"],
              ["Accommodation", "/accommodation"],
              ["Dining", "/dining"],
              ["Gallery", "/gallery"],
              ["Contact Us", "/contact"],
            ].map(([label, path]) => (
              <li key={label}>
                <Link
                  to={path}
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-white/10 px-6 py-4 text-sm font-medium hover:text-[#c47a3d]"
                >
                  {label}
                </Link>
              </li>
            ))}

            <li className="px-6 py-5">
              <Link
                to="/book-now"
                onClick={() => setMenuOpen(false)}
                className="block rounded-md bg-[#c47a3d] py-3 text-center font-semibold text-white"
              >
                Book Now
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
