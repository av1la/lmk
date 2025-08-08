import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Input padrão - limpo e consistente
        default: "border border-gray-300 bg-white text-gray-900 px-3 py-2 hover:border-gray-400 focus-visible:border-blue-500 focus-visible:ring-blue-200",
        
        // Input com fundo sutil - para formulários em cards
        subtle: "border border-gray-200 bg-gray-50 text-gray-900 px-3 py-2 hover:bg-white hover:border-gray-300 focus-visible:bg-white focus-visible:border-blue-500 focus-visible:ring-blue-200",
        
        // Input de busca - com ícone
        search: "border border-gray-300 bg-white text-gray-900 px-3 py-2 pl-10 hover:border-gray-400 focus-visible:border-blue-500 focus-visible:ring-blue-200",
        
        // Input com erro - vermelho
        error: "border border-red-300 bg-white text-gray-900 px-3 py-2 hover:border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200",
        
        // Input de sucesso - verde
        success: "border border-green-300 bg-white text-gray-900 px-3 py-2 hover:border-green-400 focus-visible:border-green-500 focus-visible:ring-green-200",
        
        // Input transparente - para overlays
        ghost: "border border-gray-200 bg-white/80 backdrop-blur-sm text-gray-900 px-3 py-2 hover:bg-white hover:border-gray-300 focus-visible:bg-white focus-visible:border-blue-500 focus-visible:ring-blue-200",
        
        // Input plano - sem borda
        plain: "border-0 bg-transparent text-gray-900 px-3 py-2 focus-visible:ring-gray-200",
      },
      size: {
        default: "h-10",
        sm: "h-8 text-xs px-2",
        lg: "h-12 text-base px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }