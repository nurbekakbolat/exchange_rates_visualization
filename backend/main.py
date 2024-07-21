from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Float, DateTime
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from datetime import datetime, timezone, timedelta
import requests

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "sqlite:///./exchange_rates.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    date = Column(DateTime, primary_key=True, index=True)
    rate = Column(Float, index=True)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def fetch_exchange_rates(start_date: str, end_date: str):
    url = f"https://www.frankfurter.app/{start_date}..{end_date}?to=JPY"
    response = requests.get(url)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Error fetching data from API")
    return response.json()

@app.get("/fetch_data")
def fetch_data(period: str, db: Session = Depends(get_db)):
    periods = {
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "12m": 365
    }
    if period not in periods:
        raise HTTPException(status_code=400, detail="Invalid period")

    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=periods[period])
    end_date_str = end_date.strftime("%Y-%m-%d")
    start_date_str = start_date.strftime("%Y-%m-%d")

    data = fetch_exchange_rates(start_date_str, end_date_str)
    if "rates" not in data:
        raise HTTPException(status_code=500, detail="Invalid data format from API")
    
    db.query(ExchangeRate).delete()
    db.commit()

    rates = data["rates"]
    for date_str, rate_info in rates.items():
        date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        rate = rate_info["JPY"]
        db_rate = ExchangeRate(date=date, rate=rate)
        db.add(db_rate)
    db.commit()
    return {"message": "Data fetched and stored"}

@app.get("/exchange_rates")
def get_exchange_rates(db: Session = Depends(get_db)):
    rates = db.query(ExchangeRate).all()
    return [{"date": rate.date, "rate": rate.rate} for rate in rates]
