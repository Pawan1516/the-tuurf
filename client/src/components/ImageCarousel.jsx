import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ImageCarousel = ({ images = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Default images if none provided
  const carouselImages = images.length > 0 ? images : [
    '/images/turf1.jpg',
    '/images/turf2.jpg',
    '/images/turf3.jpg',
    '/images/turf4.jpg',
  ];

  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [autoPlay, carouselImages.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    setAutoPlay(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
    setAutoPlay(false);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setAutoPlay(false);
  };

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden shadow-lg">
      {/* Main Carousel Container */}
      <div className="relative w-full h-96 md:h-96 lg:h-96">
        {/* Slides */}
        {carouselImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={`Slide ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/1200x400?text=Turf+Image';
              }}
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          </div>
        ))}

        {/* Left Arrow */}
        <button
          onClick={prevSlide}
          onMouseEnter={() => setAutoPlay(false)}
          onMouseLeave={() => setAutoPlay(true)}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 z-10 transition-all duration-200"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6 text-black" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={nextSlide}
          onMouseEnter={() => setAutoPlay(false)}
          onMouseLeave={() => setAutoPlay(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 z-10 transition-all duration-200"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6 text-black" />
        </button>

        {/* Slide Counter */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
          {currentSlide + 1} / {carouselImages.length}
        </div>
      </div>

      {/* Dots/Indicators */}
      <div className="flex justify-center gap-2 py-4 bg-gray-900">
        {carouselImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-green-500 w-8'
                : 'bg-gray-600 w-3 hover:bg-gray-500'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
