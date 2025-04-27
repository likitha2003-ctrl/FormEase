import { useState } from "react";
import { apiRequest } from '../lib/queryClient';
import { FormSectionWithFields } from '../lib/firebaseService';

// Define all possible intent types with more specific typing
export type IntentType = "fillField" | "edit" | "submit" | "goBack" | "unknown";

interface BaseIntent {
  intent: IntentType;
  confidence?: number;
  rawText?: string;
}

export interface FillFieldIntent extends BaseIntent {
  intent: "fillField";
  fieldKey: string;
  sectionId: number;
  value: string;
}

export interface EditIntent extends BaseIntent {
  intent: "edit";
  fieldKey: string;
  sectionId: number;
  value?: string;
  previousValue?: string;
}

export interface SubmitIntent extends BaseIntent {
  intent: "submit";
  confirmationRequired?: boolean;
}

export interface GoBackIntent extends BaseIntent {
  intent: "goBack";
  target?: string;
}

export interface UnknownIntent extends BaseIntent {
  intent: "unknown";
  suggestions?: string[];
}

export type Intent = FillFieldIntent | EditIntent | SubmitIntent | GoBackIntent | UnknownIntent;

interface FieldUpdate {
  sectionId: number;
  fieldKey: string;
  value: string;
  previousValue?: string;
}

interface ProcessVoiceResponse {
  success: boolean;
  message: string;
  fieldUpdates?: FieldUpdate[];
  nextQuestion?: string;
  contextUpdates?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
}

interface NlpProcessorHook {
  processVoiceInput: (
    text: string,
    formCode: string,
    formSections: FormSectionWithFields[],
    context?: Record<string, any>
  ) => Promise<ProcessVoiceResponse>;
  determineIntent: (
    text: string,
    formSections: FormSectionWithFields[],
    context?: Record<string, any>
  ) => Promise<Intent>;
  getWelcomeMessage: (
    formCode: string
  ) => Promise<string>;
  isProcessing: boolean;
  lastIntent?: Intent;
}

export default function useNlpProcessor(): NlpProcessorHook {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastIntent, setLastIntent] = useState<Intent>();

  const processVoiceInput = async (
    text: string,
    formCode: string,
    formSections: FormSectionWithFields[],
    context: Record<string, any> = {}
  ): Promise<ProcessVoiceResponse> => {
    setIsProcessing(true);

    try {
      const result = await apiRequest<ProcessVoiceResponse>({
        method: "POST",
        url: "/api/process-voice",
        data: {
          text,
          formCode,
          formSections,
          context,
        },
      });

      if (!result.success) {
        throw new Error(result.error?.message || "Failed to process voice input");
      }

      return {
        success: true,
        message: result.message,
        fieldUpdates: result.fieldUpdates || [],
        nextQuestion: result.nextQuestion,
        contextUpdates: result.contextUpdates
      };
    } catch (error: any) {
      console.error("❌ Error in processVoiceInput:", error.message || error);
      return {
        success: false,
        message: error.message || "There was an issue understanding your input. Please try again.",
        error: {
          code: "PROCESSING_ERROR",
          message: error.message || "Processing error occurred"
        }
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const determineIntent = async (
    text: string,
    formSections: FormSectionWithFields[],
    context: Record<string, any> = {}
  ): Promise<Intent> => {
    setIsProcessing(true);

    try {
      const result = await apiRequest<Intent>({
        method: "POST",
        url: "/api/user-intent",
        data: {
          text,
          formSections,
          context,
        },
      });

      if (!isValidIntent(result)) {
        console.warn("Invalid intent response from API, defaulting to fillField");
        const fallbackIntent: FillFieldIntent = {
          intent: "fillField",
          fieldKey: context.currentFieldKey || "",
          sectionId: context.currentSectionId || 0,
          value: text
        };
        return fallbackIntent;
      }

      setLastIntent(result);
      return result;
    } catch (error: any) {
      console.error("❌ Error in determineIntent:", error.message || error);
      // Return a more useful fallback intent with context if available
      const fallbackIntent: FillFieldIntent = {
        intent: "fillField",
        fieldKey: context.currentFieldKey || "",
        sectionId: context.currentSectionId || 0,
        value: text
      };
      return fallbackIntent;
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced type guard with proper validation
  const isValidIntent = (response: any): response is Intent => {
    if (!response || typeof response !== "object") return false;
    
    const validIntents: IntentType[] = ["fillField", "edit", "submit", "goBack", "unknown"];
    if (!validIntents.includes(response.intent)) return false;

    // Validate specific intent structures
    switch (response.intent) {
      case "fillField":
        return typeof response.fieldKey === "string" && 
               typeof response.sectionId === "number" && 
               typeof response.value === "string";
      case "edit":
        return typeof response.fieldKey === "string" && 
               typeof response.sectionId === "number";
      case "submit":
      case "goBack":
      case "unknown":
        return true;
      default:
        return false;
    }
  };

  const getWelcomeMessage = async (
    formCode: string
  ): Promise<string> => {
    try {
      const data = await apiRequest<{ message: string }>({
        method: "GET",
        url: `/api/welcome-message/${formCode}`,
      });

      return data.message;
    } catch (error: any) {
      console.warn("⚠️ Falling back to default welcome message.", error);

      const fallbackMessage = `Welcome! I'm your FormEase assistant, ready to help you fill the ${formCode} form using voice commands. Let's begin!`;

      return fallbackMessage;
    }
  };

  return {
    processVoiceInput,
    determineIntent,
    getWelcomeMessage,
    isProcessing,
    lastIntent
  };
}
