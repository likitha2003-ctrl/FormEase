
import { Check, Mic, Clock, Lock, Globe, MessageSquare } from "lucide-react";

const features = [
  {
    icon: <Mic className="w-6 h-6 text-primary" />,
    title: "Voice Recognition",
    description: "Advanced AI that understands natural language and converts speech to text with incredible accuracy."
  },
  {
    icon: <Clock className="w-6 h-6 text-primary" />,
    title: "10x Faster",
    description: "Complete forms in seconds rather than minutes. Save time and increase productivity."
  },
  {
    icon: <Lock className="w-6 h-6 text-primary" />,
    title: "Secure & Private",
    description: "Your voice data is encrypted and processed securely. We never store your voice recordings."
  },
  {
    icon: <Globe className="w-6 h-6 text-primary" />,
    title: "Works Everywhere",
    description: "Compatible with any website that has forms. No need for special integrations."
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-primary" />,
    title: "Smart Formatting",
    description: "Automatically formats your speech into the appropriate fields including dates and numbers."
  },
  {
    icon: <Check className="w-6 h-6 text-primary" />,
    title: "Validation",
    description: "Ensures form fields are correctly filled before submission to prevent errors."
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Voice Features</h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Our intelligent voice recognition technology makes form filling effortless
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-md transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-foreground/70">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
