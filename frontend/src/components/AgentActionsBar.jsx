import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Sparkles, X } from "lucide-react";
import { PERSONA_ACTIONS, UNIVERSAL_ACTIONS } from "../config/agentActions";
import "./AgentActionsBar.css";

const DEFAULT_ENABLED_ACTIONS = ["summarize", "study_notes", "key_points", "faq", "action_items"];

export default function AgentActionsBar({ activeDoc, currentMode, onRunAgent, onToast, enabledActionIds }) {
  const [activePersona, setActivePersona] = useState(null);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);

  const isEnabled = currentMode === "document" && Boolean(activeDoc);

  const currentActions = useMemo(() => {
    const allowed =
      Array.isArray(enabledActionIds) && enabledActionIds.length > 0
        ? new Set(enabledActionIds)
        : new Set(DEFAULT_ENABLED_ACTIONS);

    const universal = UNIVERSAL_ACTIONS.filter((action) => allowed.has(action.id));

    if (!activePersona) return universal;

    if (activePersona) return PERSONA_ACTIONS[activePersona]?.actions || universal;
    return universal;
  }, [activePersona, enabledActionIds]);

  const handleRunAction = (action) => {
    if (!isEnabled) {
      onToast?.("error", "Upload a PDF in Document Mode to use Agent Actions");
      return;
    }
    onRunAgent?.(action);
  };

  if (!isEnabled) {
    return (
      <div className="agent-actions-disabled-wrap">
        <p>Upload a PDF in Document Mode to use Agent Actions</p>
      </div>
    );
  }

  return (
    <>
      <div className="agent-actions-wrap">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePersona || "universal"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="agent-actions-scroll"
          >
            {activePersona ? (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setActivePersona(null)}
                className="agent-chip back"
              >
                <ChevronLeft size={14} />
                Back
              </motion.button>
            ) : null}

            {currentActions.map((action, idx) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleRunAction(action)}
                className="agent-chip"
                style={{ borderColor: activePersona ? PERSONA_ACTIONS[activePersona]?.color : undefined }}
              >
                <span>{action.icon || "⚡"}</span>
                {action.label}
              </motion.button>
            ))}

            {currentActions.length === 0 && !activePersona ? (
              <div className="agent-chip" style={{ opacity: 0.7, cursor: "default" }}>
                Enable actions in Settings
              </div>
            ) : null}

            {!activePersona ? (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                onClick={() => setShowPersonaPicker(true)}
                className="agent-chip persona"
              >
                <Sparkles size={14} />
                Persona
              </motion.button>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPersonaPicker ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="agent-persona-overlay"
            onClick={() => setShowPersonaPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="agent-persona-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="agent-persona-header">
                <h3>Choose Persona</h3>
                <button onClick={() => setShowPersonaPicker(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="agent-persona-grid">
                {Object.entries(PERSONA_ACTIONS).map(([key, persona]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActivePersona(key);
                      setShowPersonaPicker(false);
                    }}
                    className="agent-persona-card"
                    style={{ borderColor: persona.color }}
                  >
                    <div className="agent-persona-icon">{persona.icon}</div>
                    <h4>{persona.name}</h4>
                    <p>{persona.actions.length} specialized actions</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
