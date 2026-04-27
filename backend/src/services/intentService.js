// classifyNodeIntent(text) → calls Claude API
//   Prompt: "Classify this text as one of: action_item, decision, question, reference.
//            Return JSON: { intent, confidence }"
//   If intent === "action_item": call eventService.insertEvent("TASK_CREATED", ...)
//   Debounce: only call AI after user stops typing for 1500ms
//   Returns: { intent: "action_item" | "decision" | "question" | "reference" }