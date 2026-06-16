// Lokasi: src/components/ui/accordion.tsx
// [FIX DEPENDENCY] Versi ini tidak memerlukan '@radix-ui/react-accordion'.
// Menggunakan React Context & State standar untuk menghindari error module not found.

"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Context untuk mengelola state accordion
type AccordionContextType = {
  value?: string | string[];
  onValueChange?: (value: string) => void;
  type?: "single" | "multiple";
  collapsible?: boolean;
}

const AccordionContext = React.createContext<AccordionContextType>({});

const Accordion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    type: "single" | "multiple"
    collapsible?: boolean
    value?: string | string[]
    defaultValue?: string | string[]
    onValueChange?: (value: any) => void
  }
>(({ className, type, value: propValue, defaultValue, onValueChange, collapsible = false, ...props }, ref) => {
  // State lokal jika tidak dikontrol dari luar
  const [stateValue, setStateValue] = React.useState<string | string[]>(
    propValue || defaultValue || (type === "multiple" ? [] : "")
  );

  // Sinkronisasi jika propValue berubah
  React.useEffect(() => {
    if (propValue !== undefined) {
      setStateValue(propValue);
    }
  }, [propValue]);

  const handleValueChange = React.useCallback((itemValue: string) => {
    if (type === "single") {
      const currentValue = stateValue as string;
      const newValue = (currentValue === itemValue && collapsible) ? "" : itemValue;
      
      if (propValue === undefined) {
        setStateValue(newValue);
      }
      if (onValueChange) {
        onValueChange(newValue);
      }
    } else {
      // Logika untuk multiple (jika diperlukan di masa depan)
      const currentValues = Array.isArray(stateValue) ? stateValue : [];
      const isSelected = currentValues.includes(itemValue);
      const newValues = isSelected 
        ? currentValues.filter(v => v !== itemValue)
        : [...currentValues, itemValue];
        
       if (propValue === undefined) {
        setStateValue(newValues);
      }
      if (onValueChange) {
        onValueChange(newValues);
      }
    }
  }, [stateValue, type, collapsible, onValueChange, propValue]);

  return (
    <AccordionContext.Provider value={{ value: stateValue, onValueChange: handleValueChange, type, collapsible }}>
      <div ref={ref} className={className} {...props} />
    </AccordionContext.Provider>
  )
})
Accordion.displayName = "Accordion"

// Context untuk item individu
const AccordionItemContext = React.createContext<{ value: string }>({ value: "" })

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => (
  <AccordionItemContext.Provider value={{ value }}>
    <div ref={ref} className={cn("border-b", className)} {...props} />
  </AccordionItemContext.Provider>
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { value: itemValue } = React.useContext(AccordionItemContext)
  const { value: selectedValue, onValueChange } = React.useContext(AccordionContext)
  
  const isOpen = Array.isArray(selectedValue) 
    ? selectedValue.includes(itemValue) 
    : selectedValue === itemValue;

  return (
    <div className="flex">
      <button
        ref={ref}
        type="button"
        onClick={() => onValueChange && onValueChange(itemValue)}
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
          className
        )}
        data-state={isOpen ? "open" : "closed"}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      </button>
    </div>
  )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { value: itemValue } = React.useContext(AccordionItemContext)
  const { value: selectedValue } = React.useContext(AccordionContext)
  
  const isOpen = Array.isArray(selectedValue) 
    ? selectedValue.includes(itemValue) 
    : selectedValue === itemValue;

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down", className)}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  )
})
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }