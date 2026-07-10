import os
import sys
from pathlib import Path

DB_PATH = Path("healthos_test.db")
DB_PATH.unlink(missing_ok=True)
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "1440"
os.environ["FIREWORKS_API_KEY"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def test_auth_profile_report_dashboard_and_chat_flow():
    client = TestClient(app)

    assert client.get("/").json() == {"message": "HealthOS app running"}

    signup = client.post(
        "/api/auth/signup",
        json={
            "username": "smokeuser",
            "email": "smoke@example.com",
            "password": "password123",
        },
    )
    assert signup.status_code == 201

    login = client.post(
        "/api/auth/login",
        json={"email": "smoke@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    profile = client.put(
        "/api/users/me",
        headers=headers,
        json={
            "age": 35,
            "sex": "male",
            "height_cm": 175,
            "weight_kg": 78,
            "conditions": ["hypertension"],
            "medications": [
                {"name": "amlodipine", "dosage": "5mg", "time": "morning"}
            ],
            "emergency_contact": {"name": "Test Contact", "phone": "1234567890"},
        },
    )
    assert profile.status_code == 200
    assert profile.json()["is_complete"] is True

    upload = client.post(
        "/api/reports/upload",
        headers=headers,
        files={
            "file": (
                "../report.txt",
                b"LDL Cholesterol 145 mg/dL\nHDL 38 mg/dL\nGlucose 92 mg/dL\n",
                "text/plain",
            )
        },
    )
    assert upload.status_code == 201
    report_id = upload.json()["report_id"]

    report = client.get(f"/api/reports/{report_id}", headers=headers)
    assert report.status_code == 200
    assert report.json()["status"] == "complete"
    assert sorted(
        (value["term"], value["status"])
        for value in report.json()["flagged_values"]
    ) == [
        ("glucose", "normal"),
        ("hdl_cholesterol", "low"),
        ("ldl_cholesterol", "high"),
    ]

    dashboard = client.get("/api/dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["health_score"] == 74
    assert "ldl_cholesterol" in dashboard.json()["insights"][0]["text"]

    chat = client.post(
        "/api/chat",
        headers=headers,
        json={"message": "Review this report", "report_id": report_id},
    )
    assert chat.status_code == 200
    assert "ldl_cholesterol" in chat.json()["reply"]

    memory_chat = client.post(
        "/api/chat",
        headers=headers,
        json={"message": "What was my previous message?"},
    )
    assert memory_chat.status_code == 200
    assert "Review this report" in memory_chat.json()["reply"]

    missing_report = client.post(
        "/api/chat",
        headers=headers,
        json={
            "message": "Review this report",
            "report_id": "00000000-0000-0000-0000-000000000000",
        },
    )
    assert missing_report.status_code == 404
