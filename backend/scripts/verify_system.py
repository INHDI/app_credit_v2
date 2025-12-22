import requests
import sys
import json
import time
from datetime import datetime, date

BASE_URL = "http://localhost:8088"

def print_result(step, success, details=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {step}")
    if not success and details:
        print(f"   Details: {details}")
    if success and details:
        print(f"   Info: {details}")

def run_verification():
    print("="*50)
    print("🚀 SYSTEM VERIFICATION SCRIPT")
    print(f"Target: {BASE_URL}")
    print("="*50)

    # 1. Register/Login Admin
    session = requests.Session()
    admin_email = f"admin_test_{int(time.time())}@example.com"
    admin_pass = "password123"
    
    print(f"\n1. Authenticating as Admin ({admin_email})...")
    
    # Register
    reg_payload = {
        "ho_ten": "System Verifier",
        "so_dien_thoai": f"09{str(int(time.time()))[-8:]}", # unique phone (10 digits)
        "email": admin_email,
        "password": admin_pass,
        "role": "admin"
    }
    
    try:
        resp = session.post(f"{BASE_URL}/auth/register", json=reg_payload)
        if resp.status_code == 201:
            print_result("Register Admin", True)
        else:
            print_result("Register Admin", False, resp.text)
            return
            
        # Login
        login_payload = {"email": admin_email, "password": admin_pass}
        resp = session.post(f"{BASE_URL}/auth/login", json=login_payload)
        if resp.status_code == 200:
            token = resp.json()['data']['token']['access_token']
            session.headers.update({"Authorization": f"Bearer {token}"})
            print_result("Login Admin", True)
        else:
            print_result("Login Admin", False, resp.text)
            return

    except Exception as e:
        print_result("Auth Flow", False, str(e))
        return

    # 2. Create Debtor User
    print("\n2. Creating Debtor User...")
    debtor_phone = f"08{str(int(time.time()))[-8:]}"
    debtor_email = f"debtor_{int(time.time())}@example.com"
    
    # Note: Admin creates user via regular register endpoint or special user management endpoint?
    # Usually admin creates context contracts for an existing user. 
    # Let's register a debtor first to have a valid user_id.
    
    reg_debtor_payload = {
        "ho_ten": "Test Debtor",
        "so_dien_thoai": debtor_phone,
        "email": debtor_email,
        "password": "password123",
        "role": "debtor"
    }
    resp = session.post(f"{BASE_URL}/auth/register", json=reg_debtor_payload)
    if resp.status_code == 201:
        debtor_data = resp.json()['data']
        debtor_id = debtor_data['id']
        print_result("Create Debtor", True, f"ID: {debtor_id}")
    else:
        print_result("Create Debtor", False, resp.text)
        return

    # 3. Create Tin Chap Contract
    print("\n3. Creating Tin Chap Contract...")
    tc_payload = {
        "HoTen": "Test Debtor",
        # Note: Schema didn't show phone field? Checking tin_chap.py again... 
        # Wait, tin_chap.py schema does NOT have phone! It has user_id.
        # Let me re-read schemas carefully.
        # TinChapCreate: HoTen, NgayVay, SoTienVay, KyDong, LaiSuat, user_id.
        # It does NOT have so_dien_thoai.
        
        "SoTienVay": 10000000,
        "KyDong": 60,
        "SoNgayVay": 30,
        "LaiSuat": 50000,
        "NgayVay": date.today().isoformat(),
        "user_id": debtor_id
    }
    
    resp = session.post(f"{BASE_URL}/tin-chap", json=tc_payload)
    tc_ma_hd = ""
    if resp.status_code == 201:
        data = resp.json()['data']
        tc_ma_hd = data['MaHD']
        print_result("Create Tin Chap", True, f"MaHD: {tc_ma_hd}")
    else:
        print_result("Create Tin Chap", False, resp.text)

    # 4. Create Tra Gop Contract
    print("\n4. Creating Tra Gop Contract...")
    tg_payload = {
        "HoTen": "Test Debtor",
        "SoTienVay": 20000000,
        "SoLanTra": 50,
        "KyDong": 1,
        "LaiSuat": 500000,
        "NgayVay": date.today().isoformat(),
        "user_id": debtor_id
    }
    # Tra gop logic usually requires implicit calc passed or calc on backend. 
    # Checking schema... simplistic payload for now.
    
    resp = session.post(f"{BASE_URL}/tra-gop", json=tg_payload)
    tg_ma_hd = ""
    if resp.status_code == 201:
        data = resp.json()['data']
        tg_ma_hd = data['MaHD']
        print_result("Create Tra Gop", True, f"MaHD: {tg_ma_hd}")
    else:
        print_result("Create Tra Gop", False, resp.text)

    # 5. Verify Lists
    print("\n5. Verifying Lists...")
    
    # Get Tin Chap List
    resp = session.get(f"{BASE_URL}/tin-chap")
    if resp.status_code == 200:
        items = resp.json()['data']['items']
        found = any(i['MaHD'] == tc_ma_hd for i in items)
        print_result("Get Tin Chap List", found)
    else:
         print_result("Get Tin Chap List", False, resp.text)

    # Get Tra Gop List
    resp = session.get(f"{BASE_URL}/tra-gop")
    if resp.status_code == 200:
        items = resp.json()['data']['items']
        found = any(i['MaHD'] == tg_ma_hd for i in items)
        print_result("Get Tra Gop List", found)
    else:
         print_result("Get Tra Gop List", False, resp.text)
         
    # 6. Test Payment (Tra Lai)
    # Payment usually endpoint like /api/other/pay or in specific router.
    # Looking at routers... likely in `lich_su.py` or `payment` related logic? 
    # Previous code showed `paymentApi` usually calling generic endpoints or specific updates.
    # Checking `tin_chap.py` put `tra-goc`.
    
    if tc_ma_hd:
        print("\n6. Testing Repayment (Tin Chap)...")
        # Tra goc partial
        resp = session.put(f"{BASE_URL}/tin-chap/tra-goc/{tc_ma_hd}?so_tien_tra_goc=1000000")
        if resp.status_code == 200:
             print_result("Pay Principal (Tra Goc)", True)
        else:
             print_result("Pay Principal (Tra Goc)", False, resp.text)

    # 7. Check Dashboard
    print("\n7. Verifying Dashboard Aggregation...")
    resp = session.get(f"{BASE_URL}/dashboard?time_period=all")
    if resp.status_code == 200:
        stats = resp.json()['data']
        print_result("Get Dashboard Stats", True, f"Total Contracts: {stats['tong_hop_dong']}")
        # Could verify counts increased but need baseline. Stability check is just 200 OK mostly.
    else:
        print_result("Get Dashboard Stats", False, resp.text)

if __name__ == "__main__":
    run_verification()
