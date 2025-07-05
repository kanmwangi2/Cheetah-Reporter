import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./Button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onSelect: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  clearable?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onSelect,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  disabled = false,
  clearable = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [isMounted, setIsMounted] = React.useState(false)

  // Ensure component is mounted (for hydration issues)
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue])

  const handleSelect = React.useCallback((optionValue: string) => {
    if (!optionValue) return
    onSelect(optionValue)
    setOpen(false)
    setSearchValue("")
  }, [onSelect])

  const handleClear = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onSelect("")
  }, [onSelect])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      setSearchValue("")
    }
  }, [])

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchValue("")
    }
  }, [])

  // Return null if not mounted (prevent hydration mismatch)
  if (!isMounted) {
    return (
      <div className={cn("w-full h-10 border border-input rounded-md bg-background", className)}>
        <div className="h-full flex items-center px-3 text-muted-foreground">
          {placeholder}
        </div>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            "w-full justify-between h-10 px-3 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            !selectedOption && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <span className="truncate text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {clearable && selectedOption && !disabled && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 z-50" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command shouldFilter={false} onKeyDown={handleKeyDown}>
          <CommandInput 
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-9"
          />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-sm">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className="flex items-start gap-2 cursor-pointer px-2 py-3 hover:bg-accent hover:text-accent-foreground"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="font-medium leading-none">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground leading-none">
                        {option.description}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
