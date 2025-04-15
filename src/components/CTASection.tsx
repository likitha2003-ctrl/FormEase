
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary to-primary/80 text-white">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Form Experience?</h2>
          <p className="text-xl opacity-90 mb-8">
            Join thousands of users who save time and increase productivity with voice-powered forms.
          </p>
          
          <Button 
            className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 h-auto group"
          >
            <Mic className="mr-2 w-5 h-5 transition-transform group-hover:scale-110" />
            Start Filling With Your Voice!
          </Button>
          
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <div className="p-4 rounded-lg bg-white/10">
              <h3 className="text-3xl font-bold">10x</h3>
              <p className="opacity-80">Faster Form Filling</p>
            </div>
            
            <div className="p-4 rounded-lg bg-white/10">
              <h3 className="text-3xl font-bold">99%</h3>
              <p className="opacity-80">Accuracy Rate</p>
            </div>
            
            <div className="p-4 rounded-lg bg-white/10">
              <h3 className="text-3xl font-bold">5k+</h3>
              <p className="opacity-80">Happy Users</p>
            </div>
            
            <div className="p-4 rounded-lg bg-white/10">
              <h3 className="text-3xl font-bold">24/7</h3>
              <p className="opacity-80">Support Available</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
