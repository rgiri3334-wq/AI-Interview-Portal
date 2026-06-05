import smtplib
import os
import json
import urllib.request
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

# You can use ANY email provider to send these emails (Gmail, Yahoo, Outlook, AWS SES, etc)
# Or use Resend API to bypass Render's SMTP block!
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

def send_otp_email(to_email: str, code: str, purpose: str, candidate_name: str = "Candidate"):
    if not SMTP_USER and not RESEND_API_KEY:
        logger.warning("No Email Credentials configured. Skipping email send.")
        return False

    subject = f"{code} is your Spark-Hire OTP"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #0f172a;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          <h2 style="color: #ef4444; margin-bottom: 20px; font-weight: 800; font-size: 24px; text-align: center;">Spark-<span style="color: #0f172a;">Hire</span></h2>
          <p style="font-size: 16px;">Hello {candidate_name},</p>
          <p style="font-size: 16px; color: #475569;">Your one-time password for <strong>{purpose}</strong> is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e293b; background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            {code}
          </div>
          <p style="font-size: 14px; color: #64748b; text-align: center;">This code will expire in 10 minutes. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Spark-Hire AI Interview Engine &copy; Sterling E-Mobility</p>
        </div>
      </body>
    </html>
    """

    # --- RESEND API (HTTPS) METHOD ---
    # Bypasses Render's Free Tier SMTP blocks
    if RESEND_API_KEY:
        try:
            url = "https://api.resend.com/emails"
            headers = {
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            }
            data = {
                # Resend requires testing emails to come from onboarding@resend.dev unless a domain is verified
                "from": "Spark-Hire OTP <onboarding@resend.dev>",
                "to": [to_email],
                "subject": subject,
                "html": html_content
            }
            req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(req) as response:
                logger.info(f"Successfully sent OTP email via Resend API to {to_email}")
                return True
        except Exception as e:
            logger.error(f"Failed to send email via Resend API to {to_email}: {str(e)}")
            return False

    # --- STANDARD SMTP METHOD ---
    # Only works on paid Render tiers or local machines
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Spark-Hire OTP <{SMTP_USER}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        logger.info(f"Successfully sent OTP email via SMTP to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email via SMTP to {to_email}: {str(e)}")
        return False
