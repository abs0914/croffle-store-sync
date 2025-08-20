import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  category: 'payment' | 'navigation' | 'cart' | 'general';
}

/**
 * Advanced keyboard shortcuts for POS system
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      return shortcut.key.toLowerCase() === event.key.toLowerCase() &&
             !!shortcut.ctrlKey === event.ctrlKey &&
             !!shortcut.altKey === event.altKey &&
             !!shortcut.shiftKey === event.shiftKey;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    showShortcutsHelp: () => {
      const shortcutsByCategory = shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) acc[shortcut.category] = [];
        acc[shortcut.category].push(shortcut);
        return acc;
      }, {} as Record<string, KeyboardShortcut[]>);

      console.group('⌨️ Keyboard Shortcuts');
      Object.entries(shortcutsByCategory).forEach(([category, shortcuts]) => {
        console.group(`${category.toUpperCase()}`);
        shortcuts.forEach(shortcut => {
          const keys = [
            shortcut.ctrlKey && 'Ctrl',
            shortcut.altKey && 'Alt', 
            shortcut.shiftKey && 'Shift',
            shortcut.key.toUpperCase()
          ].filter(Boolean).join(' + ');
          console.log(`${keys}: ${shortcut.description}`);
        });
        console.groupEnd();
      });
      console.groupEnd();
      
      toast.info('Keyboard shortcuts logged to console');
    }
  };
}

/**
 * POS-specific keyboard shortcuts
 */
export function usePOSKeyboardShortcuts({
  onPaymentMethodChange,
  onQuickAmount,
  onCompleteTransaction,
  onClearCart,
  onShowHelp,
  onFocusSearch
}: {
  onPaymentMethodChange?: (method: 'cash' | 'card' | 'e-wallet') => void;
  onQuickAmount?: (amount: number) => void;
  onCompleteTransaction?: () => void;
  onClearCart?: () => void;
  onShowHelp?: () => void;
  onFocusSearch?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [
    // Payment methods
    {
      key: '1',
      ctrlKey: true,
      action: () => onPaymentMethodChange?.('cash'),
      description: 'Switch to Cash payment',
      category: 'payment'
    },
    {
      key: '2', 
      ctrlKey: true,
      action: () => onPaymentMethodChange?.('card'),
      description: 'Switch to Card payment',
      category: 'payment'
    },
    {
      key: '3',
      ctrlKey: true, 
      action: () => onPaymentMethodChange?.('e-wallet'),
      description: 'Switch to E-wallet payment',
      category: 'payment'
    },
    
    // Quick amounts (for cash)
    {
      key: 'q',
      action: () => onQuickAmount?.(100),
      description: 'Quick amount: ₱100',
      category: 'payment'
    },
    {
      key: 'w',
      action: () => onQuickAmount?.(200), 
      description: 'Quick amount: ₱200',
      category: 'payment'
    },
    {
      key: 'e',
      action: () => onQuickAmount?.(500),
      description: 'Quick amount: ₱500',
      category: 'payment'
    },
    {
      key: 'r',
      action: () => onQuickAmount?.(1000),
      description: 'Quick amount: ₱1000',
      category: 'payment'
    },

    // Transaction actions
    {
      key: 'Enter',
      ctrlKey: true,
      action: () => onCompleteTransaction?.(),
      description: 'Complete transaction',
      category: 'payment'
    },
    {
      key: 'Delete',
      ctrlKey: true,
      action: () => onClearCart?.(),
      description: 'Clear cart',
      category: 'cart'
    },

    // Navigation
    {
      key: '/',
      action: () => onFocusSearch?.(),
      description: 'Focus search',
      category: 'navigation'
    },
    {
      key: 'F1',
      action: () => onShowHelp?.(),
      description: 'Show help',
      category: 'general'
    },

    // Function keys for common actions
    {
      key: 'F9',
      action: () => onCompleteTransaction?.(),
      description: 'Complete transaction (F9)',
      category: 'payment'
    },
    {
      key: 'F10',
      action: () => onPaymentMethodChange?.('cash'),
      description: 'Cash payment (F10)',
      category: 'payment'
    },
    {
      key: 'F11',
      action: () => onPaymentMethodChange?.('card'),
      description: 'Card payment (F11)',
      category: 'payment'
    },
    {
      key: 'F12',
      action: () => onPaymentMethodChange?.('e-wallet'),
      description: 'E-wallet payment (F12)',
      category: 'payment'
    }
  ];

  return useKeyboardShortcuts(shortcuts);
}

/**
 * Numeric keypad shortcuts for quick amount entry
 */
export function useNumericShortcuts(onAmountSelect: (amount: number) => void) {
  const shortcuts: KeyboardShortcut[] = [
    { key: '1', altKey: true, action: () => onAmountSelect(1), description: 'Quick ₱1', category: 'payment' },
    { key: '2', altKey: true, action: () => onAmountSelect(5), description: 'Quick ₱5', category: 'payment' },
    { key: '3', altKey: true, action: () => onAmountSelect(10), description: 'Quick ₱10', category: 'payment' },
    { key: '4', altKey: true, action: () => onAmountSelect(20), description: 'Quick ₱20', category: 'payment' },
    { key: '5', altKey: true, action: () => onAmountSelect(50), description: 'Quick ₱50', category: 'payment' },
    { key: '6', altKey: true, action: () => onAmountSelect(100), description: 'Quick ₱100', category: 'payment' },
    { key: '7', altKey: true, action: () => onAmountSelect(200), description: 'Quick ₱200', category: 'payment' },
    { key: '8', altKey: true, action: () => onAmountSelect(500), description: 'Quick ₱500', category: 'payment' },
    { key: '9', altKey: true, action: () => onAmountSelect(1000), description: 'Quick ₱1000', category: 'payment' },
  ];

  return useKeyboardShortcuts(shortcuts);
}