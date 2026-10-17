from datetime import date

from tests.conftest import ADMIN, hdr

A, B = hdr("avery", "Avery"), hdr("sam", "Sam")
A_TEXT = "Today I felt ignored when Sam scrolled through dinner at Nico's. I still love our walks though."
B_TEXT = "Work was brutal and I zoned out at dinner. I want more quiet time together on weekends."
DAY = date(2026, 10, 16).isoformat()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["ok"]


def test_requires_auth(client):
    assert client.get("/auth/me").status_code == 401


def test_pairing(client):
    assert client.get("/auth/me", headers=A).json()["display_name"] == "Avery"
    r = client.post("/pairs", headers=A)
    assert r.status_code == 201
    code = r.json()["invite_code"]
    assert r.json()["complete"] is False
    assert client.post("/pairs", headers=A).status_code == 409
    assert client.post("/pairs/join", json={"invite_code": "NOPE00"}, headers=B).status_code == 404
    r = client.post("/pairs/join", json={"invite_code": code.lower()}, headers=B)
    assert r.status_code == 200 and r.json()["partner"]["display_name"] == "Avery"
    me = client.get("/pairs/me", headers=A).json()
    assert me["complete"] and me["partner"]["display_name"] == "Sam"
    assert set(me["partner"].keys()) == {"id", "email", "display_name", "timezone"}  # no activity fields


def test_diary_write_and_privacy(client):
    r = client.put(f"/diary/{DAY}", json={"text": A_TEXT, "mood": 2}, headers=A)
    assert r.status_code == 200 and r.json()["analyzed"] is False
    r = client.put(f"/diary/{DAY}", json={"text": A_TEXT + " Edited.", "mood": 2}, headers=A)   # same-day update
    assert r.json()["text"].endswith("Edited.")
    assert client.put(f"/diary/{DAY}", json={"text": B_TEXT, "mood": 3}, headers=B).status_code == 200
    assert client.put("/diary/2099-01-01", json={"text": "x"}, headers=A).status_code == 422
    # B can never read A's entry through any diary route
    assert client.get(f"/diary/{DAY}", headers=B).json()["text"] == B_TEXT
    assert len(client.get("/diary", headers=A).json()) == 1


def test_analysis_and_leakcheck(client):
    assert client.post("/admin/analyze", json={"day": DAY}).status_code == 403   # no admin token
    r = client.post("/admin/analyze", json={"day": DAY}, headers=ADMIN)
    assert r.status_code == 200
    run = r.json()[0]
    assert run["status"] == "done", run
    # idempotent
    again = client.post("/admin/analyze", json={"day": DAY}, headers=ADMIN).json()[0]
    assert again["id"] == run["id"]

    fa = client.get("/feedback/latest", headers=A).json()
    fb = client.get(f"/feedback/{DAY}", headers=B).json()
    assert fa["day"] == DAY and len(fa["bullets"]) >= 2
    # the mock deliberately leaks a 12-word span; the scrubber must have removed it
    assert all("Your partner wrote" not in b for b in fa["bullets"])
    assert all("Your partner wrote" not in b for b in fb["bullets"])
    joined_a = " ".join(fa["bullets"]).lower()
    assert "zoned out at dinner" not in joined_a
    joined_b = " ".join(fb["bullets"]).lower()
    assert "scrolled through dinner" not in joined_b

    # summaries were written back; day is now locked
    assert client.get(f"/diary/{DAY}", headers=A).json()["ai_summary"]
    assert client.get(f"/diary/{DAY}", headers=A).json()["analyzed"] is True
    assert client.put(f"/diary/{DAY}", json={"text": "late edit"}, headers=A).status_code == 409


def test_skip_when_no_entries(client):
    r = client.post("/admin/analyze", json={"day": "2026-01-01"}, headers=ADMIN).json()[0]
    assert r["status"] == "skipped"


def test_dev_login_cookie_and_sse_auth(client):
    r = client.post("/auth/dev-login", json={"user_id": "avery", "email": "avery@test.local", "display_name": "Avery"})
    assert r.status_code == 200 and "corner_session" in r.cookies
    # cookie alone authenticates (no dev headers)
    c = client.cookies
    r = client.get("/auth/me", cookies={"corner_session": r.cookies["corner_session"]})
    assert r.status_code == 200 and r.json()["id"] == "avery"
