
import { Check } from "lucide-react";
import { useState } from "react";

const benefits = [
  {
    title: "Speed",
    description: "Complete forms up to 10x faster than typing, saving valuable time on repetitive tasks.",
    items: ["Fill forms in seconds", "No more typing errors", "Quick form navigation", "Batch process multiple fields"]
  },
  {
    title: "Convenience",
    description: "Use your voice naturally to fill forms while multitasking or on the go.",
    items: ["Hands-free operation", "Works on mobile and desktop", "No training required", "Smart field detection"]
  },
  {
    title: "Accessibility",
    description: "Make form filling accessible to everyone, regardless of typing ability or physical limitations.",
    items: ["Helps users with disabilities", "Language detection", "Voice command controls", "Customizable speech settings"]
  }
];

const BenefitsSection = () => {
  const [activeBenefit, setActiveBenefit] = useState(0);
  
  return (
    <section id="benefits" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Use Voice Forms?</h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Experience the transformative benefits of voice-powered form completion
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {benefits.map((benefit, index) => (
            <button
              key={index}
              className={`text-left p-4 rounded-lg transition-all duration-300 ${
                activeBenefit === index 
                ? "bg-primary text-white shadow-lg" 
                : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={() => setActiveBenefit(index)}
            >
              <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
              <p className={activeBenefit === index ? "text-white/90" : "text-foreground/70"}>
                {benefit.description}
              </p>
            </button>
          ))}
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h3 className="text-2xl font-bold text-primary mb-6">{benefits[activeBenefit].title} Benefits</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits[activeBenefit].items.map((item, index) => (
              <li key={index} className="flex items-center">
                <div className="mr-3 bg-primary/10 rounded-full p-1">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
