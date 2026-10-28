import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import aboutHero from "../assets/hero.jpg";

function About() {
    useEffect(() => {
        AOS.init({ duration: 900, once: true });
    }, []);

    return (
        <div className="w-full overflow-hidden">

            {/* ================= HERO SECTION ================= */}
            <section className="relative h-[40vh] w-full">
                <img
                    src={aboutHero}
                    alt=""
                    className="absolute inset-0 w-full h-full object-fixed"
                />
                <div className="absolute inset-0 bg-black/60" />

                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white px-4">
                    <h1 data-aos="fade-up" className="text-4xl border border-[#c97b3a] bg-black/40 backdrop-blur-sm p-6 sm:p-5 sm:text-3xl md:text-4xl font-bold mb-3">
                        About Us
                    </h1>
                </div>
            </section>

        </div>
    );
}

export default About;
