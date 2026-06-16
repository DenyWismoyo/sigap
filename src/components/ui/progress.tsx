/**
 * Directory: src/components/ui/progress.tsx
 * History Update:
 * - 2024-11-28: Added 'indicatorColor' prop support to customize progress bar color.
 * - Fixed React warning about unrecognized DOM property by destructuring prop.
 */

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

// [FIX] Definisikan tipe props tambahan agar TypeScript senang
interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorColor?: string; // Prop kustom untuk warna bar (Tailwind class, e.g., 'bg-red-500')
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorColor, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      // [FIX] Gunakan indicatorColor di sini sebagai className tambahan
      className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorColor)}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }