import React from 'react';
import { X, Keyboard } from 'lucide-react';

/**
 * COMPONENT: KEYBOARD SHORTCUTS HELP MODAL
 */
const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl', 'K'], mac: ['⌘', 'K'], description: 'Open new chat' },
    { keys: ['Esc'], mac: ['Esc'], description: 'Close modal / Go back' },
    { keys: ['Ctrl', '/'], mac: ['⌘', '/'], description: 'Show shortcuts' },
    { keys: ['Enter'], mac: ['Enter'], description: 'Send message' },
  ];

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#16202A] rounded-lg w-full max-w-sm shadow-xl border border-slate-200 dark:border-[#2D3A45]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-[#2D3A45]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#228DFF]" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 dark:text-[#8B98A5] hover:text-slate-600 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="space-y-3">
            {shortcuts.map((shortcut, idx) => {
              const displayKeys = isMac ? shortcut.mac : shortcut.keys;
              return (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-[#8B98A5]">
                    {shortcut.description}
                  </span>
                  <div className="flex gap-1">
                    {displayKeys.map((key, keyIdx) => (
                      <kbd
                        key={keyIdx}
                        className="px-2 py-1 text-xs font-semibold text-slate-700 dark:text-white bg-slate-100 dark:bg-[#0F1419] border border-slate-300 dark:border-[#2D3A45] rounded shadow-sm"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#2D3A45]">
            <p className="text-xs text-slate-500 dark:text-[#5B6B7A] text-center">
              Press <kbd className="px-1 py-0.5 text-xs font-semibold text-slate-700 dark:text-white bg-slate-100 dark:bg-[#0F1419] border border-slate-300 dark:border-[#2D3A45] rounded">
                {isMac ? '⌘' : 'Ctrl'}
              </kbd> + <kbd className="px-1 py-0.5 text-xs font-semibold text-slate-700 dark:text-white bg-slate-100 dark:bg-[#0F1419] border border-slate-300 dark:border-[#2D3A45] rounded">/</kbd> anytime to view shortcuts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
