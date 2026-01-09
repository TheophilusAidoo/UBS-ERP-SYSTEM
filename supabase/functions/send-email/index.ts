// ABSOLUTE SIMPLEST - GUARANTEED TO RETURN 200

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function ok(data: any) {
  try {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response('{"success":false,"error":"Response error"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
}

serve(async (req) => {
  try {
    // OPTIONS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: CORS, status: 200 });
    }

    // GET
    if (req.method === 'GET') {
      return ok({ success: true, message: 'OK' });
    }

    // POST
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        
        if (!body.to || !body.subject || !body.html) {
          return ok({ success: false, error: 'Missing fields' });
        }

        const supabase = createClient(
          'https://shejpknspmrlgbjhhptx.supabase.co',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        );

        const { data: settings } = await supabase
          .from('global_settings')
          .select('key, value')
          .in('key', ['email_from', 'email_smtp_host', 'email_smtp_port', 'email_smtp_user', 'email_smtp_password', 'email_smtp_secure']);

        const map: any = {};
        settings?.forEach((s: any) => {
          if (s.key && s.value) map[s.key] = s.value;
        });

        if (!map.email_from || !map.email_smtp_host || !map.email_smtp_user || !map.email_smtp_password) {
          return ok({ success: false, error: 'SMTP not configured' });
        }

        const { SMTPClient } = await import('https://deno.land/x/smtp@v0.7.0/mod.ts');
        
        const client = new SMTPClient({
          connection: {
            hostname: map.email_smtp_host,
            port: parseInt(map.email_smtp_port || '587'),
            tls: map.email_smtp_secure === 'true',
            auth: {
              username: map.email_smtp_user,
              password: map.email_smtp_password,
            },
          },
        });

        await client.send({
          from: map.email_from,
          to: body.to,
          subject: body.subject,
          html: body.html,
        });

        await client.close();

        return ok({ success: true, message: 'Email sent' });
      } catch (err: any) {
        return ok({ success: false, error: err?.message || 'Error' });
      }
    }

    return ok({ success: false, error: 'Method not allowed' });
  } catch (err: any) {
    return ok({ success: false, error: err?.message || 'Unknown error' });
  }
});
