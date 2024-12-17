'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface ImageSliderProps {
  images: string[];
}

export default function ImageSlider({ images }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transition = () => {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToNext = () => {
    transition();
    setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
  };

  const goToPrevious = () => {
    transition();
    setCurrentIndex(prevIndex => (prevIndex - 1 + images.length) % images.length);
  };

  const goToSlide = (index: number) => {
    if (index === currentIndex) return;
    transition();
    setCurrentIndex(index);
  };

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {images.map((image, index) => (
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
        {images.map((_, index) => (
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
