import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Botão principal - cor cinza consistente com a identidade visual
        default: "bg-gray-800 text-white hover:bg-gray-900 focus-visible:ring-gray-800 shadow-sm hover:shadow-md",
        
        // Botão primário - destaque para ações principais
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 shadow-sm hover:shadow-md",
        
        // Botão de sucesso - para ações positivas
        success: "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600 shadow-sm hover:shadow-md",
        
        // Botão de perigo - para ações destrutivas
        destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 shadow-sm hover:shadow-md",
        
        // Botão de alerta - para ações que precisam atenção
        warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus-visible:ring-yellow-600 shadow-sm hover:shadow-md",
        
        // Botão com borda - para ações secundárias
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-gray-500 shadow-sm",
        
        // Botão outline primary
        "outline-primary": "border border-blue-600 bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-blue-600",
        
        // Botão secundário - sutil
        secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 focus-visible:ring-gray-500",
        
        // Botão ghost - invisível até hover
        ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500",
        
        // Botão ghost primary
        "ghost-primary": "text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-blue-600",
        
        // Botão de link
        link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-700 focus-visible:ring-blue-600",
        
        // Botão para navegação/voltar
        navigation: "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 focus-visible:ring-gray-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }