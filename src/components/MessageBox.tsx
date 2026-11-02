'use client';

import React, { useState } from 'react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

export type MessageBoxType = 'danger' | 'warning' | 'info' | 'success';

export interface MessageBoxOptions {
  title?: string;
  message: string;
  type?: MessageBoxType;
  confirmText?: string;
  cancelText?: string | null;
  isPrompt?: boolean;
  promptPlaceholder?: string;
  promptExpectedValue?: string; // If set, confirm button requires this value
  onConfirm?: (inputValue?: string) => void | Promise<void>;
  onCancel?: () => void;
}

interface MessageBoxProps {
  isOpen: boolean;
  options: MessageBoxOptions | null;
  onClose: () => void;
}

export default function MessageBox({ isOpen, options, onClose }: MessageBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !options) return null;

  const {
    title,
    message,
    type = 'warning',
    confirmText = 'Confirm',
    cancelText = options.type === 'info' || options.type === 'success' ? null : 'Cancel',
    isPrompt = false,
    promptPlaceholder = '',
    promptExpectedValue,
    onConfirm,
    onCancel,
  } = options;

  const handleConfirm = async () => {
    if (promptExpectedValue && inputValue !== promptExpectedValue) {
      return;
    }
    setLoading(true);
    try {
      if (onConfirm) {
        await onConfirm(inputValue);
      }
      onClose();
      setInputValue('');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
    setInputValue('');
  };

  const isConfirmDisabled = promptExpectedValue ? inputValue !== promptExpectedValue : false;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'warning':
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-50 border-rose-200 text-rose-600';
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-600';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-600';
      case 'warning':
      default:
        return 'bg-amber-50 border-amber-200 text-amber-600';
    }
  };

  const getConfirmBtnStyle = () => {
    if (type === 'danger') {
      return 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500';
    }
    return 'bg-yale-700 hover:bg-yale-800 text-white focus:ring-yale-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${getIconBg()}`}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {title || (type === 'danger' ? 'Confirm Dangerous Action' : 'System Confirmation')}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {message}
              </p>

              {isPrompt && (
                <div className="mt-3.5">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={promptPlaceholder}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-yale-500 focus:border-yale-500 font-mono"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isConfirmDisabled) {
                        handleConfirm();
                      }
                    }}
                  />
                  {promptExpectedValue && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Type <span className="font-mono font-bold text-slate-700">{promptExpectedValue}</span> to proceed.
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors -mr-1 -mt-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            {cancelText && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || isConfirmDisabled}
              className={`px-4 py-2 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${getConfirmBtnStyle()}`}
            >
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
