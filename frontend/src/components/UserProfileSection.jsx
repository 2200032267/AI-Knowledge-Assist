import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, LogOut, Settings } from "lucide-react";

export default function UserProfileSection({
  currentUser,
  userName,
  userEmail,
  userInitials,
  onOpenSettings,
  onLogout,
  onToast,
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userCache, setUserCache] = useState({ name: "", email: "" });
  const wrapperRef = useRef(null);

  useEffect(() => {
    const loadUserData = () => {
      try {
        const cached = window.sessionStorage.getItem("user_cache") || window.localStorage.getItem("user_cache");
        if (cached) {
          setUserCache(JSON.parse(cached));
          return;
        }
      } catch {
        // ignore session cache parse issues
      }

      try {
        const userId = window.sessionStorage.getItem("session");
        const users = JSON.parse(window.localStorage.getItem("users") || "[]");
        const user = users.find((u) => u.id === userId);
        if (user) {
          const next = { name: user.name || "", email: user.email || "" };
          setUserCache(next);
          window.sessionStorage.setItem("user_cache", JSON.stringify(next));
          return;
        }
      } catch {
        // ignore local db parse issues
      }

      setUserCache({
        name: currentUser?.name || "",
        email: currentUser?.email || "",
      });
    };

    loadUserData();
  }, [currentUser]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const resolvedName = useMemo(() => {
    return userCache?.name || userName || currentUser?.name || "User";
  }, [currentUser, userCache, userName]);

  const resolvedEmail = useMemo(() => {
    return userCache?.email || userEmail || currentUser?.email || "user@example.com";
  }, [currentUser, userCache, userEmail]);

  const resolvedInitials = useMemo(() => {
    if (userInitials) return userInitials;
    const raw = String(resolvedName || "").trim();
    if (!raw) return "U";
    const parts = raw.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
    return `${a}${b || ""}`.toUpperCase();
  }, [resolvedName, userInitials]);

  const handleLogout = () => {
    onToast?.("success", `${resolvedName} logged out successfully`);
    window.sessionStorage.clear();
    setShowDropdown(false);
    onLogout?.();
  };

  return (
    <div className="user-profile-section" ref={wrapperRef}>
      {showDropdown && (
        <div className="profile-dropdown" role="menu" aria-label="User menu">
          <button
            className="profile-dropdown-item"
            onClick={() => {
              onOpenSettings?.();
              setShowDropdown(false);
            }}
          >
            <Settings size={16} />
            Settings
          </button>

          <button className="profile-dropdown-item logout" onClick={handleLogout}>
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      )}

      <button
        className="profile-button"
        onClick={() => setShowDropdown((prev) => !prev)}
        aria-expanded={showDropdown}
        aria-label="Open user menu"
      >
        <div className="avatar">{resolvedInitials}</div>

        <div className="user-info">
          <div className="user-name">{resolvedName}</div>
          <div className="user-email">{resolvedEmail}</div>
        </div>

        <ChevronUp
          size={16}
          className={`profile-chevron ${showDropdown ? "" : "rotated"}`}
        />
      </button>
    </div>
  );
}
