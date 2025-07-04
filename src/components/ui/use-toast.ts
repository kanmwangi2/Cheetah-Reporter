// Simple toast implementation
export interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export const useToast = () => {
  const toast = (options: Toast) => {
    // For now, just use alert - in a real app this would be a proper toast system
    console.log('Toast:', options);
    if (options.variant === 'destructive') {
      alert(`Error: ${options.title}\n${options.description || ''}`);
    } else {
      alert(`${options.title}\n${options.description || ''}`);
    }
  };

  return { toast };
};