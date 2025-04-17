import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import UserProfile from '@/components/UserProfile';
import { ArrowLeft, ChevronDown, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FormSection {
  id: number;
  title: string;
  isOpen: boolean;
}

interface FormField {
  label: string;
  name: string;
  type: string;
  options?: string[];
  fields?: FormField[];
}

type FormStructure = {
  [section: string]: FormField[];
};

const FormFillingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { formType } = useParams();
  const navigate = useNavigate();

  const [formStructure, setFormStructure] = useState<FormStructure>({});
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [sections, setSections] = useState<FormSection[]>([]);
  const [listeningStatus, setListeningStatus] = useState<'off' | 'speaking' | 'ready'>('off');

  const getFormTitle = () => {
    switch (formType) {
      case 'passport':
        return 'Passport Application Form';
      case 'aadhaar':
        return 'Aadhaar Card Application Form';
      case 'voter id':
        return 'Voter ID Application Form';
      default:
        return 'Application Form';
    }
  };

  const toggleSection = (id: number) => {
    setSections(sections.map(section =>
      section.id === id ? { ...section, isOpen: !section.isOpen } : section
    ));
  };

  const toggleVoiceAssistant = () => {
    setListeningStatus(prev => (prev === 'off' ? 'ready' : 'off'));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper function to transform raw JSON fields to FormField[]
  const transformFields = (fields: any[]): FormField[] => {
    return fields.map((field) => {
      const transformedField: FormField = {
        label: field.field_name,
        name: field.field_name.replace(/\s+/g, '_').toLowerCase(),
        type: field.type || 'text',
      };
      if (field.options) {
        transformedField.options = field.options;
      }
      if (field.fields) {
        transformedField.fields = transformFields(field.fields);
      }
      return transformedField;
    });
  };

  // Load form JSON structure
  useEffect(() => {
    const loadFormStructure = async () => {
      try {
        // Normalize formType to match file names
        let normalizedFormType = formType;
        if (formType === 'aadhaar') {
          normalizedFormType = 'aadhar';
        }
        if (formType === 'voter id') {
          normalizedFormType = 'voterid';
        }
        if (formType === 'passport') {
          normalizedFormType = 'passport';
        }

        const file = await import(`../data/${normalizedFormType}Form.json`);
        const structure = file.default;

        let newSections: FormSection[] = [];
        let transformedStructure: FormStructure = {};

        if (Array.isArray(structure.form_fields) && structure.form_fields.length > 0 && structure.form_fields[0].section) {
          // Structure like passportForm.json with sections array
          newSections = structure.form_fields.map((section: any, idx: number) => ({
            id: idx + 1,
            title: section.section,
            isOpen: idx === 0
          }));

          for (const section of structure.form_fields) {
            transformedStructure[section.section] = transformFields(section.fields);
          }
        } else if (Array.isArray(structure.form_fields)) {
          // Structure like aadharForm.json with flat fields array
          newSections = [{
            id: 1,
            title: 'Form',
            isOpen: true
          }];
          transformedStructure['Form'] = transformFields(structure.form_fields);
        } else {
          // Fallback for other structures
          newSections = Object.keys(structure).map((title, idx) => ({
            id: idx + 1,
            title,
            isOpen: idx === 0
          }));

          for (const sectionTitle of Object.keys(structure)) {
            const rawFields = structure[sectionTitle].form_fields || structure[sectionTitle];
            transformedStructure[sectionTitle] = transformFields(rawFields);
          }
        }

        setSections(newSections);
        setFormStructure(transformedStructure);
      } catch (error) {
        console.error("Error loading form JSON:", error);
      }
    };

    loadFormStructure();
  }, [formType]);

  // Recursive rendering of fields including nested fields
  const renderFields = (fields: FormField[]) => {
    return fields.map((field, idx) => (
      <div key={idx} className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor={field.name}>
          {field.label}
        </label>
        <input
          type={field.type}
          name={field.name}
          id={field.name}
          value={formData[field.name] || ''}
          onChange={handleInputChange}
          className="w-full border border-input rounded-md px-3 py-2 text-sm"
        />
        {field.fields && field.fields.length > 0 && (
          <div className="pl-4 border-l border-gray-300 mt-2">
            {renderFields(field.fields)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 -z-10 opacity-50" />
      <div className="absolute top-20 right-10 h-64 w-64 rounded-full bg-primary/5 -z-10" />
      <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-secondary/5 -z-10" />

      {/* Header */}
      <header className="flex items-center justify-between p-6 bg-transparent">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full" style={{ backgroundImage: "url('/logo.jpeg')", backgroundSize: 'cover' }} />
          <span className="font-bold text-xl">FormEase</span>
        </div>
        <div className="flex items-center space-x-4">
          {currentUser ? <UserProfile /> : (
            <Button className="bg-accent hover:bg-accent/90 text-white" onClick={() => setShowLoginModal(true)}>
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Form Title */}
      <div className="bg-secondary/10 p-4">
        <div className="container mx-auto">
          <Link to="/main" className="flex items-center text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <h1 className="text-2xl font-bold">{`Fill ${getFormTitle()}`}</h1>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Preview */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-md rounded-lg">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-2">Form Preview</h2>
                <p className="text-sm text-foreground/70 flex items-center mb-6">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span className="ml-2">Click any field to edit it manually, or use the voice assistant</span>
                </p>

                {sections.map((section) => (
                  <Collapsible key={section.id} open={section.isOpen} onOpenChange={() => toggleSection(section.id)} className="mb-4">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center p-4 bg-secondary/10 rounded-lg">
                        <div className="h-6 w-6 rounded-full bg-accent/20 text-accent mr-4 flex items-center justify-center text-xs font-bold">
                          {section.id}
                        </div>
                        <span className="font-semibold">{section.title}</span>
                        <ChevronDown className={`ml-auto h-5 w-5 transition-transform ${section.isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="bg-white p-4 rounded-b-lg border-t">
                      {renderFields(formStructure[section.title] || [])}
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => navigate('/main')}>
                    Back
                  </Button>
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    Submit Form
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Voice Assistant */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-md rounded-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">FormEase Voice Assistant</h2>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-foreground/70">Language:</span>
                  <select className="bg-transparent border border-input rounded-md text-sm focus:outline-none p-1">
                    <option>English</option>
                    <option>Hindi</option>
                  </select>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg mb-8">
                  <p className="text-blue-800">
                    Welcome to the {getFormTitle()} form! I'm your FormEase assistant, and I'll help you complete this form using voice commands.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center space-y-6">
                  <Button
                    className={`h-20 w-20 rounded-full flex items-center justify-center ${
                      listeningStatus === 'off' ? 'bg-primary/20' : 'bg-primary animate-pulse'
                    }`}
                    onClick={toggleVoiceAssistant}
                  >
                    <Mic className={`h-8 w-8 ${listeningStatus === 'off' ? 'text-primary' : 'text-white'}`} />
                  </Button>

                  <div className="flex justify-around w-full text-xs text-foreground/70">
                    <div className="flex items-center">
                      <span className={`h-2 w-2 rounded-full mr-1 ${listeningStatus === 'off' ? 'bg-foreground/30' : 'bg-transparent'}`} />
                      Listening off
                    </div>
                    <div className="flex items-center">
                      <span className={`h-2 w-2 rounded-full mr-1 ${listeningStatus === 'speaking' ? 'bg-green-500' : 'bg-transparent'}`} />
                      Speaking...
                    </div>
                    <div className="flex items-center">
                      <span className={`h-2 w-2 rounded-full mr-1 ${listeningStatus === 'ready' ? 'bg-blue-500' : 'bg-transparent'}`} />
                      Ready
                    </div>
                  </div>

                  <p className="text-xs text-center text-foreground/70">
                    Click the microphone button and speak to fill out your form. Try phrases like "My name is..."
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FormFillingPage;
