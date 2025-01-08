'use client';

import { LanguageType } from '@src/modules/i18n';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface ImageSliderProps extends LanguageType {}

export default function ImageSlider({ lng }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const IMAGES = [
    `/images/pngs/introduction/${lng}/1.png`,
    `/images/pngs/introduction/${lng}/2.png`,
    `/images/pngs/introduction/${lng}/3.png`,
    `/images/pngs/introduction/${lng}/4.png`,
    `/images/pngs/introduction/${lng}/5.png`,
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const visibleRatio = Math.min(Math.max((viewportHeight - Math.max(0, rect.top)) / rect.height, 0), 1);

      const topRatio = Math.max(0, Math.min(1, 1 - rect.top / viewportHeight));

      const maxScale = 1.5;
      const newScale = 1 + (maxScale - 1) * Math.min(visibleRatio, topRatio);

      setScale(newScale);
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // 초기 스케일 설정
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 0,
    });

    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const transition = () => {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToNext = () => {
    transition();
    setCurrentIndex(prevIndex => (prevIndex + 1) % IMAGES.length);
  };

  const goToPrevious = () => {
    transition();
    setCurrentIndex(prevIndex => (prevIndex - 1 + IMAGES.length) % IMAGES.length);
  };

  const goToSlide = (index: number) => {
    if (index === currentIndex) return;
    transition();
    setCurrentIndex(index);
  };

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-3xl">
      <div
        className="relative aspect-[16/9] w-full overflow-hidden"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.2s ease-out',
        }}>
        {IMAGES.map((image, index) => (
          <Image
            key={image}
            src={image}
            alt={`Slide ${index + 1}`}
            fill
            className={`absolute inset-0 bg-black/5 object-contain transition-opacity duration-300 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
            priority={index === currentIndex}
          />
        ))}
      </div>

      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-2">
        <button
          onClick={goToPrevious}
          disabled={isTransitioning}
          className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
          aria-label="Previous slide">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <button
          onClick={goToNext}
          disabled={isTransitioning}
          className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
          aria-label="Next slide">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            disabled={isTransitioning}
            className={`h-1.5 rounded-full transition-all disabled:opacity-50 ${
              index === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
