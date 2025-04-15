
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { registerUser } from "@/lib/firebase";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { PhoneSignIn } from "@/components/PhoneSignIn";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

export function RegisterForm({ onSuccess, onRegistrationComplete }: { 
  onSuccess?: () => void;
  onRegistrationComplete?: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("email");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
      const user = await registerUser(values.email, values.password);
      toast({
        title: "Account created!",
        description: "You have successfully registered. Please log in now.",
      });
      
      setIsLoading(false);
      
      if (onSuccess) onSuccess();
      
      // Switch to login form after registration is complete
      if (onRegistrationComplete) {
        setTimeout(() => {
          onRegistrationComplete();
        }, 500);
      }
    } catch (error: any) {
      setIsLoading(false);
      
      if (error.message.includes('auth/email-already-in-use')) {
        toast({
          title: "Email already registered",
          description: "This email is already in use. Please log in instead.",
          variant: "destructive",
          action: (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onRegistrationComplete?.()}
            >
              Go to Login
            </Button>
          )
        });
      } else {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  }

  const handleSuccessfulSocialSignup = () => {
    if (onSuccess) onSuccess();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold">Create an account</h2>
        <p className="text-muted-foreground text-sm">
          Enter your information below to create your account
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>
        
        <TabsContent value="email">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="John Doe" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="john@example.com" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="pl-10" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="google">
          <div className="py-4">
            <GoogleSignIn onSuccess={handleSuccessfulSocialSignup} mode="signup" />
          </div>
        </TabsContent>
        
        <TabsContent value="phone">
          <div className="py-2">
            <PhoneSignIn onSuccess={handleSuccessfulSocialSignup} mode="signup" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}