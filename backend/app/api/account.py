from fastapi import APIRouter, Depends, HTTPException, Response
from typing import Dict, Any, List
import csv
import io
from datetime import datetime

from backend.app.core.auth import get_current_user, require_role
from backend.app.main import event_log
from engine.types import TradeExecuted, TradeRejected

router = APIRouter(prefix="/api/account", tags=["account"])

@router.get("/overview")
def get_overview(user: Dict[str, Any] = Depends(require_role(["market_participant"]))):
    # Process event log to compute user's net position
    events = event_log.get_events()
    
    total_bought_kwh = 0
    total_sold_kwh = 0
    total_spent_inr = 0
    total_earned_inr = 0

    user_id = user["email"] # Using email as trader_id for mock

    for e in events:
        if isinstance(e, TradeExecuted):
            fill = e.fill
            # Since trader_id isn't directly on Fill, we approximate based on maker/taker id mapping if possible.
            # In a real app we'd map order_id to trader_id cleanly.
            # For this hackathon demo, we will fake some overview data based on real fill volume if they match,
            # but since load simulator generates fake trader IDs ("solar_farm_1"), we'll return mock data.
            pass

    # Mocked overview data for UI presentation
    return {
        "grid_import_kwh": 45.2,
        "solar_export_kwh": 12.5,
        "net_energy_bought_kwh": 32.7,
        "total_spent": 185.40,
        "total_earned": 62.50,
        "daily_breakdown": [
            {"hour": "00:00", "import": 2.1, "export": 0},
            {"hour": "06:00", "import": 1.5, "export": 0.5},
            {"hour": "12:00", "import": 0.5, "export": 4.2},
            {"hour": "18:00", "import": 3.2, "export": 0.1},
        ]
    }

@router.get("/trades")
def get_trades(user: Dict[str, Any] = Depends(require_role(["market_participant"]))):
    events = event_log.get_events()
    trades = []
    
    # Extract last 50 trades/rejections
    for e in reversed(events):
        if len(trades) > 50:
            break
        if isinstance(e, TradeExecuted):
            trades.append({
                "type": "EXECUTION",
                "id": e.fill.fill_id,
                "volume_kw": e.fill.volume / 1_000_000.0,
                "price": e.fill.price / 1_000_000.0,
                "timestamp": e.fill.timestamp,
                "status": "SUCCESS"
            })
        elif isinstance(e, TradeRejected):
            trades.append({
                "type": "REJECTION",
                "id": f"rej_{e.sequence_number}",
                "maker": e.maker_order_id,
                "taker": e.taker_order_id,
                "reason": e.reason,
                "status": "REJECTED"
            })
            
    return trades

@router.get("/settlement")
def get_settlement(user: Dict[str, Any] = Depends(require_role(["market_participant"]))):
    return {
        "period": "August 2026",
        "total_buys": 450,
        "total_sells": 120,
        "net_amount": -330,  # user owes 330
        "status": "PENDING_CLOSE",
        "masked_account": user.get("bank_account_masked", "XXXXXX4821")
    }

@router.get("/settlement/export-neft")
def export_neft(user: Dict[str, Any] = Depends(require_role(["market_participant"]))):
    # Generate NPCI bulk-NEFT format CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers typically required by NPCI/Banks
    writer.writerow(["Transaction Type", "Beneficiary Account", "IFSC", "Amount", "Beneficiary Name", "Remarks"])
    writer.writerow(["NEFT", user.get("bank_account_masked", "XXXXXX4821"), "HDFC0001234", "330.00", user["email"], "SovereignAMM Energy Settlement Aug 2026"])
    
    csv_data = output.getvalue()
    
    response = Response(content=csv_data)
    response.headers["Content-Disposition"] = "attachment; filename=settlement_neft.csv"
    response.headers["Content-Type"] = "text/csv"
    return response
