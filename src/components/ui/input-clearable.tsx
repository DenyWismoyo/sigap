// Lokasi: src/components/ui/input-clearable.tsx
"use client";

import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputClearableProps extends React.ComponentProps<"input"> {
  onClear?: () => void;
  wrapperClassName?: string;
}

const InputClearable = React.forwardRef<HTMLInputElement, InputClearableProps>(
  ({ className, wrapperClassName, value, onChange, onClear, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClear = () => {
      // Trigger event change manual agar state parent terupdate (jika menggunakan onChange standar)
      if (inputRef.current) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        nativeInputValueSetter?.call(inputRef.current, "");
        
        const event = new Event("input", { bubbles: true });
        inputRef.current.dispatchEvent(event);
      }

      // Panggil callback onClear jika ada (misal untuk reset state eksplisit)
      if (onClear) onClear();
      
      inputRef.current?.focus();
    };

    // Helper untuk menggabungkan ref eksternal dan internal
    React.useImperativeHandle(ref, () => inputRef.current!);

    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        <Input
          {...props}
          ref={inputRef}
          value={value}
          onChange={onChange}
          className={cn("pr-8", className)} // Beri padding kanan agar teks tidak menabrak icon X
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Hapus teks"
            tabIndex={-1} // Agar tidak bisa di-tab, fokus tetap di input
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }
);

InputClearable.displayName = "InputClearable";

export { InputClearable };