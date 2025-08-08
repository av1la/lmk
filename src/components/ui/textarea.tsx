import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex w-full rounded-md text-sm transition-all duration-200 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Textarea padrão - limpo e consistente
        default: "border border-gray-300 bg-white text-gray-900 px-3 py-2 hover:border-gray-400 focus-visible:border-blue-500 focus-visible:ring-blue-200",
        
        // Textarea com fundo sutil - para formulários em cards
        subtle: "border border-gray-200 bg-gray-50 text-gray-900 px-3 py-2 hover:bg-white hover:border-gray-300 focus-visible:bg-white focus-visible:border-blue-500 focus-visible:ring-blue-200",
        
        // Textarea com erro - vermelho
        error: "border border-red-300 bg-white text-gray-900 px-3 py-2 hover:border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200",
        
        // Textarea de sucesso - verde
        success: "border border-green-300 bg-white text-gray-900 px-3 py-2 hover:border-green-400 focus-visible:border-green-500 focus-visible:ring-green-200",
        
        // Textarea transparente - para overlays
        ghost: "border border-gray-200 bg-white/80 backdrop-blur-sm text-gray-900 px-3 py-2 hover:bg-white hover:border-gray-300 focus-visible:bg-white focus-visible:border-blue-500 focus-visible:ring-blue-200",
        
        // Textarea plano - sem borda
        plain: "border-0 bg-transparent text-gray-900 px-3 py-2 focus-visible:ring-gray-200",
      },
      size: {
        default: "min-h-[80px]",
        sm: "min-h-[60px] text-xs px-2 py-1",
        lg: "min-h-[120px] text-base px-4 py-3",
        xl: "min-h-[160px] text-base px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }