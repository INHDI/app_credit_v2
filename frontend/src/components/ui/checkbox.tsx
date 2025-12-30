"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, onCheckedChange, onChange, ...props }, ref) => {

        // We handle onChange to trigger the custom onCheckedChange prop
        const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            onCheckedChange?.(event.target.checked)
            onChange?.(event)
        }

        return (
            <div className="relative flex items-center justify-center w-4 h-4">
                <input
                    type="checkbox"
                    ref={ref}
                    className={cn(
                        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:bg-primary checked:text-primary-foreground",
                        className
                    )}
                    onChange={handleChange}
                    {...props}
                />
                <Check className="absolute h-3 w-3 text-primary-foreground pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
