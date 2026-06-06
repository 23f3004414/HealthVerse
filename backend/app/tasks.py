import logging
import os
import time

logger = logging.getLogger(__name__)

# Save logs to scratch space or workspace
EMAIL_LOGS_DIR = os.getenv("EMAIL_LOGS_DIR", "email_logs")

def send_confirmation_email(patient_email: str, patient_name: str, doctor_name: str, date_str: str, time_str: str):
    logger.info(f"Background task starting: Sending confirmation email to {patient_email}...")
    # Simulate slight network delay for email sending
    time.sleep(1.0)
    
    os.makedirs(EMAIL_LOGS_DIR, exist_ok=True)
    
    email_content = f"""
============================================================
To: {patient_email}
Subject: Appointment Booking Confirmed - HealthVerse
Date: {datetime_now_str()}
------------------------------------------------------------
Dear {patient_name},

Your appointment with {doctor_name} has been successfully booked.

Details:
- Date: {date_str}
- Time: {time_str}

If you need to make changes, please manage your booking on the HealthVerse portal.

Best regards,
The HealthVerse Team
============================================================
"""
    
    # Write to log file
    safe_email = "".join([c if c.isalnum() else "_" for c in patient_email])
    filename = f"email_{safe_email}_{int(time.time())}.log"
    filepath = os.path.join(EMAIL_LOGS_DIR, filename)
    try:
        with open(filepath, "w") as f:
            f.write(email_content)
        logger.info(f"Email confirmation simulation complete. Log written to: {filepath}")
    except Exception as e:
        logger.error(f"Failed to log email simulation: {e}")

def datetime_now_str():
    from datetime import datetime
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
