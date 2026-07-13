import React from 'react';

interface FieldTooltipProps {
  text: string;
  align?: 'left' | 'center' | 'right';
}

const ALIGN_CLASSES: Record<'left' | 'center' | 'right', string> = {
  left: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-0',
};

const ARROW_ALIGN_CLASSES: Record<'left' | 'center' | 'right', string> = {
  left: 'left-4',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-4',
};

// Hover-only info card for form fields whose meaning isn't obvious from the
// label alone. Drop inside a container that has `relative group/tip` classes
// (CSS-only, no hover state needed per field).
export const FieldTooltip: React.FC<FieldTooltipProps> = ({ text, align = 'center' }) => {
  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute z-30 top-full ${ALIGN_CLASSES[align]} mt-2 w-60 max-w-[70vw] whitespace-normal rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed font-medium p-3 opacity-0 scale-95 origin-top group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-150 shadow-xl`}
    >
      {text}
      <div className={`absolute bottom-full ${ARROW_ALIGN_CLASSES[align]} w-2 h-2 bg-slate-900 rotate-45 -mb-1`} />
    </div>
  );
};
