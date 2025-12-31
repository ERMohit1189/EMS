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
  const [currentCommand, setCurrentCommand] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<string>('');
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

        // Handle permission-related errors
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'permission-denied') {
          setIsContinuousMode(false);
          const errorMsg = getErrorMessage(event.error);
          toast({
            title: errorMsg.title,
            description: errorMsg.description,
            variant: 'destructive',
          });
          return;
        }

        // Don't restart on common errors - prevents flickering
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
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

        // Show processing state (button will show loading animation)
        setIsListening(false);
        setCurrentCommand(transcript);
        setIsProcessing(true);

        // Wait 7 seconds before executing command - NO intermediate toast
        setTimeout(() => {
          handleVoiceCommand(transcript);
          setIsProcessing(false);
          setIsWakeWordProcessing(false);
          setCurrentCommand('');
          setCurrentPage('');

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

        // Skip showing errors for common non-critical cases
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }

        // Get and display specific error message
        const errorMsg = getErrorMessage(event.error);
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        });
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

  const getErrorMessage = (errorCode: string): { title: string; description: string } => {
    const errorMessages: Record<string, { title: string; description: string }> = {
      'not-allowed': {
        title: '🎤 Microphone Permission Denied',
        description: 'You denied microphone access. To enable voice commands:\n\n📍 Chrome/Edge: Click the lock 🔒 icon → Site settings → Allow Microphone\n📍 Firefox: Click the lock 🔒 icon → Permissions → Allow Microphone\n📍 Safari: System Preferences → Security & Privacy → Microphone\n\nThen refresh this page and try again.',
      },
      'service-not-allowed': {
        title: '🎤 Microphone Access Blocked',
        description: 'Microphone is blocked at the system level. To fix:\n\n📍 Windows: Settings → Privacy → Microphone → Turn ON\n📍 Mac: System Preferences → Security & Privacy → Microphone\n📍 Linux: Check your audio settings\n\nAfter enabling, refresh this page and try again.',
      },
      'permission-denied': {
        title: '🎤 Permission Required',
        description: 'This website needs microphone access to use voice commands. When you click the microphone button, your browser will ask for permission.\n\n1️⃣ Look for the permission prompt from your browser\n2️⃣ Click "Allow" when asked\n3️⃣ Try the voice command again',
      },
      'no-microphone': {
        title: '🎤 No Microphone Found',
        description: 'Your device does not have a microphone or it is not connected.\n\n✓ Connect a USB microphone or headset with mic\n✓ For laptops: Check if built-in mic is enabled in device settings\n✓ Refresh this page after connecting\n\nThen try the voice command again.',
      },
      'no-speech': {
        title: '🔇 No Speech Detected',
        description: 'Microphone is working but no speech was detected.\n\n✓ Make sure your microphone is not muted\n✓ Speak clearly and louder\n✓ Check if another app is using the microphone\n\nTry again after solving the issue.',
      },
      'audio-capture': {
        title: '🎤 Audio Capture Failed',
        description: 'Could not capture audio from your microphone.\n\n✓ Check if another app is using the microphone\n✓ Restart your browser\n✓ Make sure microphone is not disabled in system settings\n✓ Try a different microphone if available\n\nThen try the voice command again.',
      },
      'network-error': {
        title: '🌐 Network Error',
        description: 'Voice recognition requires internet connection.\n\n✓ Check your internet connection\n✓ Try connecting to a stable Wi-Fi network\n✓ Wait a moment if the network is slow\n\nThen try the voice command again.',
      },
      'aborted': {
        title: '⏹️ Voice Command Cancelled',
        description: 'Voice command was cancelled or interrupted.\n\nSay "Activate Voice Command" or "OK Assistant" to start listening again.',
      },
      'service-unavailable': {
        title: '⚠️ Voice Service Unavailable',
        description: 'Speech recognition service is temporarily unavailable.\n\n✓ Check your internet connection\n✓ Wait a moment\n✓ Try refreshing the page\n\nThen try the voice command again.',
      },
      'bad-grammar': {
        title: '⚠️ Invalid Command',
        description: 'Could not understand the command. Try saying:\n\n✓ "Open vendor list"\n✓ "Dashboard"\n✓ "Show employees"\n✓ "Generate invoice"\n\nSpeak clearly and wait for the beep.',
      },
      'default': {
        title: '❌ Voice Recognition Error',
        description: 'An unexpected error occurred.\n\n✓ Check if your microphone is working\n✓ Verify microphone has permission\n✓ Try refreshing the page\n✓ Check your internet connection\n\nThen try the voice command again.',
      },
    };

    return errorMessages[errorCode] || errorMessages['default'];
  };

  const handleVoiceCommand = (command: string) => {
    // Detect user type from localStorage for context-aware routing
    const isVendor = typeof window !== 'undefined' && localStorage.getItem('vendorId') !== null;
    const isEmployee = typeof window !== 'undefined' && localStorage.getItem('employeeId') !== null;

    // Build context-aware routes
    const routes: Record<string, string> = {
      // Admin Dashboard
      'admin dashboard': '/admin/dashboard',
      'dashboard': isVendor ? '/vendor/dashboard' : isEmployee ? '/employee/dashboard' : '/',
      'open dashboard': isVendor ? '/vendor/dashboard' : isEmployee ? '/employee/dashboard' : '/',
      'go to dashboard': isVendor ? '/vendor/dashboard' : isEmployee ? '/employee/dashboard' : '/',

      // Vendor Dashboard
      'vendor dashboard': '/vendor/dashboard',

      // Employee Dashboard/Profile
      'employee dashboard': '/employee/dashboard',

      // My Profile & Settings (All User Types - Context Aware)
      'my profile': isVendor ? '/vendor/profile' : '/employee/my-profile',
      'profile': isVendor ? '/vendor/profile' : '/employee/my-profile',
      'vendor profile': '/vendor/profile',
      'change password': isVendor ? '/vendor/change-password' : '/employee/change-password',
      'vendor change password': '/vendor/change-password',

      // Vendor Management
      'vendor list': '/vendor/list',
      'vendors': '/vendor/list',
      'open vendor list': '/vendor/list',
      'all vendors': '/vendor/list',
      'add vendor': '/vendor/register',
      'new vendor': '/vendor/register',
      'register vendor': '/vendor/register',
      'vendor registration': '/vendor/register',
      'vendor credentials': '/vendor/credentials',
      'vendor rates': '/vendor/rates',

      // Employee Management
      'employee list': '/employee/list',
      'employees': '/employee/list',
      'open employee list': '/employee/list',
      'all employees': '/employee/list',
      'add employee': '/employee/register',
      'new employee': '/employee/register',
      'register employee': '/employee/register',
      'employee registration': '/employee/register',
      'employee credentials': '/employee/credentials',

      // Site Management
      'site list': '/vendor/sites',
      'sites': '/vendor/sites',
      'open site list': '/vendor/sites',
      'all sites': '/vendor/sites',
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
      'po report': '/reports/vendor-po',
      'vendor po report': '/reports/vendor-po',

      // Invoices
      'invoices': '/vendor/invoices',
      'invoice generation': '/vendor/invoices',
      'generate invoice': '/vendor/invoices',
      'create invoice': '/vendor/invoices',
      'new invoice': '/vendor/invoices',
      'invoice report': '/reports/vendor-invoice',
      'vendor invoice report': '/reports/vendor-invoice',

      // Payment
      'payment master': '/vendor/payment-master',
      'payments': '/vendor/payment-master',
      'new payment': '/vendor/payment-master',

      // Reports (All Types)
      'vendor site report': '/reports/vendor-site',
      'site report': '/reports/vendor-site',
      'reports': '/admin/reports',
      'reports dashboard': '/admin/reports',

      // Attendance & Leave (Employee)
      'attendance': '/employee/attendance',
      'mark attendance': '/employee/attendance',
      'apply leave': '/employee/leave-apply',
      'leave apply': '/employee/leave-apply',
      'request leave': '/employee/leave-apply',
      'my leave history': '/employee/leave-history',
      'leave history': '/employee/leave-history',
      'monthly attendance': '/employee/monthly-attendance',
      'my monthly attendance': '/employee/monthly-attendance',
      'bulk attendance': '/admin/bulk-attendance',
      'attendance report': '/admin/attendance-report',

      // Approvals
      'leave approvals': '/employee/leave-approvals',
      'approve leaves': '/employee/leave-approvals',
      'allowance approvals': '/admin/allowance-approvals',
      'allowance approval': '/admin/allowance-approvals',
      'approve allowances': '/admin/allowance-approvals',
      'approval history': '/admin/approval-history',

      // Allowances
      'allowances': '/employee/allowances',
      'my allowances': '/employee/allowances',

      // Salary & Payroll
      'salary structure': '/employee/salary-structure',
      'my salary structure': '/employee/salary-structure',
      'employee salary': '/employee/salary',
      'salary report': '/employee/salary-report',
      'employee salary report': '/employee/salary-report',
      'my salary report': '/employee/salary-report',
      'salary history': '/employee/salary-history',
      'my salary history': '/employee/salary-history',
      'generate salaries': '/admin/salary-generation',
      'salary generation': '/admin/salary-generation',
      'month wise salary report': '/admin/salary-reports',
      'salary reports': '/admin/salary-reports',

      // Masters
      'holiday master': '/admin/holiday-master',
      'holidays': '/admin/holiday-master',
      'leave allotment': '/admin/leave-allotment',
      'department master': '/employee/department-master',
      'departments': '/employee/department-master',
      'designation master': '/employee/designation-master',
      'designations': '/employee/designation-master',
      'circle master': '/vendor/circle-master',
      'circles': '/vendor/circle-master',

      // Teams
      'teams': '/admin/teams',
      'team management': '/admin/teams',

      // Settings & Configuration
      'settings': '/settings',
      'app settings': '/settings',
      'export headers': '/vendor/export-headers',
      'export settings': '/export-settings',
      'email settings': '/admin/email-settings',

      // Excel Import
      'excel import': '/vendor/excel-import',
      'import excel': '/vendor/excel-import',
      'bulk upload': '/vendor/excel-import',

      // Help & Docs
      'help center': '/help',
      'help': '/help',
    };

    // Find matching route - match longer keys first to avoid partial matches
    let matchedRoute: string | null = null;
    let matchedKey: string | null = null;

    const sortedEntries = Object.entries(routes).sort((a, b) => b[0].length - a[0].length);

    for (const [key, value] of sortedEntries) {
      if (command.includes(key)) {
        matchedRoute = value;
        matchedKey = key;
        break;
      }
    }

    if (matchedRoute) {
      // Extract page name from route for display
      const pageName = matchedKey
        ? matchedKey.charAt(0).toUpperCase() + matchedKey.slice(1)
        : command;

      setCurrentPage(pageName);
      setLocation(matchedRoute);

      toast({
        title: '✅ Command Executed',
        description: `Opening ${pageName}...`,
      });
    } else {
      toast({
        title: '❌ Command Not Recognized',
        description: `Could not find "${command}". Try: "dashboard", "vendor list", "my profile", "salary report", etc.`,
        variant: 'destructive',
      });
      setCurrentPage('Not found');
    }
  };

  const toggleListening = () => {
    if (!recognition) {
      toast({
        title: '❌ Not Supported',
        description: 'Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.',
        variant: 'destructive',
      });
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
        toast({
          title: '🎤 Listening...',
          description: 'Speak your command (e.g., "open vendor list", "add employee", "holiday master")',
        });
      } catch (error: any) {
        // Handle permission errors when starting recognition
        if (error.message?.includes('permission') || error.name === 'NotAllowedError') {
          const errorMsg = getErrorMessage('not-allowed');
          toast({
            title: errorMsg.title,
            description: errorMsg.description,
            variant: 'destructive',
          });
        } else {
          const errorMsg = getErrorMessage('default');
          toast({
            title: errorMsg.title,
            description: errorMsg.description,
            variant: 'destructive',
          });
        }
      }
    }
  };

  const toggleContinuousMode = () => {
    if (!continuousRecognition) {
      toast({
        title: '❌ Not Supported',
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
      } catch (error: any) {
        // Handle permission errors when starting continuous recognition
        if (error.message?.includes('permission') || error.name === 'NotAllowedError') {
          const errorMsg = getErrorMessage('not-allowed');
          toast({
            title: errorMsg.title,
            description: errorMsg.description,
            variant: 'destructive',
          });
        } else if (error.name === 'NotFoundError') {
          const errorMsg = getErrorMessage('no-microphone');
          toast({
            title: errorMsg.title,
            description: errorMsg.description,
            variant: 'destructive',
          });
        } else {
          const errorMsg = getErrorMessage('default');
          toast({
            title: errorMsg.title,
            description: errorMsg.description,
            variant: 'destructive',
          });
        }
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
