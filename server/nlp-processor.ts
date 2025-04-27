import OpenAI from "openai";
import { FormSectionWithFields } from "../src/lib/firebaseService";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "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" });

// Flag to track whether OpenAI API is available
let isOpenAIAvailable = true;

// Function to safely call OpenAI API with fallback mechanisms
async function safeOpenAICall<T>(
  apiCall: () => Promise<T>, 
  fallbackResponse: T, 
  context: string = "OpenAI call"
): Promise<T> {
  // If API was unavailable before, skip the call
  if (!isOpenAIAvailable) {
    console.log(`Skipping ${context} - OpenAI API previously unavailable`);
    return fallbackResponse;
  }
  
  try {
    return await apiCall();
  } catch (error: any) {
    console.error(`OpenAI API error in ${context}:`, error);
    // Mark API as unavailable if we get a rate limit or quota error
    if (error && (error.code === 'insufficient_quota' || error.status === 429)) {
      isOpenAIAvailable = false;
    }
    return fallbackResponse;
  }
}

// Function to extract only a person's name from user input, ignoring extra text
export function extractPersonName(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  
  // Normalize input: trim, and remove extra spaces
  const normalizedInput = input.trim();
  
  // First, try to extract using common "my name is" patterns
  const namePatterns = [
    // Common explicit name patterns with "name is" variations
    /(?:my|the)\s+(?:name|full\s+name|legal\s+name)\s+(?:is|=|:|as)\s+([A-Za-z\s.'"-]+)(?:\.|,|and|$)/i,
    /(?:i\s+am|i'm)\s+([A-Za-z\s.'"-]+)(?:\.|,|and|$)/i,
    /(?:this\s+is|it's)\s+([A-Za-z\s.'"-]+)(?:\.|,|and|$)/i,
    /(?:call\s+me)\s+([A-Za-z\s.'"-]+)(?:\.|,|and|$)/i,
    
    // Advanced patterns for name identification
    /(?:(?:put|write|record|enter|fill|use)\s+(?:down|in)?)\s+([A-Za-z\s.'"-]+)\s+(?:as|for|in)(?:\s+(?:my|the))?\s+(?:name|full\s+name|legal\s+name)/i,
    /(?:my|the)\s+(?:name|full\s+name|legal\s+name)\s+(?:should|would|must|will)\s+be\s+([A-Za-z\s.'"-]+)/i,
    /(?:please\s+)?(?:use|enter|put|write|fill|record)\s+(?:my|the)?\s+(?:name|full\s+name|legal\s+name)\s+(?:as|with|like)\s+([A-Za-z\s.'"-]+)/i,
    
    // Handle direct responses to "what's your name" type questions
    /^([A-Za-z\s.'"-]{2,40})$/i  // Direct name input with reasonable length limit
  ];
  
  for (const pattern of namePatterns) {
    const match = normalizedInput.match(pattern);
    if (match && match[1]) {
      // Clean and format the extracted name
      let name = match[1].trim();
      
      // Remove trailing punctuation
      name = name.replace(/[.,;:!?]$/, '');
      
      // Remove common filler words at the end
      name = name.replace(/\s+(?:is|and|or|but|so|then|here|sir|madam|thank you)$/i, '');
      
      // Return if the name is not empty and reasonable length
      if (name && name.length > 1 && name.length < 40) {
        return name;
      }
    }
  }
  
  // Try the put/set/enter pattern more explicitly for the "Raj Kumar" test case
  const nameAsPattern = /(?:put|set|enter|write|fill|use|write down)(?:\s+(?:down|in))?(?:\s+the\s+name)?\s+(\w+(?:\s+\w+){0,3})\s+(?:as|for|in)\s+(?:my|the)?\s+(?:name|full\s+name|legal\s+name)/i;
  const nameAsMatch = normalizedInput.match(nameAsPattern);
  if (nameAsMatch && nameAsMatch[1]) {
    const extractedName = nameAsMatch[1].trim();
    if (extractedName.length > 1 && extractedName.length < 40) {
      return extractedName;
    }
  }
  
  // If no match found with patterns, try a more speculative approach using name detection
  // Look for sequences of capitalized words that might be names (common name pattern)
  const capitalizedNamePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g;
  
  // Use exec in a loop instead of matchAll for better compatibility
  const capitalizedMatches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = capitalizedNamePattern.exec(normalizedInput)) !== null) {
    capitalizedMatches.push(match);
  }
  
  // Sort by length descending (prefer longer names as they're more likely full names)
  capitalizedMatches.sort((a, b) => b[0].length - a[0].length);
  
  if (capitalizedMatches.length > 0) {
    // Take the longest match (most likely to be a full name)
    return capitalizedMatches[0][0].trim();
  }
  
  // If no match, attempt a fallback to just return the input if it looks like a name
  // (1-3 words, reasonable length, contains letters)
  const wordCount = normalizedInput.split(/\s+/).length;
  if (wordCount >= 1 && wordCount <= 3 && 
      normalizedInput.length > 1 && normalizedInput.length < 40 &&
      /[A-Za-z]/.test(normalizedInput) &&
      !/^(yes|no|ok|sure|fine|maybe|hi|hello|hey)$/i.test(normalizedInput)) {
    
    return normalizedInput;
  }
  
  return null;
}

// Helper function to extract field values from user input
function extractFieldValues(input: string, formSections: FormSectionWithFields[]): { 
  sectionId: number; 
  fieldKey: string; 
  value: string;
}[] {
  const results: { sectionId: number; fieldKey: string; value: string }[] = [];
  const inputLower = input.toLowerCase();
  
  // For direct name field extraction, first check if we have a name
  const extractedName = extractPersonName(input);
  if (extractedName) {
    // Try to find a name field in the form to put this in automatically
    for (const section of formSections) {
      for (const field of section.fields) {
        // Look for fields related to name
        if (field.fieldKey.toLowerCase().includes('name') || 
            field.label.toLowerCase().includes('name')) {
          // Add the extracted name to the results
          results.push({
            sectionId: Number(section.id),
            fieldKey: field.fieldKey,
            value: extractedName
          });
          // Name added, don't need to check more fields
          break;
        }
      }
      // If we found a name field, stop checking sections
      if (results.length > 0) break;
    }
  }
  
  // Continue with regular pattern extraction
  // e.g., "My name is John", "Date of birth is January 1, 1990"
  for (const section of formSections) {
    for (const field of section.fields) {
      const fieldLabelLower = field.label.toLowerCase();
      
      // Skip name fields if we already extracted a name
      if ((fieldLabelLower.includes('name') || field.fieldKey.toLowerCase().includes('name')) && 
          results.some(r => r.fieldKey === field.fieldKey)) {
        continue;
      }
      
      // Check for patterns like "my [field] is [value]"
      const patterns = [
        new RegExp(`(?:my|the)\\s+${fieldLabelLower}\\s+(?:is|was|are|=|:|as)\\s+([\\w\\s,.'-]+)`, 'i'),
        new RegExp(`${fieldLabelLower}\\s+(?:is|:)\\s+([\\w\\s,.'-]+)`, 'i'),
        new RegExp(`(?:i am|i'm)\\s+([\\w\\s,.'-]+)\\s+(?:and|${fieldLabelLower})`, 'i'),
        new RegExp(`(?:put|write|fill|enter)\\s+([\\w\\s,.'-]+)\\s+(?:as|for|in)\\s+(?:the|my|)\\s*${fieldLabelLower}`, 'i'),
        new RegExp(`(?:put|write|fill|enter)\\s+(?:the|my|)\\s*${fieldLabelLower}\\s+(?:as|with)\\s+([\\w\\s,.'-]+)`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = inputLower.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value && value.length > 0) {
            results.push({
              sectionId: Number(section.id),
              fieldKey: field.fieldKey,
              value: value
            });
            break;
          }
        }
      }
    }
  }
  
  return results;
}

export interface NlpResponse {
  fieldUpdates: {
    sectionId: number;
    fieldKey: string;
    value: string;
  }[];
  nextQuestion: string;
  confidence: number;
}

export interface NlpError {
  error: string;
  message: string;
}

export async function processUserInput(
  input: string,
  formCode: string,
  formSections: FormSectionWithFields[],
  currentContext: {
    lastQuestion?: string;
    currentSectionId?: number;
    currentFieldKey?: string;
  }
): Promise<NlpResponse | NlpError> {
  try {
    // Create a prompt that describes the context and request to the AI
    const formStructure = formSections.map(section => ({
      id: section.id,
      title: section.title,
      fields: section.fields.map(field => ({
        fieldKey: field.fieldKey,
        label: field.label,
        value: field.value || 'Not filled',
        required: field.required
      }))
    }));

    try {
      const systemPrompt = `
You are an AI assistant helping a user fill out a ${formCode} form using voice commands.
The user is speaking to you, and their input will be analyzed to extract information for the form.

Current form state:
${JSON.stringify(formStructure, null, 2)}

Current context:
- Last question asked: ${currentContext.lastQuestion || 'None'}
- Current section: ${currentContext.currentSectionId ? formSections.find(s => s.id === currentContext.currentSectionId)?.title : 'None'}
- Current field: ${currentContext.currentFieldKey || 'None'}

Your task is to:
1. Analyze the user's voice input
2. Extract relevant information to fill form fields
3. Determine which fields to update
4. Provide the next question to ask the user

Respond with a JSON object in this exact format:
{
  "fieldUpdates": [
    {
      "sectionId": number,
      "fieldKey": string,
      "value": string
    }
  ],
  "nextQuestion": string,
  "confidence": number (0.0 to 1.0)
}

For fieldUpdates, include ALL fields you can extract from the input, even if there are multiple.
For nextQuestion, provide a natural-sounding follow-up question based on the form's flow.
For confidence, provide a number from 0 to 1 indicating how confident you are in the extraction.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}') as NlpResponse;
      
      if (!result.fieldUpdates || !Array.isArray(result.fieldUpdates) || !result.nextQuestion) {
        throw new Error("Invalid response format from OpenAI");
      }

      return result;
    } catch (apiError) {
      console.log("OpenAI API error, falling back to local processing:", apiError);
      
      // Use our fallback logic to extract field values
      const fieldUpdates = extractFieldValues(input, formSections);
      
      // Find a field to ask about next
      let nextQuestion = "Could you please provide more information for the form?";
      
      // Find the first empty required field to ask about
      const flatFields = formSections.flatMap(section => 
        section.fields.map(field => ({ 
          section, 
          field,
          isEmpty: !field.value || field.value.trim() === ""
        }))
      );
      
      // Prioritize required empty fields
      const nextEmptyRequiredField = flatFields.find(f => f.field.required && f.isEmpty);
      if (nextEmptyRequiredField) {
        nextQuestion = `What is your ${nextEmptyRequiredField.field.label.toLowerCase()}?`;
      } else {
        // Or just any empty field
        const nextEmptyField = flatFields.find(f => f.isEmpty);
        if (nextEmptyField) {
          nextQuestion = `Can you tell me your ${nextEmptyField.field.label.toLowerCase()}?`;
        } else {
          // All fields are filled, suggest submission
          nextQuestion = "All fields are filled. Would you like to submit the form now?";
        }
      }
      
      return {
        fieldUpdates,
        nextQuestion,
        confidence: 0.7 // Moderate confidence for regex-based extraction
      };
    }
  } catch (error) {
    console.error("Error processing NLP:", error);
    return {
      error: "NLP_PROCESSING_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// Function to determine intent of user input (e.g., edit field, submit form, etc.)
export async function determineUserIntent(
  input: string,
  formSections: FormSectionWithFields[]
): Promise<{ intent: string; sectionId?: number; fieldKey?: string; value?: string }> {
  try {
    const systemPrompt = `
You are analyzing a user's voice input to determine their intent while filling out a form.
The form has the following structure:
${JSON.stringify(formSections.map(s => ({
  id: s.id,
  title: s.title,
  fields: s.fields.map(f => ({
    fieldKey: f.fieldKey,
    label: f.label,
  }))
})), null, 2)}

Analyze the input and determine if the user wants to:
1. "edit" - Edit a specific field (e.g., "Change my name to John")
2. "submit" - Submit the form (e.g., "I'm done", "Submit the form")
3. "goBack" - Go back or cancel (e.g., "Go back", "Cancel")
4. "fillField" - Provide information for a specific field (e.g., "My name is John")

Respond with a JSON object in this exact format:
{
  "intent": "edit|submit|goBack|fillField",
  "sectionId": number or null,
  "fieldKey": string or null,
  "value": string or null
}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (apiError) {
      console.log("OpenAI API error in intent detection, using fallback:", apiError);
      
      // Fallback intent detection using regex patterns
      const inputLower = input.toLowerCase();
      
      // Enhanced check for submission intent
      const submitPatterns = [
        /\b(submit|done|finish|complete|send|ready|go ahead|proceed|finalize)\b/i,
        /\b(that'?s all|everything is complete|looks? good|i'?m done|let'?s submit)\b/i,
        /\b(yes|yeah|correct|sure|absolutely|please|ok|okay)\b.*\b(submit|send|finish|complete)\b/i
      ];
      
      if (submitPatterns.some(pattern => pattern.test(inputLower))) {
        return { intent: "submit" };
      }
      
      // Enhanced check for go back intent
      const backPatterns = [
        /\b(go\s*back|back|cancel|return|previous|start over|restart|begin again)\b/i,
        /\b(take me back|i want to go back|let'?s go back|return to previous)\b/i,
        /\b(exit|quit|stop|abandon|leave)\b/i
      ];
      
      if (backPatterns.some(pattern => pattern.test(inputLower))) {
        return { intent: "goBack" };
      }
      
      // Multiple edit patterns to catch different phrasings
      const editPatterns = [
        /(?:change|edit|update|correct|fix)\s+(?:my|the)?\s+([a-z\s]+)\s+to\s+([a-z0-9\s,.'-]+)/i,
        /(?:set|make)\s+(?:my|the)?\s+([a-z\s]+)\s+(?:to|as|be)?\s+([a-z0-9\s,.'-]+)/i,
        /(?:change|edit|update|correct|fix)\s+(?:my|the)?\s+([a-z\s]+)/i // Just field without value
      ];
      
      for (const pattern of editPatterns) {
        const editMatches = inputLower.match(pattern);
        if (editMatches) {
          const fieldLabel = editMatches[1].trim();
          const newValue = editMatches[2]?.trim(); // May be undefined for the third pattern
          
          // Find matching field and section
          for (const section of formSections) {
            for (const field of section.fields) {
              if (field.label.toLowerCase().includes(fieldLabel) || 
                  field.fieldKey.toLowerCase().includes(fieldLabel)) {
                
                // If we have a value, include it
                if (newValue) {
                  return {
                    intent: "edit",
                    sectionId: Number(section.id),
                    fieldKey: field.fieldKey,
                    value: newValue
                  };
                } else {
                  // Just the field to edit
                  return {
                    intent: "edit",
                    sectionId: Number(section.id),
                    fieldKey: field.fieldKey
                  };
                }
              }
            }
          }
        }
      }
      
      // Check for direct name inputs first
      const extractedName = extractPersonName(input);
      if (extractedName) {
        // Try to find a name field in the form to set this intent
        for (const section of formSections) {
          for (const field of section.fields) {
            if (field.fieldKey.toLowerCase().includes('name') || 
                field.label.toLowerCase().includes('name')) {
              return {
                intent: "fillField",
                sectionId: Number(section.id),
                fieldKey: field.fieldKey,
                value: extractedName
              };
            }
          }
        }
        
        // If no name field found but we detected a name, still set fillField intent
        return { 
          intent: "fillField",
          value: extractedName 
        };
      }
      
      // Check for other direct answers to questions (short inputs)
      if (input.trim().split(/\s+/).length <= 5 && !input.includes(':')) {
        // This might be a direct answer to the last question
        return { 
          intent: "fillField",
          value: input.trim() 
        };
      }
      
      // Extract field values - if any found, consider it a fillField intent
      const fieldUpdates = extractFieldValues(input, formSections);
      if (fieldUpdates.length > 0) {
        const firstUpdate = fieldUpdates[0];
        return {
          intent: "fillField",
          sectionId: Number(firstUpdate.sectionId),
          fieldKey: firstUpdate.fieldKey,
          value: firstUpdate.value
        };
      }
      
      // Default to fillField as the safest option
      return { intent: "fillField" };
    }
  } catch (error) {
    console.error("Error determining user intent:", error);
    // Default to fillField as the safest option
    return { intent: "fillField" };
  }
}

export async function generateWelcomeMessage(formCode: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Generate a friendly welcome message in English for a user filling out a ${formCode} form. 
          The message should be conversational and explain that you're an AI assistant 
          who will help them fill the form using voice commands. Keep it to 2-3 sentences.
          Respond ONLY in English.`
        }
      ]
    });

    return response.choices[0].message.content || getDefaultWelcomeMessage(formCode);
  } catch (apiError) {
    console.log("OpenAI API error in welcome message, using fallback:", apiError);
    return getDefaultWelcomeMessage(formCode);
  }
}

// Generate a default welcome message based on form type
function getDefaultWelcomeMessage(formCode: string): string {
  const baseInstructions = "To answer questions, just speak clearly after I ask each question. You can also say 'edit [field name]' to change a field, or 'submit' when you're done.";

  // English welcome messages for different form types
  const enMessages: Record<string, string> = {
    'passport': `Welcome to the Passport application form! I'm your FormEase assistant, and I'll help you complete this form using voice commands. ${baseInstructions}`,
    'aadhaar': `Welcome to the Aadhaar application form! I'm your FormEase assistant here to guide you through each section of this form. ${baseInstructions}`,
    'voterid': `Welcome to the Voter ID application form! I'm your FormEase assistant here to help you complete this form using voice commands. ${baseInstructions}`,
    'default': `Welcome to FormEase! I'm your digital assistant, ready to help you complete your form using voice commands. ${baseInstructions}`
  };

  return enMessages[formCode.toLowerCase()] || enMessages['default'];
}