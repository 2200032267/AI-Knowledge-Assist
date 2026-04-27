import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, ChevronRight, Code, GraduationCap, Info, Scale, X, Zap } from "lucide-react";
import { PERSONA_ACTIONS, UNIVERSAL_ACTIONS } from "../config/agentActions";
import "./AgentActionsInfo.css";

const personaIcons = {
  student: <GraduationCap size={24} />,
  software: <Code size={24} />,
  business: <BarChart3 size={24} />,
  legal: <Scale size={24} />,
};

export default function AgentActionsInfo({ activeDoc }) {
  const [expandedPersona, setExpandedPersona] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);

  const isEnabled = Boolean(activeDoc);

  const totalPersonaActions = useMemo(() => {
    return Object.values(PERSONA_ACTIONS).reduce((sum, persona) => sum + persona.actions.length, 0);
  }, []);

  return (
    <div className="agent-info-page">
      <div className="agent-info-header">
        <div className="agent-info-logo-wrap">
          <Zap size={24} />
        </div>
        <div>
          <h1>Agent Actions</h1>
          <p>Pre-built AI workflows for your documents</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`agent-info-status ${isEnabled ? "enabled" : "disabled"}`}
      >
        <Info size={18} className="agent-info-status-icon" />
        <div>
          <p className="agent-info-status-title">{isEnabled ? "Agent Actions Active" : "Upload PDF to Enable"}</p>
          <p className="agent-info-status-text">
            {isEnabled
              ? `Execution happens inside Document Chat for: ${activeDoc.name || activeDoc.filename || "selected file"}.`
              : "Switch to Document Mode and upload a PDF to unlock action chips in chat."}
          </p>
        </div>
      </motion.div>

      <section className="agent-info-section">
        <h2>Universal Actions</h2>
        <p>Available for all documents - core one-click prompts</p>
        <div className="agent-info-universal-grid">
          {UNIVERSAL_ACTIONS.map((action) => (
            <div key={action.id} className="agent-info-universal-card">
              <div className="agent-info-universal-title">
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </div>
              <p>{String(action.prompt).split("\n")[0]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="agent-info-section">
        <h2>Persona Actions</h2>
        <p>
          4 personas with {totalPersonaActions} specialized actions. Expand a card to inspect all categories.
        </p>

        <div className="agent-info-persona-list">
          {Object.entries(PERSONA_ACTIONS).map(([key, persona]) => (
            <motion.div key={key} layout className="agent-info-persona-card-wrap">
              <button
                className="agent-info-persona-header"
                onClick={() => setExpandedPersona((prev) => (prev === key ? null : key))}
              >
                <div className="agent-info-persona-header-left">
                  <div
                    className="agent-info-persona-icon"
                    style={{ backgroundColor: `${persona.color}1A`, color: persona.color }}
                  >
                    {personaIcons[key]}
                  </div>
                  <div>
                    <h3>{persona.name}</h3>
                    <p>{persona.actions.length} action categories</p>
                  </div>
                </div>
                <motion.div animate={{ rotate: expandedPersona === key ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight size={18} className="agent-info-chevron" />
                </motion.div>
              </button>

              <AnimatePresence>
                {expandedPersona === key ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    className="agent-info-persona-body"
                  >
                    <div className="agent-info-persona-actions">
                      {persona.actions.map((action) => (
                        <motion.button
                          key={action.id}
                          initial={{ x: -8, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          whileHover={{ x: 3 }}
                          onClick={() => setSelectedAction(action)}
                          className="agent-info-action-preview"
                        >
                          <p>• {action.label}</p>
                          <span>{String(action.prompt).split("\n")[0]}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {selectedAction ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="agent-info-modal-overlay"
            onClick={() => setSelectedAction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="agent-info-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="agent-info-modal-top">
                <h3>{selectedAction.label}</h3>
                <button onClick={() => setSelectedAction(null)}>
                  <X size={18} />
                </button>
              </div>
              <p className="agent-info-modal-sub">Prompt template:</p>
              <pre>{selectedAction.prompt}</pre>
              <button className="agent-info-modal-close" onClick={() => setSelectedAction(null)}>
                Close
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
