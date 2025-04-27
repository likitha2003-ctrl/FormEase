import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { apiRequest } from './queryClient'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Extracts a person's name from natural language input
 * @param text The text to extract a name from
 * @returns An object with the extracted name (or null if none found) and success flag
 */
export async function extractPersonName(text: string): Promise<{ 
  extractedName: string | null;
  originalText: string;
  success: boolean;
}> {
  try {
    const result = await apiRequest<{
      extractedName: string | null;
      originalText: string;
      success: boolean;
    }>({
      url: '/api/extract-name',
      method: 'POST',
      data: { text }
    });
    
    return result;
  } catch (error) {
    console.error('Error extracting name:', error);
    return {
      extractedName: null,
      originalText: text,
      success: false
    };
  }
}
