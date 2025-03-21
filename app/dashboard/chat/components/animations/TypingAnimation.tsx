/**
 * Yazı yazılırken görülen animasyon bileşeni
 */
export default function TypingAnimation() {
  return (
    <div className="flex items-center space-x-2 p-2">
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "0ms" }}></div>
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "300ms" }}></div>
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "600ms" }}></div>
    </div>
  );
} 