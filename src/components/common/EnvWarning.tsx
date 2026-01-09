import React from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';
import { Link } from '@mui/material';

const EnvWarning: React.FC = () => {
  const hasEnvVars = 
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (hasEnvVars) {
    return null;
  }

  return (
    <Alert severity="error" sx={{ m: 2 }}>
      <AlertTitle>Missing Environment Variables</AlertTitle>
      Please create a <strong>.env</strong> file in the project root with:
      <Box component="pre" sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1, fontSize: '0.875rem' }}>
{`VITE_SUPABASE_URL=https://shejpknspmrlgbjhhptx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzA1NDksImV4cCI6MjA4MjUwNjU0OX0.NbZdrQrZjhVd4CKk1T25TgVEDYWIslw-yWjMKveOvCo`}
      </Box>
      Then restart the dev server.
    </Alert>
  );
};

export default EnvWarning;


