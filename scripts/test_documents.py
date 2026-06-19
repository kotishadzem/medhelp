"""End-to-end functional test for the medical documents API.

Hits every documents endpoint, validates filtering / search / auth isolation /
validation rules / file-on-disk lifecycle.  Prints a per-step PASS/FAIL line
and exits non-zero on any failure.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import requests

BASE = "http://localhost:3002/api"
UPLOADS_ROOT = Path(__file__).resolve().parent.parent / "backend" / "uploads"

passed = 0
failed = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global passed, failed
    if ok:
        passed += 1
        print(f"  PASS  {name}")
    else:
        failed += 1
        print(f"  FAIL  {name}  {detail}")


def register(email: str, password: str) -> str:
    r = requests.post(
        f"{BASE}/auth/register",
        json={"email": email, "password": password},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["data"]["accessToken"]


def login(email: str, password: str) -> str:
    r = requests.post(
        f"{BASE}/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["data"]["accessToken"]


def headers(token: str | None) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"} if token else {}


def upload(
    token: str,
    file_path: Path,
    mime: str,
    *,
    document_type: str,
    custom_type: str | None,
    clinic: str,
    study_date: str,
    notes: str | None = None,
) -> dict[str, Any]:
    meta: dict[str, Any] = {
        "documentType": document_type,
        "clinic": clinic,
        "studyDate": study_date,
    }
    if custom_type:
        meta["customType"] = custom_type
    if notes:
        meta["notes"] = notes
    files = {
        "file": (file_path.name, file_path.read_bytes(), mime),
    }
    data = {"metadata": json.dumps(meta)}
    r = requests.post(
        f"{BASE}/documents",
        headers=headers(token),
        files=files,
        data=data,
        timeout=15,
    )
    return r.json()


def list_docs(token: str, **params: Any) -> dict[str, Any]:
    r = requests.get(
        f"{BASE}/documents",
        headers=headers(token),
        params=params,
        timeout=10,
    )
    return r.json()


def main() -> int:
    tmp = Path(__file__).resolve().parent / "_tmp"
    tmp.mkdir(exist_ok=True)

    pdf_path = tmp / "form100.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n")
    pdf2_path = tmp / "ct.pdf"
    pdf2_path.write_bytes(b"%PDF-1.4\nCT scan report payload\n%%EOF\n")
    png_path = tmp / "xray.png"
    # 1x1 transparent PNG
    png_path.write_bytes(
        bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452"
            "0000000100000001080600000005FC0F"
            "DA0000000A49444154789C6300010000"
            "0500010DCE2C0F0000000049454E44AE"
            "426082"
        )
    )
    txt_path = tmp / "hello.txt"
    txt_path.write_text("hello")

    suffix = os.urandom(4).hex()
    email_a = f"test-a-{suffix}@example.com"
    email_b = f"test-b-{suffix}@example.com"
    print(f"\n--- Setup: register users {email_a} + {email_b} ---")
    token_a = register(email_a, "passw0rd!")
    token_b = register(email_b, "passw0rd!")
    print("  registered both users")

    # ---- baseline ----
    print("\n--- Baseline ---")
    r = list_docs(token_a)
    check("user A starts with 0 docs", r["success"] and r["data"]["documents"] == [])

    r = requests.get(f"{BASE}/documents/clinics", headers=headers(token_a)).json()
    check(
        "user A starts with empty clinics",
        r["success"] and r["data"]["clinics"] == [],
    )

    # ---- uploads ----
    print("\n--- Uploads ---")
    up1 = upload(
        token_a,
        pdf_path,
        "application/pdf",
        document_type="BLOOD_TEST",
        custom_type="Hemoglobin",
        clinic="Republican Hospital",
        study_date="2026-05-10T00:00:00.000Z",
        notes="annual checkup",
    )
    check("upload BLOOD_TEST pdf", up1.get("success") is True, json.dumps(up1)[:200])
    doc1 = up1["data"]["document"] if up1.get("success") else {}

    up2 = upload(
        token_a,
        pdf2_path,
        "application/pdf",
        document_type="CT_SCAN",
        custom_type=None,
        clinic="City Clinic",
        study_date="2026-06-01T00:00:00.000Z",
    )
    check("upload CT_SCAN pdf", up2.get("success") is True, json.dumps(up2)[:200])
    doc2 = up2["data"]["document"] if up2.get("success") else {}

    up3 = upload(
        token_a,
        png_path,
        "image/png",
        document_type="ECG",
        custom_type="resting ECG",
        clinic="Republican Hospital",
        study_date="2026-05-20T00:00:00.000Z",
    )
    check("upload ECG png", up3.get("success") is True, json.dumps(up3)[:200])
    doc3 = up3["data"]["document"] if up3.get("success") else {}

    # ---- list & filter ----
    print("\n--- List + filter + search ---")
    r = list_docs(token_a)
    check(
        "list all returns 3",
        r["success"] and len(r["data"]["documents"]) == 3,
        f"got {len(r.get('data', {}).get('documents', []))}",
    )
    docs = r["data"]["documents"]
    check(
        "default sort = studyDate desc",
        docs[0]["studyDate"] >= docs[1]["studyDate"] >= docs[2]["studyDate"],
    )

    r = list_docs(token_a, type="BLOOD_TEST")
    check(
        "filter type=BLOOD_TEST -> 1",
        r["success"] and len(r["data"]["documents"]) == 1,
    )

    r = list_docs(token_a, type="MRI_SCAN")
    check(
        "filter type=MRI_SCAN -> 0",
        r["success"] and len(r["data"]["documents"]) == 0,
    )

    r = list_docs(token_a, clinic="Republican Hospital")
    check(
        "filter clinic=Republican Hospital -> 2",
        r["success"] and len(r["data"]["documents"]) == 2,
    )

    r = list_docs(
        token_a,
        **{
            "from": "2026-05-01T00:00:00.000Z",
            "to": "2026-05-31T23:59:59.999Z",
        },
    )
    check(
        "filter May 2026 -> 2",
        r["success"] and len(r["data"]["documents"]) == 2,
    )

    r = list_docs(
        token_a,
        **{
            "from": "2026-04-01T00:00:00.000Z",
            "to": "2026-04-30T23:59:59.999Z",
        },
    )
    check(
        "filter April 2026 -> 0",
        r["success"] and len(r["data"]["documents"]) == 0,
    )

    r = list_docs(token_a, q="hemoglobin")
    check(
        "search q=hemoglobin (case-insensitive) -> 1",
        r["success"] and len(r["data"]["documents"]) == 1,
    )

    r = list_docs(token_a, q="REPUBLICAN")
    check(
        "search q=REPUBLICAN matches clinic -> 2",
        r["success"] and len(r["data"]["documents"]) == 2,
    )

    r = list_docs(token_a, q="zzzzz")
    check(
        "search q=zzzzz -> 0",
        r["success"] and len(r["data"]["documents"]) == 0,
    )

    r = list_docs(token_a, q="annual")
    check(
        "search q=annual matches notes -> 1",
        r["success"] and len(r["data"]["documents"]) == 1,
    )

    # ---- clinics autocomplete ----
    print("\n--- Clinics autocomplete ---")
    r = requests.get(f"{BASE}/documents/clinics", headers=headers(token_a)).json()
    clinics = r["data"]["clinics"] if r.get("success") else []
    check(
        "clinics list has 2 entries",
        sorted(clinics) == ["City Clinic", "Republican Hospital"],
        str(clinics),
    )
    check(
        "Republican Hospital is first (used twice)",
        clinics and clinics[0] == "Republican Hospital",
    )

    # ---- detail ----
    print("\n--- Detail ---")
    r = requests.get(
        f"{BASE}/documents/{doc1['id']}", headers=headers(token_a)
    ).json()
    check("get detail of doc1", r.get("success") is True)
    check(
        "detail metadata matches upload",
        r["data"]["document"]["customType"] == "Hemoglobin"
        and r["data"]["document"]["fileSize"] == pdf_path.stat().st_size,
    )

    # ---- file streaming ----
    print("\n--- File streaming ---")
    r = requests.get(
        f"{BASE}/documents/{doc1['id']}/file",
        headers=headers(token_a),
        timeout=10,
    )
    check(
        "GET file returns 200 + correct bytes",
        r.status_code == 200 and r.content == pdf_path.read_bytes(),
    )
    check(
        "GET file Content-Type matches upload",
        r.headers.get("Content-Type", "").startswith("application/pdf"),
        r.headers.get("Content-Type", ""),
    )

    # ---- PATCH ----
    print("\n--- PATCH ---")
    r = requests.patch(
        f"{BASE}/documents/{doc1['id']}",
        headers={**headers(token_a), "Content-Type": "application/json"},
        data=json.dumps({"clinic": "Updated Clinic", "documentType": "LAB_ANALYSIS"}),
        timeout=10,
    ).json()
    check(
        "PATCH updates clinic + documentType",
        r["success"]
        and r["data"]["document"]["clinic"] == "Updated Clinic"
        and r["data"]["document"]["documentType"] == "LAB_ANALYSIS",
        json.dumps(r)[:200],
    )

    r = requests.get(f"{BASE}/documents/clinics", headers=headers(token_a)).json()
    check(
        "clinics list reflects PATCH",
        r.get("success") and "Updated Clinic" in r["data"]["clinics"],
        str(r.get("data", {}).get("clinics")),
    )

    # ---- auth isolation ----
    print("\n--- Auth isolation (user B) ---")
    r = list_docs(token_b)
    check("user B sees 0 docs", r["success"] and r["data"]["documents"] == [])

    r = requests.get(
        f"{BASE}/documents/{doc1['id']}", headers=headers(token_b)
    ).json()
    check("user B GET doc1 -> 404", r.get("success") is False)

    r = requests.get(
        f"{BASE}/documents/{doc1['id']}/file", headers=headers(token_b)
    ).json()
    check("user B GET file -> 404", r.get("success") is False)

    r = requests.patch(
        f"{BASE}/documents/{doc1['id']}",
        headers={**headers(token_b), "Content-Type": "application/json"},
        data=json.dumps({"clinic": "Hacked"}),
    ).json()
    check("user B PATCH -> 404", r.get("success") is False)

    r = requests.delete(
        f"{BASE}/documents/{doc1['id']}", headers=headers(token_b)
    ).json()
    check("user B DELETE -> 404", r.get("success") is False)

    # ---- unauthenticated ----
    print("\n--- Unauthenticated ---")
    r = requests.get(f"{BASE}/documents").json()
    check("no token GET /documents -> 401", r.get("success") is False)

    r = requests.get(f"{BASE}/documents/clinics").json()
    check("no token GET /documents/clinics -> 401", r.get("success") is False)

    # ---- validation ----
    print("\n--- Validation rules ---")
    files = {"file": (pdf_path.name, pdf_path.read_bytes(), "application/pdf")}
    bad_meta = {"metadata": json.dumps({"documentType": "BLOOD_TEST", "clinic": "", "studyDate": "2026-01-01"})}
    r = requests.post(
        f"{BASE}/documents", headers=headers(token_a), files=files, data=bad_meta
    ).json()
    check(
        "empty clinic -> validation error",
        r.get("success") is False
        and r.get("error", {}).get("code") == "VALIDATION_ERROR",
    )

    bad_meta = {"metadata": json.dumps({"documentType": "NOT_A_TYPE", "clinic": "X", "studyDate": "2026-01-01"})}
    r = requests.post(
        f"{BASE}/documents", headers=headers(token_a), files=files, data=bad_meta
    ).json()
    check(
        "invalid documentType -> validation error",
        r.get("success") is False
        and r.get("error", {}).get("code") == "VALIDATION_ERROR",
    )

    files_bad = {"file": (txt_path.name, txt_path.read_bytes(), "text/plain")}
    meta_ok = {"metadata": json.dumps({"documentType": "OTHER", "clinic": "X", "studyDate": "2026-01-01"})}
    r = requests.post(
        f"{BASE}/documents", headers=headers(token_a), files=files_bad, data=meta_ok
    ).json()
    check(
        "text/plain mime -> rejected",
        r.get("success") is False
        and r.get("error", {}).get("code") == "VALIDATION_ERROR",
    )

    # ---- File replace ----
    print("\n--- File replace (POST /api/documents/[id]/file) ---")
    new_payload = b"%PDF-1.4\nREPLACED-content-much-longer-than-original\n%%EOF\n"
    new_pdf = tmp / "replacement.pdf"
    new_pdf.write_bytes(new_payload)
    old_storage = doc3["storagePath"].replace("\\", "/")
    repl = requests.post(
        f"{BASE}/documents/{doc3['id']}/file",
        headers=headers(token_a),
        files={"file": (new_pdf.name, new_pdf.read_bytes(), "application/pdf")},
        timeout=15,
    ).json()
    check("file replace succeeds", repl.get("success") is True, json.dumps(repl)[:200])
    new_storage = repl["data"]["document"]["storagePath"].replace("\\", "/")
    check("storagePath changed", new_storage != old_storage)
    check(
        "fileName + size reflect new file",
        repl["data"]["document"]["fileName"] == new_pdf.name
        and repl["data"]["document"]["fileSize"] == len(new_payload),
    )
    check("old file removed from disk", not (UPLOADS_ROOT / old_storage).exists())
    check("new file present on disk", (UPLOADS_ROOT / new_storage).is_file())
    dl = requests.get(
        f"{BASE}/documents/{doc3['id']}/file", headers=headers(token_a)
    )
    check("GET file now returns replaced bytes", dl.content == new_payload)
    # User B should not be able to replace
    hijack = requests.post(
        f"{BASE}/documents/{doc3['id']}/file",
        headers=headers(token_b),
        files={"file": (new_pdf.name, new_pdf.read_bytes(), "application/pdf")},
    ).json()
    check("user B replace -> 404", hijack.get("success") is False)
    # Bad mime replace
    bad = requests.post(
        f"{BASE}/documents/{doc3['id']}/file",
        headers=headers(token_a),
        files={"file": ("x.txt", b"hi", "text/plain")},
    ).json()
    check(
        "replace with bad mime -> validation error",
        bad.get("success") is False
        and bad.get("error", {}).get("code") == "VALIDATION_ERROR",
    )

    # ---- DELETE + on-disk file cleanup ----
    print("\n--- DELETE + on-disk cleanup ---")
    storage_path = doc2["storagePath"].replace("\\", "/")
    abs_path = UPLOADS_ROOT / storage_path
    check("doc2 file exists on disk before delete", abs_path.is_file(), str(abs_path))

    r = requests.delete(
        f"{BASE}/documents/{doc2['id']}", headers=headers(token_a)
    ).json()
    check("DELETE doc2 succeeds", r.get("success") is True)

    check(
        "doc2 file removed from disk",
        not abs_path.exists(),
        str(abs_path),
    )

    r = list_docs(token_a)
    check("list now has 2 docs", r["success"] and len(r["data"]["documents"]) == 2)

    # ---- final list to clean up the test data ----
    for doc in [doc1, doc3]:
        requests.delete(f"{BASE}/documents/{doc['id']}", headers=headers(token_a))

    # ---- clean up test users ----
    print("\n--- Cleanup ---")
    os.system(
        f"docker exec medhelp-postgres psql -U medhelp -d medhelp -c "
        f"\"DELETE FROM users WHERE email IN ('{email_a}', '{email_b}');\" "
        f">/dev/null 2>&1"
    )

    print(f"\nResults: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
