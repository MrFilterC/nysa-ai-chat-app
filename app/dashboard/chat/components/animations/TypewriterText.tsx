import { useState, useEffect } from 'react';

/**
 * Yazı makinesi efekti animasyonu bileşeni
 */
interface TypewriterTextProps {
  text: string;
  onComplete?: () => void;
}

export default function TypewriterText({ text, onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(currentIndex + 1);
      }, 15 + Math.random() * 20); // Random delay between 15-35ms for natural effect
      
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);
  
  useEffect(() => {
    // Reset when new text is provided
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);
  
  return <div className="whitespace-pre-wrap">{displayedText}</div>;
} 