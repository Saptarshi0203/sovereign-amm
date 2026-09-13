import csv
import io
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Response

from backend.app.api.deps import auth_scope
from backend.app.core.config import settings
from backend.app.engine_facade import MICRO, engine_facade
from engine.types import TradeExecuted, TradeRejected

router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("/overview")
def get_overview(user: Dict[str, Any] = Depends(auth_scope)):
    rt = engine_facade.get_runtime(settings.DEMO_GRID_ID)
    pnl = rt.pnl
    bought = sum(t["qty"] for t in rt.tape if t.get("amm") == "BID") / MICRO
    sold = sum(t["qty"] for t in rt.tape if t.get("amm") == "ASK") / MICRO
    return {
        "grid_import_kwh": round(bought, 3),
        "solar_export_kwh": round(sold, 3),
        "net_energy_bought_kwh": round(bought - sold, 3),
        "total_spent": round(sum(t["qty"] * t["price"] for t in rt.tape if t.get("amm") == "BID") / MICRO / MICRO, 2),
        "total_earned": round(sum(t["qty"] * t["price"] for t in rt.tape if t.get("amm") == "ASK") / MICRO / MICRO, 2),
        "realized_pnl": pnl.realized_micro / MICRO,
        "throughput_kwh": pnl.throughput_units / MICRO,
        "daily_breakdown": [
            {"hour": "00:00", "import": 2.1, "export": 0},
            {"hour": "06:00", "import": 1.5, "export": 0.5},
            {"hour": "12:00", "import": 0.5, "export": 4.2},
            {"hour": "18:00", "import": 3.2, "export": 0.1},
        ],
    }


@router.get("/trades")
def get_trades(user: Dict[str, Any] = Depends(auth_scope)) -> List[Dict[str, Any]]:
    rt = engine_facade.get_runtime(settings.DEMO_GRID_ID)
    trades: List[Dict[str, Any]] = []
    for e in reversed(rt.log.get_events()):
        if len(trades) >= 50:
            break
        if isinstance(e, TradeExecuted):
            trades.append(
                {
                    "type": "EXECUTION",
                    "id": e.fill.fill_id,
                    "volume_kw": e.fill.volume / MICRO,
                    "price": e.fill.price / MICRO,
                    "timestamp": e.fill.timestamp,
                    "status": "SUCCESS",
                }
            )
        elif isinstance(e, TradeRejected):
            trades.append(
                {
                    "type": "REJECTION",
                    "id": f"rej_{e.sequence_number}",
                    "maker": e.maker_order_id,
                    "taker": e.taker_order_id,
                    "reason": e.reason,
                    "status": "REJECTED",
                }
            )
    return trades


@router.get("/settlement")
def get_settlement(user: Dict[str, Any] = Depends(auth_scope)):
    rt = engine_facade.get_runtime(settings.DEMO_GRID_ID)
    return {
        "period": "September 2026",
        "total_buys": round(sum(t["qty"] for t in rt.tape if t["side"] == "BUY") / MICRO, 2),
        "total_sells": round(sum(t["qty"] for t in rt.tape if t["side"] == "SELL") / MICRO, 2),
        "net_amount": round(rt.pnl.realized_micro / MICRO, 2),
        "status": "PENDING_CLOSE",
        "masked_account": user.get("bank_account_masked", "XXXXXX4821"),
    }


@router.get("/settlement/export-neft")
def export_neft(user: Dict[str, Any] = Depends(auth_scope)):
    rt = engine_facade.get_runtime(settings.DEMO_GRID_ID)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Transaction Type", "Beneficiary Account", "IFSC", "Amount", "Beneficiary Name", "Remarks"])
    writer.writerow(["NEFT", user.get("bank_account_masked", "XXXXXX4821"), "HDFC0001234", f"{abs(rt.pnl.realized_micro / MICRO):.2f}", user.get("sub", user.get("email", "")), "SovereignAMM Energy Settlement"])
    response = Response(content=output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=settlement_neft.csv"
    response.headers["Content-Type"] = "text/csv"
    return response
