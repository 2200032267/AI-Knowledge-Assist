import { useEffect, useState } from "react";
import "./LandingPage.css";
import LoginModal from "../components/LoginModal";

export default function LandingPage({
  apiBase,
  defaultSettings,
  showLogin,
  setShowLogin,
  onLoginSuccess,
  onToast,
}) {
  const [pendingAction, setPendingAction] = useState(null);

  const openModal = (cb = null) => {
    setPendingAction(() => cb);
    setShowLogin(true);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setShowLogin(false);
    document.body.style.overflow = "";
    setPendingAction(null);
  };

  useEffect(() => {
    if (!showLogin) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
  }, [showLogin]);

  return (
    <div className="landing-root">
      <div className={`homepage ${showLogin ? "blurred" : ""}`} id="homepage">
        <header>
          <div className="nav">
            <div className="logo">
              <div className="logo-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <span>AI Knowledge Assistant</span>
            </div>



            <button className="nav-btn" onClick={() => openModal()} id="navLoginBtn">
              Sign In
            </button>
          </div>
        </header>

        <main className="hero">
          <h1>
            Your AI-Powered
            <br />
            Knowledge Hub
          </h1>
          <p>
            Organize, search, and chat with your documents. AI Knowledge Assistant transforms your data into actionable
            insights instantly.
          </p>
          <button
            className="hero-btn"
            onClick={() =>
              openModal(() => {
                onToast?.("success", "Welcome back!");
              })
            }
            id="heroCta"
          >
            Get Started Free
          </button>
        </main>

        <footer className="landing-footer">
          <div className="landing-footer-brand">
            <div className="landing-footer-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <span>AI Knowledge Assistant</span>
          </div>
          <p>© 2026 Developed by N Vighnesh. All rights reserved.</p>
        </footer>
      </div>

      {showLogin && (
        <LoginModal
          apiBase={apiBase}
          defaultSettings={defaultSettings}
          onClose={() => {
            closeModal();
            if (typeof pendingAction === "function") {
              try {
                pendingAction();
              } catch {
                // ignore
              }
            }
          }}
          onLoginSuccess={onLoginSuccess}
          onToast={onToast}
        />
      )}
    </div>
  );
}
