"use client"

import * as React from "react"
import { X, Mail, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface EmailChipInputProps {
  emails: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function EmailChipInput({ 
  emails, 
  onChange, 
  placeholder = "Digite um email e pressione Enter...",
  className,
  disabled = false
}: EmailChipInputProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [isInputFocused, setIsInputFocused] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim().toLowerCase()
    
    if (!trimmedEmail) return
    
    // Check if email already exists
    if (emails.includes(trimmedEmail)) {
      setInputValue("")
      return
    }

    // Add email (valid or invalid, we'll show visual feedback)
    onChange([...emails, trimmedEmail])
    setInputValue("")
  }

  const removeEmail = (emailToRemove: string) => {
    onChange(emails.filter(email => email !== emailToRemove))
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      addEmail(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      // Remove last email when backspace is pressed on empty input
      removeEmail(emails[emails.length - 1])
    }
  }

  const handleInputBlur = () => {
    setIsInputFocused(false)
    // Add email on blur if there's a value
    if (inputValue.trim()) {
      addEmail(inputValue)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const pastedEmails = pastedText
      .split(/[,;\n\r\t\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0)

    const newEmails = [...emails]
    pastedEmails.forEach(email => {
      const trimmedEmail = email.toLowerCase()
      if (!newEmails.includes(trimmedEmail)) {
        newEmails.push(trimmedEmail)
      }
    })
    
    onChange(newEmails)
    setInputValue("")
  }

  const validEmails = emails.filter(validateEmail)
  const invalidEmails = emails.filter(email => !validateEmail(email))

  return (
    <div className={cn("space-y-2", className)}>
      {/* Email Chips Container */}
      <div 
        className={cn(
          "min-h-[2.5rem] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-all duration-200",
          "focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500",
          "flex flex-wrap gap-1 items-center",
          disabled && "cursor-not-allowed opacity-50 bg-gray-50"
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {/* Email Chips */}
        {emails.map((email, index) => {
          const isValid = validateEmail(email)
          return (
            <Badge
              key={index}
              variant={isValid ? "default" : "destructive"}
              className={cn(
                "flex items-center gap-1 px-2 py-1",
                isValid 
                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200" 
                  : "bg-red-100 text-red-800 hover:bg-red-200"
              )}
            >
              {isValid ? (
                <Mail className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              <span className="max-w-[200px] truncate">{email}</span>
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeEmail(email)
                  }}
                  className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          )
        })}

        {/* Input Field */}
        <input
          ref={inputRef}
          type="email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsInputFocused(true)}
          onBlur={handleInputBlur}
          onPaste={handlePaste}
          placeholder={emails.length === 0 ? placeholder : ""}
          disabled={disabled}
          className={cn(
            "flex-1 min-w-[120px] outline-none bg-transparent",
            "placeholder:text-gray-500",
            disabled && "cursor-not-allowed"
          )}
        />
      </div>

      {/* Stats and Help Text */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          {validEmails.length > 0 && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-green-600" />
              {validEmails.length} válido{validEmails.length !== 1 ? 's' : ''}
            </span>
          )}
          {invalidEmails.length > 0 && (
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-600" />
              {invalidEmails.length} inválido{invalidEmails.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="text-right">
          <div>Pressione Enter, vírgula ou cole múltiplos emails</div>
        </div>
      </div>

      {/* Invalid Emails List (when there are any) */}
      {invalidEmails.length > 0 && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-1 text-red-700 text-xs font-medium mb-1">
            <AlertCircle className="h-3 w-3" />
            Emails inválidos encontrados:
          </div>
          <div className="text-xs text-red-600">
            {invalidEmails.join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}