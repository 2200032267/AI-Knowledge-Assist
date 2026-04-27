import { useEffect, useState } from "react";
import MessageRenderer from "./MessageRenderer";

const WORD_DELAY_MS = 28;

export default function StreamingText({ text, onComplete }) {
  const [visibleWords, setVisibleWords] = useState(0);

  useEffect(() => {
    const words = String(text || "").split(/\s+/).filter(Boolean);

    if (!words.length) {
      onComplete?.();
      return undefined;
    }

    setVisibleWords(0);

    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setVisibleWords(current);

      if (current >= words.length) {
        clearInterval(timer);
        onComplete?.();
      }
    }, WORD_DELAY_MS);

    return () => clearInterval(timer);
  }, [text, onComplete]);

  const allWords = String(text || "").split(/\s+/).filter(Boolean);
  const renderedText = allWords.slice(0, visibleWords).join(" ");

  return <MessageRenderer content={renderedText} isUser={false} />;
}
