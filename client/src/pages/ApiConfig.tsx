import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getStoredApiUrl, setApiBaseUrl } from '@/lib/api';

export default function ApiConfig() {
  const [apiUrl, setApiUrl] = useState(getStoredApiUrl() || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!apiUrl.trim()) {
      toast({ title: 'Error', description: 'API URL cannot be empty', variant: 'destructive' });
      return;
    }

    let finalUrl = apiUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      setLoading(true);
      
      // Remove trailing slash if present
      finalUrl = finalUrl.replace(/\/$/, '');
      
      // Test the API connection with a simple OPTIONS request first
      const testEndpoint = `${finalUrl}/api/vendors?pageSize=1`;
      
      const testResponse = await fetch(testEndpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
      });

      if (!testResponse.ok && testResponse.status !== 304) {
        throw new Error(`API responded with status ${testResponse.status}`);
      }

      toast({ title: 'Success', description: 'API connection verified!' });
      setApiBaseUrl(finalUrl);
    } catch (error: any) {
      // If test fails, still allow saving but warn user
      const proceed = window.confirm(
        `Connection test failed (${error.message}). Do you want to save this URL anyway?\n\nYou can test manually and fix it later.`
      );
      
      if (proceed) {
        let finalUrl = apiUrl.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = 'https://' + finalUrl;
        }
        finalUrl = finalUrl.replace(/\/$/, '');
        setApiBaseUrl(finalUrl);
      } else {
        toast({
          title: 'Error',
          description: `Failed to connect to API: ${error.message}. Please verify your Replit URL.`,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configure Backend API</CardTitle>
          <CardDescription>Set your Replit backend URL to connect your app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Backend API URL</label>
            <Input
              type="text"
              placeholder="https://your-app.replit.dev"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter your Replit backend URL (e.g., https://my-ems.replit.dev)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
            <p className="text-sm font-medium text-blue-900">How to get your Replit URL:</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to your Replit project</li>
              <li>Click "Publish" button</li>
              <li>Wait for deployment to complete</li>
              <li>Copy the public URL provided</li>
              <li>Paste it above and click "Save"</li>
            </ol>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={loading || !apiUrl.trim()}
            className="w-full"
          >
            {loading ? 'Testing Connection...' : 'Save & Test Connection'}
          </Button>

          {getStoredApiUrl() && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded text-center">
              ✓ Connected to: {getStoredApiUrl()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
