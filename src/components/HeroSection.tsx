import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RegisterForm } from "@/components/RegisterForm";

const HeroSection = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background video with overlay */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
        src="/video.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      
      {/* Overlay gradient for additional depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 -z-10" />
      
      {/* Decorative circles */}
      <div className="absolute top-20 right-10 h-64 w-64 rounded-full bg-primary/5 -z-10" />
      <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-secondary/5 -z-10" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 space-y-6 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight text-white">
              Fill Forms With 
              <span className="text-gradient"> Your Voice</span>
            </h1>
            <p className="text-1g md:text-xl text-foreground/70 max-w-lg text-white">
              Complete forms 10x faster with our revolutionary voice-to-text technology. Say goodbye to tedious typing and hello to effortless form filling.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center md:justify-start">
              <Button 
                className="bg-accent hover:bg-accent/70 text-white text-lg py-3 px-6"
                onClick={() => setShowRegisterModal(true)}
              >
                Start Filling With Your Voice!
              </Button>
              <Button className="border border-gray-300 text-gray-700 hover:bg-gray-100">
                Watch Demo
              </Button>
            </div>
          </div>
          
          <div className="md:w-1/2 mt-12 md:mt-0 flex justify-center">
            <div className="relative w-64 h-64 animate-float">
              {/* Microphone with pulsing effect */}
              <div 
                className="relative flex items-center justify-center"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className={`absolute w-full h-full rounded-full bg-primary animate-pulse-ring ${isHovered ? 'opacity-100' : 'opacity-40'}`} />
                <div className={`absolute w-[90%] h-[90%] rounded-full bg-primary/60 ${isHovered ? 'animate-pulse-ring opacity-60' : 'opacity-0'}`} />
                <div className={`relative bg-white shadow-lg w-40 h-40 rounded-full flex items-center justify-center animate-pulse-dot z-10`}>
                  <Mic className={`w-16 h-16 transition-colors duration-300 ${isHovered ? 'text-accent' : 'text-primary'}`} />
                </div>
              </div>
              
              {/* Animated text bubble */}
              <div className={`absolute top-0 right-0 bg-white p-4 rounded-xl shadow-lg transition-all duration-500 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} z-20`}>
                <div className="animate-typing font-medium">
                  "Fill this form with my voice..."
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Dialog */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="sm:max-w-md">
          <RegisterForm onSuccess={() => setShowRegisterModal(false)} />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;
