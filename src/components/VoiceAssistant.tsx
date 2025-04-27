import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatMessage } from "@/lib/firebaseService";
import { useToast } from "@/hooks/use-toast";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import { extractPersonName } from "@/lib/utils";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

// Extend ChatMessage to include id
interface ExtendedChatMessage extends ChatMessage {
  id?: string;
}

// Define intent types
interface BaseIntent {
  intent: string;
}

interface FillFieldIntent extends BaseIntent {
  intent: "fillField";
  fieldKey?: string;
  sectionId?: number;
  value?: string;
}

interface EditIntent extends BaseIntent {
  intent: "edit";
  fieldKey?: string;
  sectionId?: number;
  value?: string;
}

interface SubmitIntent extends BaseIntent {
  intent: "submit";
}

interface GoBackIntent extends BaseIntent {
  intent: "goBack";
}

interface UnknownIntent extends BaseIntent {
  intent: "unknown";
}

type Intent = FillFieldIntent | EditIntent | SubmitIntent | GoBackIntent | UnknownIntent;

interface FormField {
  id: string;
  sectionId: string;
  fieldKey: string;
  label: string;
  value?: string;
  required: boolean;
  type: string;
  options?: string[];
}

interface LocalFormSectionWithFields {
  id: number;
  title: string;
  fields: FormField[];
}

interface VoiceAssistantProps {
  formCode: string;
  formSections: LocalFormSectionWithFields[];
  onFieldUpdate: (sectionId: number, fieldKey: string, value: string) => void;
  onFormSubmit: () => void;
  onGoBack?: () => void;
}

