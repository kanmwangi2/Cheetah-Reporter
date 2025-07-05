/**
 * Date formatting utilities
 * Provides consistent date formatting across the application based on user preferences
 */

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY'

export const formatDate = (date: Date | string, format: DateFormat = 'DD/MM/YYYY'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }
  
  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const year = String(dateObj.getFullYear())
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`
    default:
      return `${day}/${month}/${year}`
  }
}

export const formatDateWithOptions = (
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }
  
  return dateObj.toLocaleDateString(undefined, options)
}

export const getDateFormatOptions = (): Array<{ value: DateFormat; label: string; example: string }> => {
  const now = new Date()
  return [
    { 
      value: 'DD/MM/YYYY', 
      label: 'DD/MM/YYYY', 
      example: formatDate(now, 'DD/MM/YYYY') 
    },
    { 
      value: 'MM/DD/YYYY', 
      label: 'MM/DD/YYYY', 
      example: formatDate(now, 'MM/DD/YYYY') 
    },
    { 
      value: 'YYYY-MM-DD', 
      label: 'YYYY-MM-DD', 
      example: formatDate(now, 'YYYY-MM-DD') 
    },
    { 
      value: 'DD-MM-YYYY', 
      label: 'DD-MM-YYYY', 
      example: formatDate(now, 'DD-MM-YYYY') 
    }
  ]
}

// Hook to use date formatting with user preferences
import { useUIStore } from '../store/uiStore'

export const useDateFormat = () => {
  const { dateFormat } = useUIStore()
  
  return {
    format: dateFormat,
    formatDate: (date: Date | string) => formatDate(date, dateFormat)
  }
}

// Standalone function for non-hook contexts
export const formatDateWithUserPreference = (date: Date | string): string => {
  // For components that can't use hooks, we'll use the default format
  // This will be enhanced with a context or other solution later
  return formatDate(date, 'DD/MM/YYYY')
}
