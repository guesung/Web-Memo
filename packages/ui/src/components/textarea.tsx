import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';
import * as React from 'react';

import { cn } from '../utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, HTMLMotionProps<'textarea'>>(({ className, ...props }, ref) => {
  return (
    <motion.textarea
      layout
      transition={{ duration: 0.2 }}
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
