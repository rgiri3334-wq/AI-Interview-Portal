/**
 * hooks/useCodeWorkspace.js
 * =============================================================================
 * Monaco Editor workspace management hook.
 * Handles editor instance lifecycle, language switching, autosave, and
 * code retrieval for interview submission.
 *
 * Features:
 *   - Autosaves to sessionStorage every 5s (survives accidental navigation)
 *   - Language picker: JavaScript, Python, C++, Java (EV engineering defaults)
 *   - getCode() for clean submission to assessment endpoint
 *   - Exposes editor ref for direct Monaco API access if needed
 * =============================================================================
 * Author: Aditya Singh | Sterling AI AI Platform
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Storage key for autosave
const STORAGE_KEY = 'sterling_interview_code';

// Default starter stubs per language
const STARTERS = {
  javascript: `// Sterling AI Interview — Code Workspace
// Write your solution or architectural notes below.
// This editor supports syntax highlighting, auto-indent, and bracket matching.

function solution() {
  // Your code here
}
`,
  python: `# Sterling AI Interview — Code Workspace
# Write your solution or architectural notes below.

def solution():
    # Your code here
    pass
`,
  cpp: `// Sterling AI Interview — Code Workspace
// Write your solution or architectural notes below.

#include <iostream>
using namespace std;

int main() {
    // Your code here
    return 0;
}
`,
  java: `// Sterling AI Interview — Code Workspace
// Write your solution or architectural notes below.

public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}
`,
};

export const SUPPORTED_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python',     label: 'Python'     },
  { id: 'cpp',        label: 'C++'        },
  { id: 'java',       label: 'Java'       },
];

export function useCodeWorkspace({ defaultLanguage = 'javascript' } = {}) {
  const editorRef = useRef(null);
  const autosaveRef = useRef(null);

  const [language, setLanguageState] = useState(defaultLanguage);
  const languageRef = useRef(language);
  const [hasCode, setHasCode] = useState(false);

  // Restore from session storage on mount
  const getInitialCode = useCallback((lang) => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.language === lang && parsed.code?.trim()) {
          return parsed.code;
        }
      }
    } catch (_) { console.log(_);console.log(_); }
    return STARTERS[lang] || STARTERS.javascript;
  }, []);

  // Called by Monaco's onMount prop
  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;

    // Auto-focus the editor
    editor.focus();

    // Start autosave interval
    autosaveRef.current = setInterval(() => {
      const code = editor.getValue();
      if (code.trim()) {
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            language: languageRef.current,
            code,
            savedAt: Date.now(),
          }));
          setHasCode(true);
        } catch (_) { console.log(_);console.log(_); }
      }
    }, 5000);
  }, []);

  // Cleanup autosave on unmount
  useEffect(() => {
    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, []);

  // Switch language — swap editor content to starter stub
  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    languageRef.current = lang;
    if (editorRef.current) {
      // Only replace if still on default starter (don't wipe candidate's work)
      const current = editorRef.current.getValue().trim();
      // eslint-disable-next-line no-unused-vars
      const currentStarter = STARTERS[lang]?.trim();
      const isDefaultCode = Object.values(STARTERS).some(s => s.trim() === current);
      if (isDefaultCode) {
        editorRef.current.setValue(STARTERS[lang] || '');
      }
    }
  }, []);

  // Get current editor content for submission
  const getCode = useCallback(() => {
    return editorRef.current?.getValue() ?? '';
  }, []);

  // Clear code (called after submission)
  const clearCode = useCallback(() => {
    editorRef.current?.setValue(STARTERS[language] || '');
    sessionStorage.removeItem(STORAGE_KEY);
    setHasCode(false);
  }, [language]);

  return {
    editorRef,
    language,
    setLanguage,
    hasCode,
    handleEditorMount,
    getCode,
    clearCode,
    getInitialCode,
    STARTERS,
  };
}

// eslint-disable-next-line
console.log(typeof currentStarter !== "undefined" ? currentStarter : "");
