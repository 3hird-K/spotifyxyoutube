import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScrollSectionProps {
    title: string;
    children: React.ReactNode;
    onShowAll?: () => void;
}

export function HorizontalScrollSection({ title, children, onShowAll }: HorizontalScrollSectionProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = React.useState(false);
    const [showRightArrow, setShowRightArrow] = React.useState(true);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftArrow(scrollLeft > 0);
            // Show right arrow if we haven't scrolled all the way to the end (allow 2px margin of error)
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 2);
        }
    };

    // Check right arrow on mount and when children change
    React.useEffect(() => {
        handleScroll();
        // Add a small delay to allow images to load and layout to settle
        const timeoutId = setTimeout(handleScroll, 100);
        return () => clearTimeout(timeoutId);
    }, [children]);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === "left"
                ? scrollLeft - clientWidth * 0.8
                : scrollLeft + clientWidth * 0.8;

            scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
        }
    };

    return (
        <section className="relative group/section">
            <div className="flex items-end justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {title}
                </h2>
                {onShowAll && (
                    <span
                        onClick={onShowAll}
                        className="text-xs sm:text-sm text-zinc-400 font-bold hover:underline cursor-pointer tracking-wider"
                    >
                        Show all
                    </span>
                )}
            </div>

            <div className="relative">
                {/* Left Button */}
                {showLeftArrow && (
                    <button
                        onClick={() => scroll("left")}
                        className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-30 hidden md:flex items-center justify-center h-11 w-11 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white opacity-0 group-hover/section:opacity-100 transition-all duration-300 hover:scale-105 shadow-xl border border-zinc-700"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                {/* Scrollable Container */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto scroll-smooth scrollbar-none pb-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {children}
                </div>

                {/* Right Button */}
                {showRightArrow && (
                    <button
                        onClick={() => scroll("right")}
                        className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-30 hidden md:flex items-center justify-center h-11 w-11 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white opacity-0 group-hover/section:opacity-100 transition-all duration-300 hover:scale-105 shadow-xl border border-zinc-700"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
            </div>
        </section>
    );
}