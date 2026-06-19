import sys
import os

# add current directory to python path
sys.path.append(os.getcwd())

from database.database import SessionLocal
from database.models import Candidate
from database.db_utils import generate_enterprise_id

def test():
    db = SessionLocal()
    # Create test candidate
    cid = generate_enterprise_id(db, "CAN")
    cand = Candidate(
        candidate_id=cid,
        name="Test Delete",
        email="test_delete@example.com",
        phone="1234567890"
    )
    db.add(cand)
    db.commit()
    print("Created candidate:", cid)

    # Delete candidate
    cand_to_delete = db.query(Candidate).filter(Candidate.candidate_id == cid).first()
    if cand_to_delete:
        db.delete(cand_to_delete)
        db.commit()
        print("Deleted candidate:", cid)
    else:
        print("Candidate not found")
        
    db.close()

if __name__ == "__main__":
    test()
