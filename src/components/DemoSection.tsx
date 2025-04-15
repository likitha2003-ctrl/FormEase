
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic } from "lucide-react";
import { useState } from "react";

const DemoSection = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  // Simulate voice input
  const handleMicClick = () => {
    setIsRecording(true);
    
    // Simulate typing with a delay
    const simulateTyping = (field: string, value: string, delay: number) => {
      let currentText = "";
      const interval = setInterval(() => {
        if (currentText.length < value.length) {
          currentText = value.substring(0, currentText.length + 1);
          setFormData(prev => ({ ...prev, [field]: currentText }));
        } else {
          clearInterval(interval);
        }
      }, delay);
    };

    // Simulate filling the form fields with delays
    setTimeout(() => {
      simulateTyping("name", "Jane Smith", 100);
      
      setTimeout(() => {
        simulateTyping("email", "jane.smith@example.com", 80);
        
        setTimeout(() => {
          simulateTyping("phone", "(555) 123-4567", 100);
          
          setTimeout(() => {
            simulateTyping("message", "I'd like to know more about your voice form service.", 50);
            
            setTimeout(() => {
              setIsRecording(false);
            }, 2000);
          }, 1500);
        }, 2000);
      }, 1500);
    }, 500);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-white to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">See How It Works</h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Try our interactive demo to experience the magic of voice form filling
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Contact Form Demo</h3>
              <Button 
                className={`${isRecording ? "bg-red-500 text-white" : "border border-gray-300 text-gray-700"} flex items-center space-x-2`}
                onClick={handleMicClick}
                disabled={isRecording}
              >
                <Mic className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`} />
                <span>{isRecording ? "Recording..." : "Start Speaking"}</span>
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">Full Name</label>
                <Input 
                  id="name" 
                  placeholder="Your name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email Address</label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone Number</label>
                <Input 
                  id="phone" 
                  placeholder="(555) 123-4567" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
                <textarea 
                  id="message" 
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="What would you like to know?"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                />
              </div>
              
              <Button className="w-full">Submit Form</Button>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 border-t">
            <p className="text-sm text-foreground/70">Try saying: "My name is Jane Smith, my email is jane.smith@example.com, my phone number is 555-123-4567..."</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
