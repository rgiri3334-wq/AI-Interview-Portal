"""
Scheduling API Routes — Appended to Main.py
Run this script to inject scheduling endpoints.
"""

SCHEDULING_ROUTES = '''
# ════════════════════════════════════════════════════════════════════════════
# ── SCHEDULING MODULE (Phase 1 — Candidate Portal Upgrade) ──────────────
# ════════════════════════════════════════════════════════════════════════════

from services.email_service import send_otp_email

def send_notification_email(to_email: str, candidate_name: str, subject: str, html_body: str):
    """Reuses the existing email infrastructure to send any notification."""
    import json, urllib.request, os
    BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
    SMTP_USER = os.getenv("SMTP_USER", "")
    if not SMTP_USER and not BREVO_API_KEY:
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
                "sender": {"name": "Spark-Hire by Sterling", "email": SMTP_USER},
                "to": [{"email": to_email, "name": candidate_name}],
                "subject": subject,
                "htmlContent": html_body
            }
            req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req):
                return True
        except Exception as e:
            logger.error(f"Notification email failed: {e}")
            return False
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_PASS = os.getenv("SMTP_PASS", "")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Spark-Hire <{SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Notification SMTP failed: {e}")
        return False


# ── Slot Models (Pydantic) ────────────────────────────────────────────────

class SlotCreateRequest(BaseModel):
    date: str           # "2026-06-20"
    start_time: str     # "09:00"
    end_time: str       # "09:45"
    timezone: str = "Asia/Kolkata"
    max_bookings: int = 1

class BookSlotRequest(BaseModel):
    slot_id: str
    candidate_id: str

class RescheduleRequest(BaseModel):
    new_slot_id: str


# ── Admin: Create Slots ───────────────────────────────────────────────────

@app.post("/api/admin/slots", tags=["Scheduling"])
async def create_slot(data: SlotCreateRequest, db: Session = Depends(get_db)):
    """Admin creates an available interview slot."""
    slot_id = generate_enterprise_id(db, "SLT")
    slot = InterviewSlot(
        slot_id=slot_id,
        date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
        timezone=data.timezone,
        max_bookings=data.max_bookings,
        is_active=True,
    )
    db.add(slot)
    db.commit()
    return {"slot_id": slot_id, "status": "created"}

@app.get("/api/admin/slots", tags=["Scheduling"])
async def get_all_slots(db: Session = Depends(get_db)):
    """Admin: get all slots with booking counts."""
    slots = db.query(InterviewSlot).filter_by(is_active=True).order_by(InterviewSlot.date, InterviewSlot.start_time).all()
    result = []
    for s in slots:
        booked = len([b for b in s.bookings if b.status == "BOOKED"])
        result.append({
            "slot_id": s.slot_id,
            "date": s.date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "timezone": s.timezone,
            "max_bookings": s.max_bookings,
            "booked_count": booked,
            "available": s.max_bookings - booked,
            "is_full": booked >= s.max_bookings,
            "bookings": [
                {"candidate_id": b.candidate_id, "status": b.status, "booked_at": b.booked_at}
                for b in s.bookings
            ]
        })
    return result

@app.delete("/api/admin/slots/{slot_id}", tags=["Scheduling"])
async def delete_slot(slot_id: str, db: Session = Depends(get_db)):
    """Admin deactivates a slot."""
    slot = db.query(InterviewSlot).filter_by(slot_id=slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot.is_active = False
    db.commit()
    return {"status": "deactivated"}


# ── Candidate: View & Book Slots ─────────────────────────────────────────

@app.get("/api/slots/available", tags=["Scheduling"])
async def get_available_slots(db: Session = Depends(get_db)):
    """Candidate: list all available (not full) future slots."""
    from datetime import date as dt_date
    today = dt_date.today().isoformat()
    slots = db.query(InterviewSlot).filter(
        InterviewSlot.is_active == True,
        InterviewSlot.date >= today
    ).order_by(InterviewSlot.date, InterviewSlot.start_time).all()

    result = []
    for s in slots:
        booked = len([b for b in s.bookings if b.status == "BOOKED"])
        if booked < s.max_bookings:
            result.append({
                "slot_id": s.slot_id,
                "date": s.date,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "timezone": s.timezone,
                "available": s.max_bookings - booked,
            })
    return result

@app.post("/api/slots/book", tags=["Scheduling"])
async def book_slot(data: BookSlotRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Candidate books an interview slot."""
    slot = db.query(InterviewSlot).filter_by(slot_id=data.slot_id, is_active=True).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found or no longer available")

    booked_count = len([b for b in slot.bookings if b.status == "BOOKED"])
    if booked_count >= slot.max_bookings:
        raise HTTPException(status_code=409, detail="This slot is already full. Please choose another.")

    # Check if candidate already has an active booking
    existing = db.query(SlotBooking).filter_by(candidate_id=data.candidate_id, status="BOOKED").first()
    if existing:
        raise HTTPException(status_code=409, detail="You already have a scheduled interview. Please cancel it first to reschedule.")

    candidate = db.query(Candidate).filter_by(candidate_id=data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    booking_id = generate_enterprise_id(db, "BKG")
    booking = SlotBooking(
        booking_id=booking_id,
        slot_id=data.slot_id,
        candidate_id=data.candidate_id,
        status="BOOKED"
    )
    db.add(booking)
    db.commit()

    # Send confirmation email in background
    def send_booking_confirmation():
        html = f"""
        <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px;color:#0f172a;">
        <div style="max-width:500px;margin:0 auto;background:#fff;padding:30px;border-radius:12px;border:1px solid #e2e8f0;border-top:4px solid #dc2626;">
          <h2 style="color:#dc2626;font-weight:900;text-align:center;letter-spacing:1px;">SPARK-HIRE</h2>
          <p style="text-align:center;color:#64748b;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;">Interview Confirmed</p>
          <p>Hello <strong>{candidate.name}</strong>,</p>
          <p>Your interview has been scheduled successfully! 🎉</p>
          <div style="background:#f1f5f9;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
            <p style="font-size:18px;font-weight:bold;color:#1e293b;margin:0;">📅 {slot.date}</p>
            <p style="font-size:24px;font-weight:900;color:#dc2626;margin:8px 0;">{slot.start_time} — {slot.end_time}</p>
            <p style="font-size:12px;color:#64748b;margin:0;">{slot.timezone}</p>
          </div>
          <p style="color:#475569;">Please ensure your camera, microphone, and internet connection are ready before joining.</p>
          <p style="color:#475569;">You will receive a reminder 24 hours and 1 hour before your interview.</p>
          <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:30px;">Need to reschedule? Log in to your Spark-Hire portal and visit "My Interview".</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
          <p style="font-size:12px;color:#94a3b8;text-align:center;">Sterling AI Interview Engine © Sterling E-Mobility</p>
        </div></body></html>
        """
        send_notification_email(candidate.email, candidate.name, f"✅ Interview Confirmed — {slot.date} at {slot.start_time}", html)

    background_tasks.add_task(send_booking_confirmation)

    return {
        "booking_id": booking_id,
        "slot": {"date": slot.date, "start_time": slot.start_time, "end_time": slot.end_time, "timezone": slot.timezone},
        "status": "BOOKED",
        "message": "Interview scheduled! Check your email for confirmation."
    }

@app.get("/api/candidates/{candidate_id}/booking", tags=["Scheduling"])
async def get_candidate_booking(candidate_id: str, db: Session = Depends(get_db)):
    """Get the candidate's current active booking, if any."""
    booking = db.query(SlotBooking).filter_by(candidate_id=candidate_id, status="BOOKED").first()
    if not booking:
        return {"booking": None}
    slot = booking.slot
    return {
        "booking": {
            "booking_id": booking.booking_id,
            "status": booking.status,
            "booked_at": booking.booked_at,
            "slot": {
                "date": slot.date,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "timezone": slot.timezone
            }
        }
    }

@app.patch("/api/bookings/{booking_id}/cancel", tags=["Scheduling"])
async def cancel_booking(booking_id: str, db: Session = Depends(get_db)):
    """Candidate cancels their booking to reschedule."""
    booking = db.query(SlotBooking).filter_by(booking_id=booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "BOOKED":
        raise HTTPException(status_code=409, detail="Booking is not in BOOKED state")
    booking.status = "CANCELLED"
    db.commit()
    return {"status": "cancelled"}

@app.patch("/api/bookings/{booking_id}/noshow", tags=["Scheduling"])
async def mark_no_show(booking_id: str, db: Session = Depends(get_db)):
    """System/admin marks a candidate as no-show if they missed their slot."""
    booking = db.query(SlotBooking).filter_by(booking_id=booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = "NO_SHOW"
    db.commit()

    # Notify candidate
    candidate = db.query(Candidate).filter_by(candidate_id=booking.candidate_id).first()
    if candidate:
        slot = booking.slot
        html = f"""
        <html><body style="font-family:Arial,sans-serif;padding:20px;color:#0f172a;">
        <div style="max-width:500px;margin:0 auto;background:#fff;padding:30px;border-radius:12px;border:1px solid #e2e8f0;border-top:4px solid #f59e0b;">
          <h2 style="color:#f59e0b;font-weight:900;text-align:center;">Interview Missed</h2>
          <p>Hello <strong>{candidate.name}</strong>,</p>
          <p>We noticed you missed your scheduled interview on <strong>{slot.date} at {slot.start_time}</strong>.</p>
          <p>No worries! Please log back into Spark-Hire to pick a new interview slot.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
          <p style="font-size:12px;color:#94a3b8;text-align:center;">Sterling AI Interview Engine © Sterling E-Mobility</p>
        </div></body></html>
        """
        send_notification_email(candidate.email, candidate.name, "⚠️ You missed your Spark-Hire interview — reschedule now", html)

    return {"status": "no_show_marked"}


# ── Candidate Portal: Profile & Status ─────────────────────────────────────

@app.get("/api/candidates/{candidate_id}/portal", tags=["Candidate Portal"])
async def get_candidate_portal(candidate_id: str, db: Session = Depends(get_db)):
    """Full candidate portal data: profile, booking, latest interview status."""
    candidate = db.query(Candidate).filter_by(candidate_id=candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    interviews = sorted(candidate.interviews, key=lambda i: i.started_at, reverse=True)
    latest = interviews[0] if interviews else None

    report = db.query(FinalReport).filter_by(interview_id=latest.interview_id).first() if latest else None
    hiring_decision = getattr(report, "hiring_decision", "PENDING") if report else "PENDING"
    is_completed = bool(latest and (latest.completed_at or (latest.overall_score or 0) > 0))

    # Score tier (for candidate display — no exact score shown)
    global_score = float(latest.overall_score or 0) if latest else 0.0
    if global_score >= 85:
        score_tier = "Exceptional"
    elif global_score >= 70:
        score_tier = "Strong"
    elif global_score >= 55:
        score_tier = "Good"
    elif global_score > 0:
        score_tier = "Needs Development"
    else:
        score_tier = None

    # Booking
    booking = db.query(SlotBooking).filter_by(candidate_id=candidate_id, status="BOOKED").first()
    booking_data = None
    if booking:
        slot = booking.slot
        booking_data = {
            "booking_id": booking.booking_id,
            "date": slot.date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "timezone": slot.timezone,
        }

    # Application status pipeline
    if is_completed and hiring_decision not in ("PENDING", "UNDER_REVIEW", "IN_PROGRESS"):
        app_stage = "DECISION_MADE"
    elif is_completed:
        app_stage = "UNDER_REVIEW"
    elif latest:
        app_stage = "INTERVIEW_SCHEDULED" if booking_data else "INTERVIEW_PENDING"
    elif candidate.interviews:
        app_stage = "APPLIED"
    else:
        app_stage = "REGISTERED"

    # Resume
    resume = db.query(Resume).filter_by(candidate_id=candidate_id).order_by(Resume.resume_id.desc()).first()

    # Attempt history (limited info for candidate)
    attempts = []
    for idx, iv in enumerate(interviews[:5]):
        iv_report = db.query(FinalReport).filter_by(interview_id=iv.interview_id).first()
        iv_score = float(iv.overall_score or 0)
        if iv_score >= 85: tier = "Exceptional"
        elif iv_score >= 70: tier = "Strong"
        elif iv_score >= 55: tier = "Good"
        elif iv_score > 0: tier = "Needs Development"
        else: tier = None
        attempts.append({
            "attempt_number": idx + 1,
            "date": iv.started_at[:10] if iv.started_at else None,
            "score_tier": tier,
            "is_completed": bool(iv.completed_at or iv_score > 0),
            "job_role": iv.role.role_name if iv.role else None,
        })

    return {
        "candidate": {
            "id": candidate.candidate_id,
            "name": candidate.name,
            "email": candidate.email,
            "phone": candidate.phone,
            "kyc_verified": candidate.kyc_verified,
            "registered_at": candidate.registration_date,
        },
        "application": {
            "stage": app_stage,
            "job_role": latest.role.role_name if (latest and latest.role) else None,
            "is_completed": is_completed,
            "score_tier": score_tier,
            "hiring_decision_visible": hiring_decision if hiring_decision in ("HIRED", "SHORTLISTED", "REJECTED") else None,
        },
        "booking": booking_data,
        "resume": {
            "uploaded": bool(resume),
            "resume_score": float(resume.resume_score or 0) if resume else 0,
        },
        "attempts": attempts,
        "interview_id": latest.interview_id if latest else None,
    }
'''

# Read Main.py and inject before the last uvicorn block
with open("Main.py", "r", encoding="utf-8") as f:
    content = f.read()

target = 'if __name__ == "__main__":\n    import uvicorn\n    uvicorn.run("Main:app", host="0.0.0.0", port=8000, reload=True)'
if target in content:
    content = content.replace(target, SCHEDULING_ROUTES + "\n\n" + target)
    with open("Main.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: Scheduling routes injected into Main.py")
else:
    # Try CRLF
    target_crlf = target.replace("\n", "\r\n")
    routes_crlf = SCHEDULING_ROUTES.replace("\n", "\r\n")
    if target_crlf in content:
        content = content.replace(target_crlf, routes_crlf + "\r\n\r\n" + target_crlf)
        with open("Main.py", "w", encoding="utf-8") as f:
            f.write(content)
        print("SUCCESS (CRLF): Scheduling routes injected")
    else:
        print("ERROR: Could not find injection point")
