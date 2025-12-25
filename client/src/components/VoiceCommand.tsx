import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface VoiceCommandProps {
  className?: string;
}

export function VoiceCommand({ className = '' }: VoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [continuousRecognition, setContinuousRecognition] = useState<any>(null);
  const [lastWakeWordTime, setLastWakeWordTime] = useState(0);
  const [isWakeWordProcessing, setIsWakeWordProcessing] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+V or Cmd+Shift+V for voice activation
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        if (!isListening && !isProcessing) {
          toggleListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, isProcessing]);

  useEffect(() => {
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      
      // Regular recognition for button clicks
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      // Continuous recognition for wake word detection
      const continuousRecognitionInstance = new SpeechRecognition();
      continuousRecognitionInstance.continuous = true;
      continuousRecognitionInstance.interimResults = true;
      continuousRecognitionInstance.lang = 'en-US';

      // Handle continuous recognition for wake word
      continuousRecognitionInstance.onresult = (event: any) => {
        // Prevent processing if already handling a wake word
        if (isWakeWordProcessing) {
          console.log('Already processing wake word, ignoring');
          return;
        }
        
        // Only process final results to prevent flickering
        const lastResultIndex = event.results.length - 1;
        const result = event.results[lastResultIndex];
        
        if (!result.isFinal) return; // Skip interim results
        
        const transcript = result[0].transcript.toLowerCase();
        console.log('Continuous listening (final):', transcript);

        // Check for deactivation command first
        if (
          transcript.includes('deactivate voice command') ||
          transcript.includes('deactivate voice') ||
          transcript.includes('stop listening')
        ) {
          console.log('Deactivation command detected!');
          try {
            continuousRecognitionInstance.stop();
          } catch (e) {
            // Already stopped
          }
          setIsContinuousMode(false);
          toast({
            title: '🔕 Voice Command Deactivated',
            description: 'Voice assistant is now off',
          });
          return;
        }

        // Enhanced debounce: prevent multiple triggers within 4 seconds
        const now = Date.now();
        if (now - lastWakeWordTime < 4000) {
          console.log('Wake word debounced');
          return;
        }

        // Wake words: "activate voice command", "ok assistant"
        if (
          transcript.includes('activate voice command') ||
          transcript.includes('ok assistant') ||
          transcript.includes('activate voice')
        ) {
          console.log('Wake word detected!');
          setLastWakeWordTime(now);
          setIsWakeWordProcessing(true);
          
          try {
            continuousRecognitionInstance.stop();
          } catch (e) {
            // Already stopped
          }
          
          // Start command recognition
          if (!isListening && !isProcessing) {
            recognitionInstance.start();
            setIsListening(true);
          }
          
          toast({
            title: '👂 Voice Command Activated',
            description: 'Listening for your command...',
          });
        }
      };

      continuousRecognitionInstance.onerror = (event: any) => {
        console.log('Continuous recognition error:', event.error);
        // Don't restart on common errors - prevents flickering
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        // Only stop on serious errors
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsContinuousMode(false);
        }
      };

      continuousRecognitionInstance.onend = () => {
        console.log('Continuous recognition ended, isContinuousMode:', isContinuousMode);
        // Restart continuous recognition if still in continuous mode and not processing
        if (isContinuousMode && !isWakeWordProcessing) {
          setTimeout(() => {
            try {
              console.log('Auto-restarting continuous recognition');
              continuousRecognitionInstance.start();
            } catch (e) {
              console.log('Could not restart continuous recognition:', e);
            }
          }, 300);
        }
      };

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log('Voice command:', transcript);
        
        // Show processing state
        setIsListening(false);
        setIsProcessing(true);
        
        // Single toast for processing
        toast({
          title: '🔍 Processing',
          description: `"${transcript}"`,
        });
        
        // Wait 7 seconds before executing command
        setTimeout(() => {
          handleVoiceCommand(transcript);
          setIsProcessing(false);
          setIsWakeWordProcessing(false);
          
          // Restart continuous recognition if it was active - with longer delay
          if (continuousRecognition && isContinuousMode) {
            setTimeout(() => {
              try {
                console.log('Restarting continuous recognition after command');
                continuousRecognition.start();
              } catch (e) {
                console.log('Continuous recognition restart error:', e);
              }
            }, 1000);
          }
        }, 7000);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsProcessing(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          toast({
            title: 'Voice Recognition Error',
            description: 'Could not recognize speech. Please try again.',
            variant: 'destructive',
          });
        }
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
      setContinuousRecognition(continuousRecognitionInstance);
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (continuousRecognition) {
        continuousRecognition.stop();
      }
    };
  }, []);

  // Auto-start continuous mode when recognition is ready
  useEffect(() => {
    if (continuousRecognition && !isContinuousMode) {
      const timer = setTimeout(() => {
        // Call toggleContinuousMode to start wake word detection
        if (continuousRecognition) {
          try {
            continuousRecognition.start();
            setIsContinuousMode(true);
            toast({
              title: '🎙️ Always Listening',
              description: 'Say "Activate Voice Command" or "OK Assistant" to use voice commands. Say "Deactivate Voice Command" to turn off.',
            });
          } catch (error) {
            console.error('Failed to start continuous mode:', error);
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [continuousRecognition]);

  const handleVoiceCommand = (command: string) => {
    const routes: Record<string, string> = {
      // Dashboard
      'dashboard': '/admin/dashboard',
      'open dashboard': '/admin/dashboard',
      'go to dashboard': '/admin/dashboard',

      // Vendor Management
      'vendor list': '/vendor/list',
      'vendors': '/vendor/list',
      'open vendor list': '/vendor/list',
      'add vendor': '/vendor/register',
      'new vendor': '/vendor/register',
      'register vendor': '/vendor/register',
      'vendor registration': '/vendor/register',
      'vendor credentials': '/vendor/credentials',

      // Employee Management
      'employee list': '/employee/list',
      'employees': '/employee/list',
      'open employee list': '/employee/list',
      'add employee': '/employee/register',
      'new employee': '/employee/register',
      'register employee': '/employee/register',
      'employee registration': '/employee/register',
      'employee credentials': '/employee/credentials',

      // Site Management
      'site list': '/vendor/sites',
      'sites': '/vendor/sites',
      'open site list': '/vendor/sites',
      'add site': '/vendor/site/register',
      'new site': '/vendor/site/register',
      'register site': '/vendor/site/register',
      'site registration': '/vendor/site/register',
      'site management': '/vendor/site/manage',
      'site status': '/vendor/sites/status',

      // Purchase Orders
      'purchase orders': '/vendor/po',
      'po generation': '/vendor/po',
      'generate po': '/vendor/po',
      'create po': '/vendor/po',
      'new purchase order': '/vendor/po',

      // Invoices
      'invoices': '/vendor/invoices',
      'invoice generation': '/vendor/invoices',
      'generate invoice': '/vendor/invoices',
      'create invoice': '/vendor/invoices',
      'new invoice': '/vendor/invoices',

      // Payment
      'payment master': '/vendor/payment-master',
      'payments': '/vendor/payment-master',
      'new payment': '/vendor/payment-master',

      // Allowances
      'allowances': '/employee/allowances',
      'allowance approval': '/admin/allowance-approval',
      'approve allowances': '/admin/allowance-approval',

      // Attendance
      'attendance': '/employee/attendance',
      'mark attendance': '/employee/attendance',
      'monthly attendance': '/employee/monthly-attendance',
      'bulk attendance': '/employee/monthly-attendance',

      // Salary
      'salary structure': '/employee/salary-structure',
      'employee salary': '/employee/salary',
      'salary report': '/employee/salary-report',

      // Masters
      'holiday master': '/admin/holiday-master',
      'holidays': '/admin/holiday-master',
      'department master': '/employee/department-master',
      'departments': '/employee/department-master',
      'designation master': '/employee/designation-master',
      'designations': '/employee/designation-master',
      'circle master': '/vendor/circle-master',
      'circles': '/vendor/circle-master',

      // Teams
      'teams': '/admin/teams',
      'team management': '/admin/teams',

      // Reports
      'reports': '/admin/reports',
      'reports dashboard': '/admin/reports',
      'approval history': '/admin/approval-history',
      'vendor po report': '/reports/vendor-po',
      'vendor invoice report': '/reports/vendor-invoice',
      'vendor site report': '/reports/vendor-site',

      // Settings
      'settings': '/admin/settings',
      'export headers': '/vendor/export-headers',
      'my profile': '/employee/my-profile',
      'change password': '/employee/change-password',

      // Excel Import
      'excel import': '/vendor/excel-import',
      'import excel': '/vendor/excel-import',
      'bulk upload': '/vendor/excel-import',
    };

    // Find matching route
    let matchedRoute: string | null = null;
    for (const [key, value] of Object.entries(routes)) {
      if (command.includes(key)) {
        matchedRoute = value;
        break;
      }
    }

    if (matchedRoute) {
      setLocation(matchedRoute);
      toast({
        title: '✅ Command Executed',
        description: `Navigating to ${command}`,
      });
    } else {
      toast({
        title: '❌ Command Not Recognized',
        description: `Could not find a match for "${command}". Try commands like "open vendor list", "add employee", "holiday master", etc.`,
        variant: 'destructive',
      });
    }
  };

  const toggleListening = () => {
    if (!recognition) {
      toast({
        title: 'Not Supported',
        description: 'Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.',
        variant: 'destructive',
      });
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      toast({
        title: '🎤 Listening...',
        description: 'Speak your command (e.g., "open vendor list", "add employee", "holiday master")',
      });
    }
  };

  const toggleContinuousMode = () => {
    if (!continuousRecognition) {
      toast({
        title: 'Not Supported',
        description: 'Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.',
        variant: 'destructive',
      });
      return;
    }

    if (isContinuousMode) {
      continuousRecognition.stop();
      setIsContinuousMode(false);
      toast({
        title: '🔕 Wake Word Deactivated',
        description: 'Voice assistant is now off',
      });
    } else {
      try {
        continuousRecognition.start();
        setIsContinuousMode(true);
        toast({
          title: '🔔 Wake Word Activated',
          description: 'Say "Activate Voice Command" or "OK Assistant" to start listening. Say "Deactivate Voice Command" to turn off.',
        });
      } catch (e) {
        toast({
          title: 'Error',
          description: 'Could not start continuous listening',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        onClick={toggleListening}
        variant={isListening || isProcessing ? 'default' : 'outline'}
        size="sm"
        className={`gap-2 ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : ''} ${isProcessing ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' : ''}`}
        title="Voice Command (Ctrl+Shift+V)"
        disabled={isProcessing}
      >
        {isListening ? (
          <>
            <MicOff className="h-4 w-4" />
            <span className="hidden sm:inline">Listening...</span>
          </>
        ) : isProcessing ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="hidden sm:inline">Searching...</span>
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Voice</span>
          </>
        )}
      </Button>
      
      <Button
        onClick={toggleContinuousMode}
        variant={isContinuousMode ? 'default' : 'outline'}
        size="sm"
        className={`gap-2 ${isContinuousMode ? 'bg-green-600 hover:bg-green-700' : ''}`}
        title={isContinuousMode ? 'Wake Word Active - Say "Hey Assistant"' : 'Enable Wake Word'}
        disabled={isProcessing || isListening}
      >
        {isContinuousMode ? (
          <>
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="hidden lg:inline text-xs">Always On</span>
          </>
        ) : (
          <>
            <div className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="hidden lg:inline text-xs">Wake Word</span>
          </>
        )}
      </Button>
    </div>
  );
}
