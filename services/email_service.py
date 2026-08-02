import smtplib
import os
import json
import urllib.request
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

# You can use ANY email provider to send these emails (Gmail, Yahoo, Outlook, AWS SES, etc)
# Or use Brevo API to bypass Render's SMTP block!
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")

def send_otp_email(to_email: str, code: str, purpose: str, candidate_name: str = "Candidate"):
    if not SMTP_USER and not BREVO_API_KEY:
        logger.warning("No Email Credentials configured. Skipping email send.")
        return False

    subject = f"{code} is your Sterling E-Mobility OTP"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #0f172a;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; border-top: 4px solid #dc2626;">
          <h2 style="color: #dc2626; margin-bottom: 5px; font-weight: 900; font-size: 22px; text-align: center; letter-spacing: 1px;">STERLING</h2>
          <p style="text-align: center; color: #64748b; font-size: 12px; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 2px; text-transform: uppercase;">E-MOBILITY</p>
          <p style="font-size: 16px;">Hello {candidate_name},</p>
          <p style="font-size: 16px; color: #475569;">Your one-time password for <strong>{purpose}</strong> is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e293b; background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            {code}
          </div>
          <p style="font-size: 14px; color: #64748b; text-align: center;">This code will expire in 10 minutes. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Sterling AI Interview Engine &copy; Sterling E-Mobility</p>
        </div>
      </body>
    </html>
    """

    # --- BREVO API (HTTPS) METHOD ---
    # Bypasses Render's Free Tier SMTP blocks
    if BREVO_API_KEY:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": BREVO_API_KEY,
                "content-type": "application/json"
            }
            data = {
                "sender": {"name": "Sterling E-Mobility OTP", "email": SMTP_USER},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_content
            }
            req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(req) as response:
                logger.info(f"Successfully sent OTP email via Brevo API to {to_email}")
                return True
        except Exception as e:
            logger.error(f"Failed to send email via Brevo API to {to_email}: {str(e)}")
            return False

    # --- STANDARD SMTP METHOD ---
    # Only works on paid Render tiers or local machines
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Sterling E-Mobility OTP <{SMTP_USER}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        logger.info(f"Successfully sent OTP email via SMTP to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email via SMTP to {to_email}: {str(e)}")
        return False

def send_invitation_email(to_email: str, candidate_name: str, token: str, role_name: str):
    if not SMTP_USER and not BREVO_API_KEY:
        logger.warning("No Email Credentials configured. Skipping invite email send.")
        return False

    # The actual frontend URL (Vercel)
    frontend_url = os.getenv("FRONTEND_URL", "https://ai-interview-portal.vercel.app")
    magic_link = f"{frontend_url}/verify-invitation?token={token}&action=confirm"

    subject = f"Invitation: Interview for {role_name} at Sterling E-Mobility"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #0f172a;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; border-top: 4px solid #dc2626;">
          <h2 style="color: #dc2626; margin-bottom: 5px; font-weight: 900; font-size: 22px; text-align: center; letter-spacing: 1px;">STERLING</h2>
          <p style="text-align: center; color: #64748b; font-size: 12px; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 2px; text-transform: uppercase;">E-MOBILITY</p>
          <p style="font-size: 16px;">Hello {candidate_name},</p>
          <p style="font-size: 16px; color: #475569;">You have been invited to interview for the <strong>{role_name}</strong> position.</p>
          <p style="font-size: 16px; color: #475569;">Click the button below to complete your registration and schedule your interview:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{magic_link}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Complete Registration</a>
          </div>
          <p style="font-size: 14px; color: #64748b; text-align: center;">This magic link will expire in 3 hours.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Sterling AI Interview Engine &copy; Sterling E-Mobility</p>
        </div>
      </body>
    </html>
    """

    if BREVO_API_KEY:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": BREVO_API_KEY,
                "content-type": "application/json"
            }
            data = {
                "sender": {"name": "Sterling E-Mobility Recruiting", "email": SMTP_USER},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_content
            }
            req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(req) as response:
                logger.info(f"Successfully sent Invite email via Brevo API to {to_email}")
                return True
        except Exception as e:
            logger.error(f"Failed to send Invite email via Brevo API to {to_email}: {str(e)}")
            return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Sterling E-Mobility Recruiting <{SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        logger.info(f"Successfully sent Invite email via SMTP to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send Invite email via SMTP to {to_email}: {str(e)}")
        return False

def send_registration_success_email(to_email: str, candidate_name: str):
    if not SMTP_USER and not BREVO_API_KEY:
        logger.warning("No Email Credentials configured. Skipping success email send.")
        return False

    subject = "Registration Successful: Sterling E-Mobility"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #0f172a;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; border-top: 4px solid #16a34a;">
          <h2 style="color: #16a34a; margin-bottom: 5px; font-weight: 900; font-size: 22px; text-align: center; letter-spacing: 1px;">STERLING</h2>
          <p style="text-align: center; color: #64748b; font-size: 12px; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 2px; text-transform: uppercase;">E-MOBILITY</p>
          <p style="font-size: 16px;">Hello {candidate_name},</p>
          <p style="font-size: 16px; color: #475569;">Your registration has been successfully verified.</p>
          <p style="font-size: 16px; color: #475569;">You can now log in to the candidate portal anytime using your registered email and the OTP system to access your dashboard, view schedules, and launch your AI Interview.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Sterling AI Interview Engine &copy; Sterling E-Mobility</p>
        </div>
      </body>
    </html>
    """

    if BREVO_API_KEY:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": BREVO_API_KEY,
                "content-type": "application/json"
            }
            data = {
                "sender": {"name": "Sterling E-Mobility", "email": SMTP_USER},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_content
            }
            req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(req) as response:
                logger.info(f"Successfully sent Success email via Brevo API to {to_email}")
                return True
        except Exception as e:
            logger.error(f"Failed to send Success email via Brevo API to {to_email}: {str(e)}")
            return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Sterling E-Mobility <{SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        logger.info(f"Successfully sent Success email via SMTP to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send Success email via SMTP to {to_email}: {str(e)}")
        return False
def send_notification_email(to_email: str, candidate_name: str, subject: str, html_body: str):
    """Reuses the existing email infrastructure to send any notification."""
    if not SMTP_USER and not BREVO_API_KEY:
        logger.warning("No Email Credentials configured. Skipping notification email send.")
        return False

    if BREVO_API_KEY:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": BREVO_API_KEY,
                "content-type": "application/json"
            }
            data = {
                "sender": {"name": "Sterling E-Mobility Interviews", "email": SMTP_USER},
                "to": [{"email": to_email, "name": candidate_name}],
                "subject": subject,
                "htmlContent": html_body
            }
            req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req):
                logger.info(f"Successfully sent notification email via Brevo API to {to_email}")
                return True
        except Exception as e:
            logger.error(f"Notification email failed via Brevo API: {e}")
            return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Sterling E-Mobility Interviews <{SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        logger.info(f"Successfully sent notification email via SMTP to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send notification email via SMTP to {to_email}: {str(e)}")
        return False
