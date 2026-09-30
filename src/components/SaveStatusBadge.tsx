import React from 'react';
import { useSaveStatus } from '../context/SaveStatusContext';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export const SaveStatusBadge: React.FC = () => {
  const { status, errorMessage } = useSaveStatus();

  if (status === 'idle') {
    return (
      <span
        id="save-status-idle"
        className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 transition-opacity duration-200"
        title="All changes saved to cloud"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
        Saved
      </span>
    );
  }

  if (status === 'saving') {
    return (
      <span
        id="save-status-saving"
        className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 transition-opacity duration-200"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500 dark:text-zinc-400" />
        Saving...
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span
        id="save-status-saved"
        className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 transition-opacity duration-200 font-medium"
      >
        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        Saved
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        id="save-status-error"
        className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 transition-opacity duration-200 font-medium"
        title={errorMessage}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
        {errorMessage || 'Failed to save'}
      </span>
    );
  }

  return null;
};
