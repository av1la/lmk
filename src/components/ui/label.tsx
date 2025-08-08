"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "text-gray-700",
        subtle: "text-gray-600",
        muted: "text-gray-500",
        required: "text-gray-700 after:content-['*'] after:text-red-500 after:ml-1",
        error: "text-red-700",
        success: "text-green-700"
      },
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base"
      },
      spacing: {
        none: "",
        sm: "mb-1",
        default: "mb-2",
        lg: "mb-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      spacing: "default"
    }
  }
)

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, variant, size, spacing, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant, size, spacing }), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }