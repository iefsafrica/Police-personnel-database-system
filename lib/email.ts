import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(to: string, otp: string) {
  console.log(`[OTP Email] Attempting to send OTP to: ${to}`);

  const { data, error } = await resend.emails.send({
    from: 'IPPIS Admin <onboarding@resend.dev>',
    to,
    subject: 'Your Admin OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center;">
        <h2>Admin Login Verification</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing: 5px;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
      </div>
    `,
  });

  if (error) {
    console.error(`[OTP Email] Failed to send OTP to ${to}:`, error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }

  console.log(`[OTP Email] OTP sent successfully to ${to}. Message ID: ${data?.id}`);
  return data;
}
