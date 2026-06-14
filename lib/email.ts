import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(to: string, otp: string) {
  const info = await transporter.sendMail({
    from: `"IPPIS Admin" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your Admin OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center;">
        <h2>Admin Login Verification</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing: 5px;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
      </div>
    `,
  });
  return info;
}
