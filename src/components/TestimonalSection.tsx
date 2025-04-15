
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "HR Manager",
    company: "TechGlobal Inc.",
    image: "/placeholder.svg",
    content: "FormEase has revolutionized our onboarding process. What used to take 30 minutes now takes less than 5. The voice recognition is incredibly accurate and our new hires love the experience.",
    stars: 5
  },
  {
    name: "Michael Chen",
    role: "Medical Doctor",
    company: "City Health Clinic",
    image: "/placeholder.svg",
    content: "As a doctor, I'm constantly filling out patient forms. FormEase allows me to do this while maintaining eye contact with my patients. It's truly transformed my workflow and patient relationships.",
    stars: 5
  },
  {
    name: "Aisha Patel",
    role: "Customer Service Manager",
    company: "Retail Solutions",
    image: "/placeholder.svg",
    content: "The accessibility features of FormEase have been a game changer for our diverse team. Everyone can use forms efficiently regardless of their typing abilities or physical limitations.",
    stars: 4
  }
];

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const nextTestimonial = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }
  };

  const prevTestimonial = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  return (
    <section id="testimonials" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Thousands of professionals are saving time with FormEase
          </p>
        </div>
        
        <div className="relative max-w-4xl mx-auto">
          <div className="overflow-hidden rounded-xl bg-white shadow-lg">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index} 
                  className="min-w-full p-8 md:p-10"
                >
                  <div className="flex flex-col md:flex-row md:items-center mb-6">
                    <Avatar className="w-16 h-16 mb-4 md:mb-0 md:mr-4">
                      <AvatarImage src={testimonial.image} alt={testimonial.name} />
                      <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{testimonial.name}</h3>
                      <p className="text-foreground/70">{testimonial.role}, {testimonial.company}</p>
                      <div className="flex mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            fill={i < testimonial.stars ? "currentColor" : "none"} 
                            className={i < testimonial.stars ? "text-yellow-400" : "text-gray-300"} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <blockquote className="text-lg md:text-xl italic text-foreground/80">
                    "{testimonial.content}"
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-center mt-6 space-x-2">
            {testimonials.map((_, index) => (
              <button 
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "bg-primary scale-125" : "bg-gray-300"
                }`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
          
          <Button 
            className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full hidden md:flex outline p-2"
            onClick={prevTestimonial}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button 
            className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full hidden md:flex outline p-2"
            onClick={nextTestimonial}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
