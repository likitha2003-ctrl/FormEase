
import { useState, useRef } from "react";
import { signInWithPhone, setupRecaptcha } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Phone } from "lucide-react";
import { RecaptchaVerifier, ConfirmationResult } from "firebase/auth";

const phoneFormSchema = z.object({
  phoneNumber: z.string().min(10, { message: "Phone number is required." }),
});

const otpFormSchema = z.object({
  otp: z.string().min(6, { message: "Please enter the 6-digit code." }),
});

type PhoneSignInProps = {
  onSuccess?: () => void;
  mode: 'signin' | 'signup';
};

export function PhoneSignIn({ onSuccess, mode }: PhoneSignInProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  
  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: "",
    },
  });

  const sendOTP = async (values: z.infer<typeof phoneFormSchema>) => {
    setIsLoading(true);

    try {
      if (!recaptchaContainerRef.current) {
        throw new Error("reCAPTCHA container not found");
      }

      const formattedPhone = values.phoneNumber.startsWith('+') 
        ? values.phoneNumber 
        : `+${values.phoneNumber}`;
      
      const appVerifier = setupRecaptcha('recaptcha-container');
      const result = await signInWithPhone(formattedPhone, appVerifier);
      
      setConfirmationResult(result);
      setStep('otp');
      
      toast({
        title: "Verification code sent",
        description: `We've sent a verification code to ${formattedPhone}`,
      });
    } catch (error: any) {
      toast({
        title: "Phone verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (values: z.infer<typeof otpFormSchema>) => {
    if (!confirmationResult) return;
    
    setIsLoading(true);
    
    try {
      const userCredential = await confirmationResult.confirm(values.otp);
      setCurrentUser(userCredential.user);
      
      toast({
        title: mode === 'signup' ? "Account created!" : "Logged in!",
        description: mode === 'signup' 
          ? "You have successfully registered with your phone."
          : "You have successfully logged in with your phone.",
      });
      
      if (onSuccess) onSuccess();
      
      // Redirect to main page after successful login
      setTimeout(() => {
        navigate("/main");
      }, 500);
    } catch (error: any) {
      toast({
        title: "Code verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      {step === 'phone' ? (
        <Form {...phoneForm}>
          <form onSubmit={phoneForm.handleSubmit(sendOTP)} className="space-y-4">
            <FormField
              control={phoneForm.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="+1234567890" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div ref={recaptchaContainerRef} id="recaptcha-container"></div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending code..." : "Send verification code"}
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(verifyOTP)} className="space-y-4">
            <FormField
              control={otpForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <InputOTP maxLength={6} {...field}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button type="button" className="flex-1 outline" onClick={() => setStep('phone')}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </>
  );
}