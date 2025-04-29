import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import UserProfile from "@/components/UserProfile";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import { useAuth } from "@/context/AuthContext";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "react-router-dom";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpenRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleOpenLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };


  const navLinks = [
    { title: "Features", href: "#features" },
    { title: "Benefits", href: "#benefits" },
    { title: "Testimonials", href: "#testimonials" },
    { title: "Pricing", href: "#pricing" },
  ];

  return (
    <header 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ 
              background: "url('/logo.jpeg')", 
              backgroundSize: 'cover' }}
            />
          <span className="font-bold text-xl text-primary hover:text-orange-600 transition-colors">FormEase</span>
        </div>
        
        <nav className="hidden md:flex space-x-8">
        {navLinks.map(link => (
            <a 
              key={link.title}
              href={link.href} 
              className="text-foreground/80 text-xl hover:text-primary transition-colors"
            >
              {link.title}
            </a>
          ))}
        </nav>
        
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <UserProfile />
          ) : (
            <>
              <Button 
                className="hidden text-color-black md:inline-flex bg-transparent hover:bg-gray-100"
                onClick={() => setShowLoginModal(true)}
              >
                Log in
              </Button>
              <Button 
                className="bg-accent hover:bg-accent/90"
                onClick={() => setShowRegisterModal(true)}
              >
                {isMobile ? "Start" : "Get Started"}
              </Button>
            </>
          )}

          {/* Mobile Navigation */}
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[75%] sm:w-[350px] py-12">
                <nav className="flex flex-col gap-6">
                  {navLinks.map(link => (
                    <SheetClose asChild key={link.title}>
                      <a
                        href={link.href}
                        className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {link.title}
                      </a>
                    </SheetClose>
                  ))}
                  {!currentUser && (
                    <SheetClose asChild>
                      <Button 
                        onClick={() => setShowLoginModal(true)}
                        className="w-full mt-4"
                      >
                        Log in
                      </Button>
                    </SheetClose>
                  )}
                  <SheetClose asChild>
                    <Link to="/main" className="block mt-4">
                      <Button className="w-full bg-primary hover:bg-primary/90">
                        Access Dashboard
                      </Button>
                    </Link>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
            )} 
        </div>
      </div>

      {/* Login Dialog */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <LoginForm onSuccess={() => setShowLoginModal(false)} />
          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <Button className="p-0 text-link" onClick={handleOpenRegister}>
              Register
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Dialog */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="sm:max-w-md">
          <RegisterForm 
            onSuccess={() => setShowRegisterModal(false)} 
            onRegistrationComplete={handleOpenLogin}
          />
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Button className="p-0 text-link" onClick={handleOpenLogin}>
              Log in
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
