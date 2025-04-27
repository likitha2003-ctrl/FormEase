
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from "@/context/AuthContext";
import UserProfile from '@/components/UserProfile';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "@/components/LoginForm";
import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { FileText, CreditCard, UserCheck } from "lucide-react";
import { Facebook, Twitter, Instagram, Github } from "lucide-react";
import { id } from 'date-fns/locale';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white pt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center"
                style={{ 
                  backgroundImage: "url('/logo.jpeg')", 
                  backgroundSize: 'cover' }}
              />
              <span className="font-bold text-xl">FormEase</span>
            </div>
            <p className="text-gray-400 mb-4">
              Revolutionizing form filling with powerful voice recognition technology.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Github size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#features" className="text-gray-400 hover:text-white">Features</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Pricing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">API</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Integrations</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Community</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Help Center</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 py-6 text-gray-400 text-sm text-center">
          <p>&copy; {currentYear} FormEase. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

const MainPage: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const currentYear = new Date().getFullYear();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  const forms = [
    {
      id: 'passport',
      title: 'Passport Application',
      description: 'Apply for new passport or renew existing one',
      imageSrc: '/form-logo.png', // Add your image path here
    },
    {
      id: 'aadhaar',
      title: 'Aadhaar Card',
      description: 'Apply or update your Aadhaar identification',
      imageSrc: '/form-logo1.jpg', // Add your image path here
    },
    {
      id: 'voter id',
      title: 'Voter ID',
      description: 'Apply for Voter ID or update your details',
      imageSrc: '/form-logo2.png', // Add your image path here
    },
  ];

  // While checking authentication status, show nothing (or a loading spinner)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSelectForm = (formId: string) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    navigate(`/form/${formId}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <header className="flex items-center justify-between p-6 shadow-sm bg-white/80 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          {currentUser ? (
            <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden border border-primary/20"
              style={{ backgroundImage: `url('/logo.jpeg')`, backgroundSize: 'cover' }}>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{
                backgroundImage: "url('/logo.jpeg')",
                backgroundSize: 'cover'
              }}
            />
          )}
          <h1 className="text-xl font-bold text-primary">FormEase</h1>
        </div>
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <UserProfile />
          ) : (
            <Button 
              className="bg-accent hover:bg-accent/90 text-white"
              onClick={() => setShowLoginModal(true)}
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      <main className="flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-gradient">
          Complete Government Forms with Voice
        </h2>
        <p className="text-foreground/80 max-w-2xl mb-10">
          Our AI assistant helps you fill out complex forms using just your voice. No typing required - simply talk to our assistant.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {forms.map((form, index) => (
            <Card key={index} className="h-full rounded-2xl p-6 bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg flex flex-col">
              <CardContent className="flex flex-col items-center flex-grow">
              <div className="h-16 w-16 rounded-full mb-4 flex items-center justify-center bg-gray-100 overflow-hidden">
                {form.imageSrc ? (
                  <img src={form.imageSrc} alt={`${form.title} icon`} className="h-full w-full object-cover" />
                ) : null}
                </div>
                <div className="flex-grow flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{form.title}</h3>
                  <p className="text-sm text-foreground/70 mb-4 flex-grow">{form.description}</p>
                  <Button className="bg-accent hover:bg-primary text-white mt-auto"
                    onClick={() => handleSelectForm(form.id)}>
                    Select
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="bg-gray-900 text-white pt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center"
                style={{ 
                  backgroundImage: "url('/logo.jpeg')", 
                  backgroundSize: 'cover' }}
              />
              <span className="font-bold text-xl">FormEase</span>
            </div>
            <p className="text-gray-400 mb-4">
              Revolutionizing form filling with powerful voice recognition technology.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Github size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#features" className="text-gray-400 hover:text-white">Features</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Pricing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">API</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Integrations</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Community</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Help Center</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 py-6 text-gray-400 text-sm text-center">
          <p>&copy; {currentYear} FormEase. All rights reserved.</p>
        </div>
      </div>
    </footer>

      {/* Login Dialog */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <LoginForm onSuccess={() => setShowLoginModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default MainPage;
