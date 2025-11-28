import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';
  const code = searchParams.get('code');

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    } else {
      // TODO remove this debugging later
      console.error('VerifyOtp Error:', error.message);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          request.url
        )
      );
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    } else {
      // TODO remove this debug as well
      console.error('ExchangeCode Error:', error.message);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          request.url
        )
      );
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=Invalid%20Link%20Parameters', request.url)
  );
}
