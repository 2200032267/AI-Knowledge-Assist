import { useRef, useState } from "react";

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

export default function NewChatButton({ disabled, onClick }) {
  const [locked, setLocked] = useState(false);
  const lockTimeoutRef = useRef(null);

  const handleClick = async () => {
    if (disabled || locked) return;

    setLocked(true);
    try {
      await onClick?.();
    } finally {
      // Basic anti-spam debounce (spec: handle rapid clicks)
      lockTimeoutRef.current = window.setTimeout(() => {
        setLocked(false);
      }, 500);
    }
  };

  return (
    <button className="btn-new-chat" onClick={handleClick} disabled={disabled || locked}>
      <IconPlus />
      New Chat
    </button>
  );
}
