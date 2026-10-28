import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "../assets/logo.jpeg";
 
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Update scroll state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItemClass = ({ isActive }) =>
    `relative text-lg font-medium tracking-wide transition px-4 py-2 ${
      isActive
        ? "bg-[#c47a3d] text-white shadow-lg"
        : "text-white hover:bg-black/50 hover:text-white hover:shadow-lg"
    }`;

  return (
    <header className="fixed top-0 z-[999] w-full">
      <div
        className={`transition-all duration-300 ${
          scrolled
            ? "bg-[#1a1a1a]/95 backdrop-blur-md"
            : "bg-black/50"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 md:px-8 h-24">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-16 w-auto" />
          </Link>

          {/* Title between Logo and Desktop Menu */}
          <div className="hidden lg:flex text-white text-xl font-bold tracking-wide">
            Lunawa Beach Resort Admin
          </div>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-8">
            <NavLink to="/" className={navItemClass}>
              Home
            </NavLink>
            {/* <NavLink to="/manage-gallery" className={navItemClass}>
              Manage Gallery
            </NavLink> */}
            <NavLink to="/manage-booking" className={navItemClass}>
              Manage Booking
            </NavLink>
          </nav>

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
        <div className="lg:hidden bg-[#1a1a1a]/95 backdrop-blur-md">
          <ul className="flex flex-col text-white">
            {[
              ["Home", "/"],
              ["Manage Gallery", "/manage-gallery"],
              ["Manage Booking", "/manage-booking"],
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
          </ul>
        </div>
      )}
    </header>
  );
}
