import { useEffect, useMemo, useState } from "react";
import { X, Mail, Lock, Eye, EyeOff } from "lucide-react";
import {
  login,
  loginUserSession,
  signup,
} from "../auth";

export default function LoginModal({
  apiBase,
  defaultSettings,
  onClose,
  onLoginSuccess,
  onToast,
}) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resolvedApiBase = apiBase || import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    try {
      const last = window.localStorage.getItem("last_login_email") || "";
      if (last && !email) setEmail(last);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const doLogin = (user, successMessage) => {
    console.debug("[auth] finalize login", { email: user.email, name: user.name });
    loginUserSession(user, defaultSettings, rememberMe);

    if (rememberMe) {
      // We still keep session in sessionStorage, but rememberMe can prefill email.
      try {
        window.localStorage.setItem("last_login_email", user.email);
      } catch {
        // ignore
      }
    }

    onToast?.("success", successMessage);
    onLoginSuccess?.(user);
    onClose?.();
  };

  const postAuth = async (path, payload) => {
    const url = `${resolvedApiBase}${path}`;
    console.debug("[auth] POST start", url, payload);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    console.debug("[auth] POST end", url, { status: res.status, ok: res.ok, data });
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || "Auth request failed");
    }

    return data;
  };

  const handleSignup = async (e) => {
    e?.preventDefault?.();
    console.debug("[auth] handleSignup invoked", {
      isSignup,
      email: normalizedEmail,
      hasName: Boolean(name.trim()),
      passwordLength: password.length,
    });
    if (!name.trim()) {
      onToast?.("error", "Name is required");
      return;
    }
    if (!normalizedEmail) {
      onToast?.("error", "Email is required");
      return;
    }
    if (!password) {
      onToast?.("error", "Password is required");
      return;
    }
    if (password.length < 5) {
      onToast?.("error", "Password must be 5+ characters");
      return;
    }

    setIsLoading(true);
    try {
      await postAuth("/auth/signup", { name: name.trim(), email: normalizedEmail, password });
      const res = signup({ name: name.trim(), email: normalizedEmail, password });
      if (!res.ok) {
        onToast?.("error", res.error || "Signup failed");
        return;
      }
      // Clear form after successful signup
      setName("");
      setEmail("");
      setPassword("");
      setShowPassword(false);

      // Now complete the login
      doLogin(res.user, "Account created!");
    } catch (err) {
      onToast?.("error", "Signup failed: " + (err?.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    console.debug("[auth] handleLogin invoked", {
      isSignup,
      email: normalizedEmail,
      passwordLength: password.length,
    });
    if (!normalizedEmail) {
      onToast?.("error", "Email is required");
      return;
    }
    if (!password) {
      onToast?.("error", "Password is required");
      return;
    }

    setIsLoading(true);
    try {
      await postAuth("/auth/login", { email: normalizedEmail, password });
      const res = login({ email: normalizedEmail, password });
      if (!res.ok) {
        onToast?.("error", res.error || "Login failed");
        return;
      }

      // Clear password after successful login
      setPassword("");
      setShowPassword(false);

      doLogin(res.user, `Welcome back, ${res.user.name}`);
    } catch (err) {
      onToast?.("error", "Login failed: " + (err?.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay active"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal">
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="modal-content">
          <div className="modal-header">
            <div className="modal-logo">
              <div className="modal-logo-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <div className="modal-title" id="modalTitle">
                Welcome to AI Knowledge Assistant
              </div>
            </div>
          </div>

          <div className="tabs" role="tablist">
            <button
              className={`tab ${!isSignup ? "active" : ""}`}
              role="tab"
              aria-selected={!isSignup}
              onClick={() => setIsSignup(false)}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`tab ${isSignup ? "active" : ""}`}
              role="tab"
              aria-selected={isSignup}
              onClick={() => setIsSignup(true)}
              type="button"
            >
              Create Account
            </button>
          </div>

          <form onSubmit={isSignup ? handleSignup : handleLogin}>
            <div className={`form-container ${isSignup ? "active" : ""}`}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={18} />
                <input
                  className="form-input with-icon"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock className="input-icon" size={18} />
                <input
                  className="form-input with-icon with-trailing"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                />
                <button
                  className="eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isSignup && (
              <div className="form-row">
                <label className="checkbox-group">
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkbox-label">Remember me</span>
                </label>
              </div>
            )}

            <button
              className="btn-primary"
              disabled={isLoading}
              type="button"
              onClick={isSignup ? handleSignup : handleLogin}
            >
              {isLoading ? "Loading..." : isSignup ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="terms">
            By continuing you agree to <span className="link">Terms</span> and <span className="link">Privacy Policy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
