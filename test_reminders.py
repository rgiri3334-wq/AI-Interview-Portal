import os
import sys
from dotenv import load_dotenv
load_dotenv()

from database.database import SessionLocal
from database.models import SlotBooking, InterviewSlot, Candidate
from datetime import datetime, timedelta, timezone

def test_logic():
    db = SessionLocal()
    try:
        bookings = db.query(SlotBooking).filter(SlotBooking.status == "BOOKED", SlotBooking.reminder_stage < 4).all()
        print(f"Found {len(bookings)} bookings to process.")
        
        for b in bookings:
            slot = b.slot
            candidate = b.candidate
            if not slot or not candidate or not candidate.email:
                print(f"Booking {b.booking_id}: missing slot or candidate email. Skipping.")
                continue
                
            try:
                dt_str = f"{slot.date} {slot.start_time}"
                if "AM" in slot.start_time or "PM" in slot.start_time:
                    slot_dt = datetime.strptime(dt_str, "%Y-%m-%d %I:%M %p")
                else:
                    slot_dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
                
                now = datetime.now()
                time_diff = slot_dt - now
                time_diff_mins = time_diff.total_seconds() / 60
                
                try:
                    booked_at_dt = datetime.fromisoformat(b.booked_at.replace('Z', '+00:00'))
                    now_utc = datetime.now(timezone.utc)
                    time_since_booking_mins = (now_utc - booked_at_dt).total_seconds() / 60
                except Exception as e:
                    print(f"Error parsing booked_at for {b.booking_id}: {e}")
                    time_since_booking_mins = 120
                    
                msg_time = None
                new_stage = b.reminder_stage
                
                print(f"Booking {b.booking_id} for {candidate.name}:")
                print(f"  Slot Time: {slot_dt}")
                print(f"  Now: {now}")
                print(f"  Time Diff (mins): {time_diff_mins:.2f}")
                print(f"  Time Since Booking (mins): {time_since_booking_mins:.2f}")
                print(f"  Current Stage: {b.reminder_stage}")
                
                if b.reminder_stage < 1 and 60 < time_diff_mins <= 12 * 60:
                    if time_since_booking_mins >= 30:
                        msg_time = "12 Hours"
                        new_stage = 1
                elif b.reminder_stage < 2 and 10 < time_diff_mins <= 60:
                    if time_since_booking_mins >= 15:
                        msg_time = "1 Hour"
                        new_stage = 2
                elif b.reminder_stage < 3 and 5 < time_diff_mins <= 10:
                    if time_since_booking_mins >= 2:
                        msg_time = "10 Minutes"
                        new_stage = 3
                elif b.reminder_stage < 4 and 1 < time_diff_mins <= 5:
                    if time_diff_mins >= 3 and time_since_booking_mins >= 2:
                        msg_time = "5 Minutes"
                        new_stage = 4
                        
                if msg_time:
                    print(f"  => ACTION: Send {msg_time} reminder! (New Stage: {new_stage})")
                else:
                    print(f"  => ACTION: No reminder to send.")
                    if time_diff_mins <= 60 and b.reminder_stage < 1:
                        print(f"  => EXPIRE: Stage 1")
                    elif time_diff_mins <= 10 and b.reminder_stage < 2:
                        print(f"  => EXPIRE: Stage 2")
                    elif time_diff_mins <= 5 and b.reminder_stage < 3:
                        print(f"  => EXPIRE: Stage 3")
                    elif time_diff_mins <= 1 and b.reminder_stage < 4:
                        print(f"  => EXPIRE: Stage 4")
            except Exception as e:
                print(f"Error processing booking {b.booking_id}: {e}")
                
    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_logic()
