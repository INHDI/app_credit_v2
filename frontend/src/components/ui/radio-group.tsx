"use client"

import * as React from "react"
import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
} | undefined>(undefined)

const RadioGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        value?: string
        onValueChange?: (value: string) => void
    }
>(({ className, value, onValueChange, children, ...props }, ref) => {
    return (
        <RadioGroupContext.Provider value={{ value, onValueChange }}>
            <div className={cn("grid gap-2", className)} ref={ref} {...props}>
                {children}
            </div>
        </RadioGroupContext.Provider>
    )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        value: string
    }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)

    const checked = context?.value === value

    return (
        <button
            type="button"
            role="radio"
            aria-checked={checked}
            data-state={checked ? "checked" : "unchecked"}
            value={value}
            className={cn(
                "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            onClick={() => context?.onValueChange?.(value)}
            ref={ref}
            {...props}
        >
            {checked ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-current" />
            ) : (
                <Circle className="h-4 w-4 text-slate-300" />
            )}
        </button>
    )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
