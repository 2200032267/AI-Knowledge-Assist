export const UNIVERSAL_ACTIONS = [
  {
    id: "summarize",
    label: "Summarize",
    icon: "📄",
    prompt: "Summarize this document in 5-7 bullet points. Focus on main ideas:\n\n{text}",
  },
  {
    id: "study_notes",
    label: "Study Notes",
    icon: "📝",
    prompt: "Create detailed study notes with headings, subpoints, and definitions from:\n\n{text}",
  },
  {
    id: "key_points",
    label: "Key Points",
    icon: "🎯",
    prompt: "Extract the 5 most important facts or concepts from this document:\n\n{text}",
  },
  {
    id: "faq",
    label: "FAQ",
    icon: "❓",
    prompt: "Generate 5-10 frequently asked questions with answers based on:\n\n{text}",
  },
  {
    id: "action_items",
    label: "Action Items",
    icon: "✅",
    prompt: "List all todos, deadlines, and action items mentioned in:\n\n{text}",
  },
];

export const PERSONA_ACTIONS = {
  student: {
    name: "Student",
    icon: "🎓",
    color: "#3B82F6",
    actions: [
      { id: "flashcards", label: "Flashcards", icon: "🗂️", prompt: "Create Anki-style flashcards Q&A from:\n\n{text}" },
      { id: "definitions", label: "Definitions", icon: "📘", prompt: "Extract all terms and their definitions:\n\n{text}" },
      { id: "timeline", label: "Timeline", icon: "🕒", prompt: "Create chronological timeline of events:\n\n{text}" },
      { id: "quiz", label: "Quiz", icon: "🧠", prompt: "Generate 5 MCQ questions with answers:\n\n{text}" },
      { id: "simplify", label: "Simplify", icon: "🧒", prompt: "Rewrite this document in ELI5 style:\n\n{text}" },
    ],
  },
  software: {
    name: "Software Dev",
    icon: "💻",
    color: "#10B981",
    actions: [
      { id: "extract_api", label: "Extract APIs", icon: "🔌", prompt: "List all API endpoints, methods, params:\n\n{text}" },
      { id: "find_code", label: "Find Code", icon: "</>", prompt: "Extract all code blocks and snippets:\n\n{text}" },
      { id: "dependencies", label: "Dependencies", icon: "📦", prompt: "List all libraries/packages mentioned:\n\n{text}" },
      { id: "readme", label: "README", icon: "📄", prompt: "Generate README.md from this technical doc:\n\n{text}" },
      { id: "test_cases", label: "Test Cases", icon: "✅", prompt: "Generate unit test ideas from spec:\n\n{text}" },
    ],
  },
  business: {
    name: "Business",
    icon: "📊",
    color: "#F59E0B",
    actions: [
      { id: "exec_summary", label: "Exec Summary", icon: "📌", prompt: "3-bullet TL;DR for executives:\n\n{text}" },
      { id: "metrics", label: "Metrics/KPIs", icon: "📈", prompt: "Extract all numbers, %, $ amounts:\n\n{text}" },
      { id: "swot", label: "SWOT", icon: "🧩", prompt: "Create SWOT analysis:\n\n{text}" },
      { id: "risks", label: "Risks", icon: "⚠️", prompt: "List all risks and mitigations:\n\n{text}" },
      { id: "stakeholders", label: "Stakeholders", icon: "👥", prompt: "List all names, roles, teams:\n\n{text}" },
    ],
  },
  legal: {
    name: "Legal",
    icon: "⚖️",
    color: "#8B5CF6",
    actions: [
      { id: "clauses", label: "Clauses", icon: "📜", prompt: "One-line summary per clause:\n\n{text}" },
      { id: "obligations", label: "Obligations", icon: "📝", prompt: "Extract all 'Party X must...' statements:\n\n{text}" },
      { id: "deadlines", label: "Deadlines", icon: "⏰", prompt: "List all dates and what is due:\n\n{text}" },
      { id: "payment", label: "Payment Terms", icon: "💳", prompt: "Extract amount, schedule, penalties:\n\n{text}" },
      { id: "liability", label: "Liability", icon: "🛡️", prompt: "Find indemnity/liability clauses:\n\n{text}" },
    ],
  },
};
