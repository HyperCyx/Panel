'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { signup } from '@/app/actions';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phone: z.string().min(5, { message: 'Phone number must be at least 5 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  agentEmail: z.string().email({ message: 'Invalid agent email address.' }),
  captcha: z.string().min(1, { message: 'Please answer the security question.' }),
});

type FormSchema = z.infer<typeof formSchema>;

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      password: '',
      agentEmail: '',
      captcha: '',
    },
  });

  useEffect(() => {
    // Generate random numbers on client side to avoid hydration mismatch
    setNum1(Math.floor(Math.random() * 10));
    setNum2(Math.floor(Math.random() * 10));
  }, []);

  async function onSubmit(values: FormSchema) {
    if (parseInt(values.captcha, 10) !== num1 + num2) {
      form.setError('captcha', {
        type: 'manual',
        message: 'Incorrect answer. Please try again.',
      });
      setNum1(Math.floor(Math.random() * 10));
      setNum2(Math.floor(Math.random() * 10));
      form.setValue('captcha', '');
      return;
    }

    setIsLoading(true);
    const { captcha, ...signupValues } = values;
    
    try {
      const result = await signup(signupValues);
      
      if (result.error) {
        setIsLoading(false);
        toast({ variant: 'destructive', title: 'Sign Up Failed', description: result.error });
        setNum1(Math.floor(Math.random() * 10));
        setNum2(Math.floor(Math.random() * 10));
        form.setValue('captcha', '');
      } else if (result.success) {
        toast({ title: 'Account Created', description: 'Your account is pending approval by your agent or admin.' });
        router.push('/login');
      }
    } catch (error) {
      setIsLoading(false);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="+1234567890" {...field} />
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
                <Input placeholder="name@example.com" {...field} />
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
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="agentEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent Email ID</FormLabel>
              <FormControl>
                <Input placeholder="agent@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="captcha"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel className="flex-shrink-0">
                  What is {num1} + {num2} = ?
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Answer"
                    autoComplete="off"
                    className="w-full"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
           {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign Up
        </Button>
      </form>
    </Form>
  );
}
