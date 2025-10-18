import * as React from "react";

export function SimpleModal({ open, onOpenChange, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 relative">
        <button
          className="sticky top-4 right-4 z-10 float-right text-gray-400 hover:text-gray-600 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:shadow-lg transition-all text-2xl font-light"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
        >
          ×
        </button>
        <div className="p-6 pt-2 clear-right">
          {children}
        </div>
      </div>
    </div>
  );
}