const SUBMIT_PATTERNS = [
  /\b(submit|done|finish|complete|send|ready|go ahead|proceed|finalize)\b/i,
  /\b(that'?s all|everything is complete|looks? good|i'?m done|let'?s submit)\b/i,
  /\b(yes|yeah|correct|sure|absolutely|please|ok|okay)\b.*\b(submit|send|finish|complete)\b/i
];

const EDIT_PATTERNS = [
  /(?:change|edit|update|fix|correct|modify)\s+(?:my|the)?\s*(\w+)(?:\s+(?:to|with|as)?\s+(.+))?$/i,
  /(?:make|set)\s+(?:my|the)?\s*(\w+)(?:\s+(?:to|as|be)?\s+(.+))?$/i
];

export default function VoiceAssistant({
  formCode,
  formSections,
  onFieldUpdate,
  onFormSubmit,
  onGoBack
}: VoiceAssistantProps) {
  // State management
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [askedFields, setAskedFields] = useState<string[]>([]);
  const [lastAskedQuestion, setLastAskedQuestion] = useState<string>("");
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isProcessingInput, setIsProcessingInput] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const {
    isTranscribing,
    currentTranscript,
    finalTranscript,
    startListening,
    stopListening,
    hasRecognitionSupport
  } = useSpeechRecognition();
  
  // Track spoken messages to prevent duplicates
  const spokenMessages = useRef<Set<string>>(new Set());
  
  // Track initialization to prevent multiple runs
  const hasInitialized = useRef(false);

  // Track if welcome message has been spoken
  const welcomeMessageSpoken = useRef(false);

  // Track if welcome message has been displayed
  const welcomeMessageDisplayed = useRef(false);
  
  // Memoized form sections data
  const memoizedFormSections = useMemo<LocalFormSectionWithFields[]>(() => {
    console.log('memoizedFormSections:', formSections);
    return formSections;
  }, [formSections]);

  // Get the next empty required field
  const getNextEmptyField = useCallback(() => {
    console.log('getNextEmptyField: askedFields:', askedFields);
    for (const section of memoizedFormSections) {
      for (const field of section.fields) {
        if (field.required && (!field.value || field.value.trim() === "")) {
          const fieldId = `${section.id}-${field.fieldKey}`;
          if (!askedFields.includes(fieldId)) {
            let question = `What is your ${field.label.toLowerCase()}?`;
            if (field.options?.length) {
              question += ` Options: ${field.options.join(", ")}.`;
            }
            return { sectionId: section.id, fieldKey: field.fieldKey, label: field.label, question, fieldId };
          }
        }
      }
    }
    
    for (const section of memoizedFormSections) {
      for (const field of section.fields) {
        if (field.required && (!field.value || field.value.trim() === "")) {
          const fieldId = `${section.id}-${field.fieldKey}`;
          let question = `What is your ${field.label.toLowerCase()}?`;
          if (field.options?.length) {
            question += ` Options: ${field.options.join(", ")}.`;
          }
          return { sectionId: section.id, fieldKey: field.fieldKey, label: field.label, question, fieldId };
        }
      }
    }
    
    return null;
  }, [memoizedFormSections, askedFields]);

  // Mock NLP processor functions
  const processVoiceInput = useCallback(
    async (text: string, formCode: string, sections: LocalFormSectionWithFields[], context: any) => {
      console.log('processVoiceInput:', { text, context });
      const fieldUpdates = [];
      for (const section of sections) {
        for (const field of section.fields) {
          if (
            text.toLowerCase().includes(field.label.toLowerCase()) ||
            text.toLowerCase().includes(field.fieldKey.toLowerCase())
          ) {
            let value = text.replace(new RegExp(`${field.label}|${field.fieldKey}`, 'i'), '').trim();
            if (!value) value = text.trim();
            if (field.options?.length) {
              const matchedOption = field.options.find(opt =>
                opt.toLowerCase().includes(value.toLowerCase()) ||
                value.toLowerCase().includes(opt.toLowerCase())
              );
              if (matchedOption) value = matchedOption;
            }
            if (value) {
              fieldUpdates.push({ sectionId: section.id, fieldKey: field.fieldKey, value });
            }
          }
        }
      }
      return {
        fieldUpdates,
        nextQuestion: fieldUpdates.length ? "Got it! What's next?" : "What else would you like to tell me?"
      };
    },
    []
  );

  const determineIntent = useCallback(
    async (text: string, sections: LocalFormSectionWithFields[]): Promise<Intent> => {
      console.log('determineIntent:', { text, context: currentContext.current });
      // Check for submit or go back intents
      if (SUBMIT_PATTERNS.some(pattern => pattern.test(text.toLowerCase()))) {
        return { intent: "submit" };
      }
      if (text.toLowerCase().includes("go back") || text.toLowerCase().includes("previous")) {
        return { intent: "goBack" };
      }
      // Check for edit intent
      for (const pattern of EDIT_PATTERNS) {
        const match = text.match(pattern);
        if (match?.[1]) {
          const fieldKeyword = match[1].toLowerCase();
          const value = match[2]?.trim();
          for (const section of sections) {
            for (const field of section.fields) {
              if (
                field.label.toLowerCase().includes(fieldKeyword) ||
                field.fieldKey.toLowerCase().includes(fieldKeyword)
              ) {
                return {
                  intent: "edit",
                  fieldKey: field.fieldKey,
                  sectionId: section.id,
                  value
                };
              }
            }
          }
        }
      }
      // Default to fillField using context or next empty field
      const value = text.trim();
      const nextField = getNextEmptyField();
      const fieldKey = currentContext.current.currentFieldKey || nextField?.fieldKey;
      const sectionId = currentContext.current.currentSectionId || nextField?.sectionId;
      
      return {
        intent: "fillField",
        fieldKey,
        sectionId,
        value
      };
    },
    [getNextEmptyField]
  );

  const getWelcomeMessage = useCallback(
    async (formCode: string) => {
      // Normalize formCode to lowercase to match backend keys
      const normalizedFormCode = formCode.toLowerCase();
      try {
        // Call backend API to get welcome message
        const response = await fetch(`/api/welcome-message/${normalizedFormCode}`);
        if (!response.ok) {
          const text = await response.text();
          console.error(`Failed to fetch welcome message for formCode: ${normalizedFormCode}, response text:`, text);
          throw new Error(`Failed to fetch welcome message for formCode: ${normalizedFormCode}`);
        }
        const data = await response.json();
        if (data.message) {
          return data.message;
        }
        return "Welcome to FormEase!";
      } catch (error) {
        console.warn("Failed to fetch welcome message, falling back to default.", error);
        return "Welcome to FormEase!";
      }
    },
    []
  );

  const isNlpProcessing = false; // Mock state
  
  // Track current context
  const currentContext = useRef<{
    lastQuestion?: string;
    currentSectionId?: number;
    currentFieldKey?: string;
  }>({});

  // Initialize voices for speech synthesis
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSpeechEnabled(false);
      console.warn("Speech synthesis not supported in this browser");
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Speak text with proper voice selection
  const speakText = useCallback((text: string, messageId: string) => {
    console.log(`speakText: "${text}", messageId: "${messageId}"`);
    if (!speechEnabled || !text || text.includes("...") || spokenMessages.current.has(messageId)) {
      console.log(`speakText skipped: speechEnabled=${speechEnabled}, text="${text}", alreadySpoken=${spokenMessages.current.has(messageId)}`);
      return;
    }

    spokenMessages.current.add(messageId);

    const speakNext = () => {
      if (utteranceQueue.current.length === 0) {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        return;
      }
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      const nextUtterance = utteranceQueue.current.shift()!;
      nextUtterance.onend = () => {
        speakNext();
      };
      nextUtterance.onerror = () => {
        speakNext();
      };
      window.speechSynthesis.speak(nextUtterance);
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    const findVoice = () => {
      let voice = availableVoices.find(v => v.lang === 'en-US');
      if (!voice) {
        voice = availableVoices.find(v => v.lang.startsWith('en-'));
      }
      return voice;
    };

    const voice = findVoice();
    if (voice) utterance.voice = voice;

    utterance.volume = 1;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utteranceQueue.current.push(utterance);

    if (!isSpeakingRef.current) {
      speakNext();
    }
  }, [speechEnabled, availableVoices]);

  // Chat message helpers
  const addBotMessage = useCallback((text: string, thinking = false) => {
    setMessages(prev => {
      const filtered = prev.filter(msg => !msg.thinking);
      const messageId = `${text}-${Date.now().toString()}`;
      if (!thinking) {
        speakText(text, messageId);
      }
      return [...filtered, { sender: "bot", text, thinking, id: messageId } as ExtendedChatMessage];
    });
  }, [speakText]);

  const addUserMessage = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setMessages(prev => [...prev, { sender: "user", text, id: `${text}-${Date.now().toString()}` } as ExtendedChatMessage]);
  }, []);

  // Initialize the conversation
  const initializeConversation = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      setMessages([]);
      setAskedFields([]);
      setLastAskedQuestion("");
      currentContext.current = {};

      // Fetch welcome message dynamically from nlp-processor backend
      const welcomeMsg = await getWelcomeMessage(formCode);

      if (!welcomeMessageDisplayed.current) {
        setMessages([{ sender: "bot", text: welcomeMsg, thinking: false, id: `welcome-${Date.now().toString()}` } as ExtendedChatMessage]);
        welcomeMessageDisplayed.current = true;
      }
      if (!welcomeMessageSpoken.current) {
        speakText(welcomeMsg, `welcome-${Date.now().toString()}`);
        welcomeMessageSpoken.current = true;
      }

      const personalSection = memoizedFormSections.find(s => s.title.includes("Personal"));
      const allSections = personalSection ? 
        [personalSection, ...memoizedFormSections.filter(s => s.id !== personalSection.id)] : 
        memoizedFormSections;

      const fieldsToAsk = allSections.flatMap(section => 
        section.fields
          .filter(field => field.required && (!field.value || field.value.trim() === ""))
          .map(field => ({ section, field }))
      );

      if (fieldsToAsk.length > 0) {
        const { section, field } = fieldsToAsk[0];
        const fieldId = `${section.id}-${field.fieldKey}`;
        const question = field.options?.length 
          ? `What is your ${field.label.toLowerCase()}? Options: ${field.options.join(", ")}.`
          : `What is your ${field.label.toLowerCase()}?`;

        setAskedFields([fieldId]);
        setLastAskedQuestion(question);
        setTimeout(() => {
          setMessages(prev => {
            const questionMsg = `Let's start filling out the form. ${question}`;
            const exists = prev.some(msg => msg.text === questionMsg && msg.sender === 'bot');
            if (exists) return prev;
            const messageId = `question-${Date.now().toString()}`;
            speakText(questionMsg, messageId);
            return [...prev, { sender: "bot", text: questionMsg, thinking: false, id: messageId } as ExtendedChatMessage];
          });
        }, 1500);
        currentContext.current = {
          lastQuestion: question,
          currentSectionId: section.id,
          currentFieldKey: field.fieldKey
        };
        console.log('initializeConversation: context set:', currentContext.current);
      }
    } catch (error) {
      console.error("Failed to initialize conversation:", error);
      addBotMessage("Welcome to FormEase! I'll help you fill out this form using voice commands.");
    }
  }, [formCode, memoizedFormSections, addBotMessage, speakText, getWelcomeMessage]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize on mount
  useEffect(() => {
    utteranceQueue.current = [];
    window.speechSynthesis.cancel();
    hasInitialized.current = false;
    initializeConversation();
  }, [initializeConversation]);

  // Type guards for intents
  const isFillFieldIntent = (intent: Intent): intent is FillFieldIntent => intent.intent === "fillField";
  const isEditIntent = (intent: Intent): intent is EditIntent => intent.intent === "edit";
  const isSubmitIntent = (intent: Intent): intent is SubmitIntent => intent.intent === "submit";
  const isGoBackIntent = (intent: Intent): intent is GoBackIntent => intent.intent === "goBack";

  // Handle user input
  const handleUserInput = async (text: string) => {
    console.log('handleUserInput: input text:', text);
    if (!text || !text.trim()) {
      console.log('handleUserInput: empty input detected');
      addBotMessage("I didn't catch that. Could you please try again?");
      return;
    }

    addUserMessage(text);
    setIsProcessingInput(true);

    try {
      let intent: Intent = await determineIntent(text, memoizedFormSections);
      console.log('handleUserInput: intent:', intent);

      if (isFillFieldIntent(intent)) {
        if (!intent.fieldKey || !intent.sectionId || !intent.value) {
          console.log('Incomplete intent, trying next empty field:', intent);
          const nextField = getNextEmptyField();
          if (nextField && intent.value) {
            intent = {
              intent: "fillField",
              fieldKey: nextField.fieldKey,
              sectionId: nextField.sectionId,
              value: intent.value
            };
            console.log('Updated intent with next field:', intent);
          }
        }
        await handleFillFieldIntent(intent, text);
      } else if (isSubmitIntent(intent)) {
        await handleSubmit();
      } else if (isGoBackIntent(intent)) {
        addBotMessage("Alright, let's go back to the form selection page.");
        onGoBack?.();
      } else if (isEditIntent(intent) && intent.fieldKey && intent.sectionId) {
        await handleEditIntent(intent);
      } else {
        console.log('Falling back to handleFallbackProcessing');
        await handleFallbackProcessing(text);
      }
    } catch (error) {
      console.error("Error processing voice input:", error);
      addBotMessage("I'm sorry, I encountered an error processing your request. Please try again.");
    } finally {
      setIsProcessingInput(false);
    }
  };

  // Handle edit intent
  const handleEditIntent = async (intent: EditIntent) => {
    console.log('handleEditIntent:', intent);
    if (intent.value && intent.fieldKey && intent.sectionId) {
      console.log('Calling onFieldUpdate:', { sectionId: intent.sectionId, fieldKey: intent.fieldKey, value: intent.value });
      onFieldUpdate(intent.sectionId, intent.fieldKey, intent.value);
      
      const nextEmptyField = getNextEmptyField();
      if (nextEmptyField) {
        const question = nextEmptyField.question;
        if (nextEmptyField.fieldId) setAskedFields(prev => [...prev, nextEmptyField.fieldId]);
        addBotMessage(`Updated ${intent.fieldKey}. ${question}`);
        setLastAskedQuestion(question);
        currentContext.current = {
          lastQuestion: question,
          currentSectionId: nextEmptyField.sectionId,
          currentFieldKey: nextEmptyField.fieldKey
        };
        console.log('handleEditIntent: context updated:', currentContext.current);
      } else {
        const submitPrompt = "Updated! All fields look complete. Would you like to submit the form now?";
        addBotMessage(submitPrompt);
        setLastAskedQuestion(submitPrompt);
      }
    } else if (intent.fieldKey && intent.sectionId) {
      const editPrompt = `I'll help you edit the ${intent.fieldKey} field. What would you like to change it to?`;
      if (editPrompt !== lastAskedQuestion) {
        addBotMessage(editPrompt);
        setLastAskedQuestion(editPrompt);
        currentContext.current = {
          lastQuestion: editPrompt,
          currentSectionId: intent.sectionId,
          currentFieldKey: intent.fieldKey
        };
        console.log('handleEditIntent: context updated:', currentContext.current);
      }
    } else {
      addBotMessage("I'm sorry, I couldn't process your edit request. Please try again.");
    }
  };

  // Handle fill field intent
  const handleFillFieldIntent = async (
    intent: FillFieldIntent,
    originalText: string
  ) => {
    console.log('handleFillFieldIntent:', { intent, originalText });
    
    let fieldKey = intent.fieldKey;
    let sectionId = intent.sectionId;
    let value = intent.value?.trim();

    // If intent is incomplete, try next empty field
    if (!fieldKey || !sectionId || !value) {
      console.log('Incomplete intent, attempting fallback to next field');
      const nextField = getNextEmptyField();
      if (nextField && value) {
        fieldKey = nextField.fieldKey;
        sectionId = nextField.sectionId;
      } else {
        console.log('No next field or value, falling back to processing');
        await handleFallbackProcessing(originalText);
        return;
      }
    }

    let section = memoizedFormSections.find(s => s.id === sectionId);
    let field = section?.fields.find(f => 
      f.fieldKey.toLowerCase() === fieldKey?.toLowerCase() ||
      f.label.toLowerCase().includes(fieldKey?.toLowerCase() || '')
    );

    // Broaden field lookup
    if (!field) {
      console.log('Field not found in section, searching all sections:', { fieldKey, sectionId });
      for (const s of memoizedFormSections) {
        field = s.fields.find(f =>
          f.fieldKey.toLowerCase().includes(fieldKey?.toLowerCase() || '') ||
          f.label.toLowerCase().includes(fieldKey?.toLowerCase() || '') ||
          fieldKey?.toLowerCase().includes(f.label.toLowerCase())
        );
        if (field) {
          section = s;
          sectionId = s.id;
          break;
        }
      }
    }

    if (!field || !section) {
      console.log('Field or section not found:', { fieldKey, sectionId });
      addBotMessage("Sorry, I couldn't find the field to process. Let's try the next one.");
      const nextField = getNextEmptyField();
      if (nextField) {
        const question = nextField.question;
        if (nextField.fieldId) setAskedFields(prev => [...prev, nextField.fieldId]);
        addBotMessage(question);
        setLastAskedQuestion(question);
        currentContext.current = {
          lastQuestion: question,
          currentSectionId: nextField.sectionId,
          currentFieldKey: nextField.fieldKey
        };
        console.log('handleFillFieldIntent: context reset:', currentContext.current);
      } else {
        addBotMessage("All fields seem complete. Would you like to submit?");
      }
      return;
    }

    let valueToUpdate = value;

    // Handle radio fields
    if (field.type === "radio" && Array.isArray(field.options) && field.options.length > 0) {
      const userInputNormalized = valueToUpdate.toLowerCase().trim();
      console.log('Radio field matching:', { userInput: userInputNormalized, options: field.options });
      const matchedOption = field.options.find(opt => {
        const optNormalized = opt.toLowerCase().trim();
        return (
          optNormalized.includes(userInputNormalized) ||
          userInputNormalized.includes(optNormalized)
        );
      });
      if (!matchedOption) {
        console.log('No matching option for radio field:', { userInput: userInputNormalized, options: field.options });
        addBotMessage(`Please choose one of: ${field.options.join(", ")}.`);
        setLastAskedQuestion(`What is your ${field.label.toLowerCase()}? Options: ${field.options.join(", ")}.`);
        return;
      }
      valueToUpdate = matchedOption;
    }

    console.log('Calling onFieldUpdate:', { sectionId, fieldKey: field.fieldKey, value: valueToUpdate });
    onFieldUpdate(sectionId, field.fieldKey, valueToUpdate);

    addBotMessage("Processing your response...", true);
    
    const result = await processVoiceInput(
      originalText,
      formCode,
      memoizedFormSections,
      currentContext.current
    );
    
    setMessages(prev => prev.filter(msg => !msg.thinking));

    if ("error" in result) {
      console.log('Error in processVoiceInput, falling back');
      await handleFallbackProcessing(originalText);
      return;
    }

    let updatedAnyField = false;
    if (result.fieldUpdates?.length) {
      updatedAnyField = true;
      for (const update of result.fieldUpdates) {
        console.log('Additional field update:', update);
        onFieldUpdate(update.sectionId, update.fieldKey, update.value);
      }
    }

    const nextEmptyField = getNextEmptyField();
    
    if (nextEmptyField) {
      const question = nextEmptyField.question;
      if (nextEmptyField.fieldId) setAskedFields(prev => [...prev, nextEmptyField.fieldId]);
      const prefix = updatedAnyField ? "Thank you! " : "";
      addBotMessage(`${prefix}${question}`);
      setLastAskedQuestion(question);
      currentContext.current = {
        lastQuestion: question,
        currentSectionId: nextEmptyField.sectionId,
        currentFieldKey: nextEmptyField.fieldKey
      };
      console.log('handleFillFieldIntent: context updated:', currentContext.current);
    } else if (updatedAnyField) {
      const submitQuestion = "Great! All fields are complete. Would you like to submit the form now?";
      addBotMessage(submitQuestion);
      setLastAskedQuestion(submitQuestion);
    } else {
      const nextQuestion = "What else would you like to tell me about your application?";
      addBotMessage(nextQuestion);
      setLastAskedQuestion(nextQuestion);
    }
  };

  // Handle form submission
  const handleSubmit = useCallback(() => {
    console.log('handleSubmit');
    window.speechSynthesis.cancel();
    addBotMessage("Great! Let me verify all the information before submitting...", true);

    setTimeout(() => {
      setMessages(prev => prev.filter(msg => !msg.thinking));

      const isFormValid = memoizedFormSections.every(section =>
        section.fields.every(field => !field.required || (field.value && field.value.trim() !== ""))
      );

      if (isFormValid) {
        const submitConfirmation = "Everything looks good! Submitting your form now.";
        
        if (submitConfirmation !== lastAskedQuestion) {
          addBotMessage(submitConfirmation);
          setLastAskedQuestion(submitConfirmation);
          setTimeout(() => onFormSubmit(), 1500);
        } else {
          onFormSubmit();
        }
      } else {
        const missingFields = memoizedFormSections
          .flatMap(section => 
            section.fields
              .filter(field => field.required && (!field.value || field.value.trim() === ""))
              .map(field => field.label)
          );
        
        const incompleteMessage = `There are still some required fields missing: ${missingFields.join(", ")}. Let's complete those first.`;
        
        const nextField = getNextEmptyField();
        if (nextField) {
          const question = nextField.question;
          if (nextField.fieldId) setAskedFields(prev => [...prev, nextField.fieldId]);
          addBotMessage(`${incompleteMessage}\n\n${question}`);
          setLastAskedQuestion(question);
          currentContext.current = {
            lastQuestion: question,
            currentSectionId: nextField.sectionId,
            currentFieldKey: nextField.fieldKey
          };
          console.log('handleSubmit: context updated:', currentContext.current);
        } else {
          addBotMessage(incompleteMessage);
        }
      }
    }, 1500);
  }, [memoizedFormSections, lastAskedQuestion, onFormSubmit, addBotMessage, getNextEmptyField]);

  // Fallback processing
  const handleFallbackProcessing = async (text: string) => {
    console.log('handleFallbackProcessing:', { text });
    try {
      const directFieldUpdates = await extractFieldInfoFromText(text, memoizedFormSections);
      
      if (directFieldUpdates?.length) {
        for (const update of directFieldUpdates) {
          console.log('Fallback field update:', update);
          onFieldUpdate(update.sectionId, update.fieldKey, update.value);
        }
      
        const nextField = getNextEmptyField();
        
        if (nextField) {
          const question = nextField.question;
          if (nextField.fieldId) setAskedFields(prev => [...prev, nextField.fieldId]);
          addBotMessage(`Got it! ${question}`);
          setLastAskedQuestion(question);
          currentContext.current = {
            lastQuestion: question,
            currentSectionId: nextField.sectionId,
            currentFieldKey: nextField.fieldKey
          };
          console.log('handleFallbackProcessing: context updated:', currentContext.current);
        } else {
          const submitQuestion = "All fields are complete! Would you like to submit the form now?";
          addBotMessage(submitQuestion);
          setLastAskedQuestion(submitQuestion);
        }
      } else {
        console.log('No field updates in fallback, trying context or next field');
        // Try context-based update
        if (currentContext.current.currentFieldKey && currentContext.current.currentSectionId) {
          const field = memoizedFormSections
            .find(s => s.id === currentContext.current.currentSectionId)
            ?.fields.find(f => f.fieldKey === currentContext.current.currentFieldKey);
          if (field) {
            let value = text.trim();
            if (field.type === "radio" && Array.isArray(field.options) && field.options.length > 0) {
              const userInputNormalized = value.toLowerCase().trim();
              const matchedOption = field.options.find(opt => {
                const optNormalized = opt.toLowerCase().trim();
                return (
                  optNormalized.includes(userInputNormalized) ||
                  userInputNormalized.includes(optNormalized)
                );
              });
              if (matchedOption) {
                value = matchedOption;
                console.log('Context-based radio update:', { sectionId: currentContext.current.currentSectionId, fieldKey: field.fieldKey, value });
                onFieldUpdate(currentContext.current.currentSectionId, field.fieldKey, value);
              }
            } else {
              console.log('Context-based update:', { sectionId: currentContext.current.currentSectionId, fieldKey: field.fieldKey, value });
              onFieldUpdate(currentContext.current.currentSectionId, field.fieldKey, value);
            }
            const nextField = getNextEmptyField();
            if (nextField) {
              const question = nextField.question;
              if (nextField.fieldId) setAskedFields(prev => [...prev, nextField.fieldId]);
              addBotMessage(`Got it! ${question}`);
              setLastAskedQuestion(question);
              currentContext.current = {
                lastQuestion: question,
                currentSectionId: nextField.sectionId,
                currentFieldKey: nextField.fieldKey
              };
              console.log('handleFallbackProcessing: context updated:', currentContext.current);
              return;
            }
          }
        }
        // Fall back to next field
        const nextField = getNextEmptyField();
        if (nextField) {
          const question = nextField.question;
          if (nextField.fieldId) setAskedFields(prev => [...prev, nextField.fieldId]);
          addBotMessage(`I'm sorry, I didn't understand that. Let's try: ${question}`);
          setLastAskedQuestion(question);
          currentContext.current = {
            lastQuestion: question,
            currentSectionId: nextField.sectionId,
            currentFieldKey: nextField.fieldKey
          };
          console.log('handleFallbackProcessing: context reset:', currentContext.current);
        } else {
          addBotMessage("I'm sorry, I couldn't understand that. All fields seem complete. Would you like to submit?");
        }
      }
    } catch (error) {
      console.error("Error in fallback extraction:", error);
      addBotMessage("I'm sorry, I couldn't process that properly. Please try again with a clearer phrase.");
    }
  };

  // Extract field information from text
  const extractFieldInfoFromText = useCallback(async (text: string, sections: LocalFormSectionWithFields[]) => {
    console.log('extractFieldInfoFromText:', { text });
    const updates: { sectionId: number; fieldKey: string; value: string }[] = [];
    
    try {
      const nameInfo = await extractPersonName(text);
      
      if (nameInfo?.success && nameInfo.extractedName) {
        for (const section of sections) {
          for (const field of section.fields) {
            if (
              field.fieldKey.toLowerCase().includes('name') ||
              field.label.toLowerCase().includes('name')
            ) {
              if (!field.value || field.value.trim() === '') {
                updates.push({
                  sectionId: section.id,
                  fieldKey: field.fieldKey,
                  value: nameInfo.extractedName
                });
                console.log('Name update:', { sectionId: section.id, fieldKey: field.fieldKey, value: nameInfo.extractedName });
                break;
              }
            }
          }
          if (updates.length > 0) break;
        }
      }

      // General field matching
      for (const section of sections) {
        for (const field of section.fields) {
          if (
            text.toLowerCase().includes(field.label.toLowerCase()) ||
            text.toLowerCase().includes(field.fieldKey.toLowerCase())
          ) {
            let value = text.replace(new RegExp(`${field.label}|${field.fieldKey}`, 'i'), '').trim();
            if (!value) value = text.trim();
            if (field.type === "radio" && Array.isArray(field.options) && field.options.length > 0) {
              const userInputNormalized = value.toLowerCase().trim();
              console.log('Radio field matching in extract:', { userInput: userInputNormalized, options: field.options });
              const matchedOption = field.options.find(opt => {
                const optNormalized = opt.toLowerCase().trim();
                return (
                  optNormalized.includes(userInputNormalized) ||
                  userInputNormalized.includes(optNormalized)
                );
              });
              if (matchedOption) {
                value = matchedOption;
              } else {
                console.log('No matching option in extract:', { userInput: userInputNormalized, options: field.options });
                continue;
              }
            }
            if (value) {
              updates.push({
                sectionId: section.id,
                fieldKey: field.fieldKey,
                value
              });
              console.log('Field update in extract:', { sectionId: section.id, fieldKey: field.fieldKey, value });
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error extracting name:", error);
    }
    
    console.log('extractFieldInfoFromText updates:', updates);
    return updates;
  }, [memoizedFormSections]);

  // Toggle voice recording
  const handleToggleRecording = useCallback(async () => {
    if (!hasRecognitionSupport) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser does not support speech recognition. Please try using Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    console.log("toggleRecording: isTranscribing:", isTranscribing, "isProcessingInput:", isProcessingInput);

    if (isTranscribing) {
      stopListening();
      setTimeout(async () => {
        let transcript = finalTranscript || currentTranscript;
        console.log("Processing transcript:", { finalTranscript, currentTranscript, used: transcript });
        if (transcript && transcript.trim() !== "") {
          setIsProcessingInput(true);
          try {
            await handleUserInput(transcript);
          } catch (error) {
            console.error("Error processing transcript:", error);
            addBotMessage("Sorry, I couldn't process your input. Please try again.");
          } finally {
            setIsProcessingInput(false);
          }
        } else {
          console.log("No valid transcript");
          addBotMessage("I didn't catch that. Could you please try again?");
        }
      }, 500);
    } else if (!isProcessingInput) {
      try {
        startListening('en');
        console.log("Started listening in language: en");
      } catch (error) {
        console.error("Failed to start listening:", error);
        toast({
          title: "Speech Recognition Error",
          description: "Failed to start speech recognition. Please check your microphone permissions or try again.",
          variant: "destructive"
        });
      }
    } else {
      console.log("toggleRecording skipped: processing input");
    }
  }, [
    hasRecognitionSupport,
    isTranscribing,
    finalTranscript,
    currentTranscript,
    startListening,
    stopListening,
    isProcessingInput,
    toast,
    handleUserInput,
    addBotMessage
  ]);

  // Toggle speech synthesis
  const toggleSpeech = () => {
    setSpeechEnabled(prev => {
      if (prev) window.speechSynthesis.cancel();
      return !prev;
    });
  };

  // Track utterance queue for speech synthesis
  const utteranceQueue = useRef<SpeechSynthesisUtterance[]>([]);
  const isSpeakingRef = useRef(false);

  return (
    <div className="bg-white rounded-lg shadow-md max-w-3xl mx-auto p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 py-2 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-blue-500">
            <Volume2 size={20} />
          </span>
          FormEase Voice Assistant
        </h2>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSpeech}
            title={speechEnabled ? "Disable speech" : "Enable speech"}
          >
            {speechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </Button>
        </div>
      </div>
      
      {/* Chat history */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 mb-4 bg-gray-50 rounded-md"
        style={{ minHeight: "300px", maxHeight: "50vh" }}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`mb-4 flex ${message.sender === 'bot' ? 'justify-start' : 'justify-end'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.sender === 'bot' 
                    ? 'bg-blue-50 text-blue-900 rounded-bl-none'
                    : 'bg-blue-500 text-white rounded-br-none'
                } ${message.thinking ? 'italic text-opacity-70' : ''}`}
              >
                {message.text}
                {message.thinking && (
                  <span className="ml-2 inline-block animate-pulse">...</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-center">
              Click the microphone button below to start filling out your form with voice input.
            </p>
          </div>
        )}
      </div>
      
      {/* Microphone button */}
      <div className="flex items-center justify-center mb-4">
        <button
          onClick={handleToggleRecording}
          disabled={isProcessingInput || isNlpProcessing}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all
            ${isTranscribing 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg transform scale-105'
              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'}
            ${(isProcessingInput || isNlpProcessing) ? 'opacity-70 cursor-not-allowed' : ''}`}
          title={isTranscribing ? 'Stop recording' : 'Start recording'}
        >
          {isTranscribing ? (
            <MicOff size={24} className="animate-pulse" />
          ) : (
            <Mic size={24} />
          )}
          
          {(isProcessingInput || isNlpProcessing) && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500 items-center justify-center">
                <span className="text-xs text-white">...</span>
              </span>
            </span>
          )}
        </button>
      </div>
      
      {/* Status indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-500 mb-2">
        <div className="flex items-center justify-center gap-1 p-2 bg-gray-100 rounded">
          <div className={`w-2 h-2 rounded-full ${isTranscribing ? 'bg-red-500' : 'bg-gray-300'}`}></div>
          <span>{isTranscribing ? 'Listening' : 'Mic off'}</span>
        </div>
        
        <div className="flex items-center justify-center gap-1 p-2 bg-gray-100 rounded">
          <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span>{isSpeaking ? 'Speaking' : 'Silent'}</span>
        </div>
        
        <div className="flex items-center justify-center gap-1 p-2 bg-gray-100 rounded">
          <div className={`w-2 h-2 rounded-full ${isProcessingInput || isNlpProcessing ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
          <span>{isProcessingInput || isNlpProcessing ? 'Processing' : 'Ready'}</span>
        </div>
      </div>
      
      {/* Transcription display */}
      {isTranscribing && currentTranscript && (
        <div className="bg-gray-100 p-3 rounded-md mb-4 animate-pulse">
          <p className="text-gray-600 italic">{currentTranscript}</p>
        </div>
      )}
      
      {/* Help text */}
      <div className="text-xs text-gray-400 text-center">
        {isTranscribing 
          ? "Speak clearly. When finished, click the button or pause for a few seconds."
          : "Click the microphone and speak to fill your form. Try: 'My name is...'"
        }
      </div>
    </div>
  );
}