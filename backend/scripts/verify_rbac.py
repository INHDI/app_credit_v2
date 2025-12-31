
import requests
import time
from datetime import date

BASE_URL = "http://localhost:8000"

def print_result(step, success, details=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {step}")
    if not success and details:
        print(f"   Details: {details}")

class RBACTester:
    def __init__(self):
        self.users = {} # role -> {email, token, id}

    def setup_users(self):
        print("Creating users for each role...")
        roles = ["admin", "collector", "debtor"]
        for role in roles:
            email = f"rbac_{role}_{int(time.time())}@test.com"
            password = "password123"
            payload = {
                "ho_ten": f"Test {role.title()}",
                "so_dien_thoai": f"0{role[0:2]}{str(int(time.time()))[-7:]}",
                "email": email,
                "password": password,
                "role": role
            }
            # Admin registers them (except admin checks)
            # Actually, standard register is public? Let's check auth.py
            # Register is public.
            
            # Register
            resp = requests.post(f"{BASE_URL}/auth/register", json=payload)
            if resp.status_code != 201:
                print(f"Failed to register {role}: {resp.text}")
                continue
                
            user_id = resp.json()['data']['id']
            
            # Login
            login_resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
            token = login_resp.json()['data']['token']['access_token']
            
            self.users[role] = {"email": email, "token": token, "id": user_id}
            print(f"Created {role}: {email} (ID: {user_id})")

    def get_headers(self, role):
        return {"Authorization": f"Bearer {self.users[role]['token']}"}

    def test_admin_routes(self):
        print("\n--- Testing Admin Routes ---")
        # Admin should access Dashboard
        resp = requests.get(f"{BASE_URL}/dashboard?time_period=all", headers=self.get_headers("admin"))
        print_result("Admin access Dashboard", resp.status_code == 200)

        # Admin should create Contract
        payload = {
            "HoTen": "Test Contract",
            "SoTienVay": 10000000,
            "KyDong": 30,
            "LaiSuat": 50000,
            "NgayVay": date.today().isoformat(),
            "user_id": self.users["debtor"]["id"]
        }
        resp = requests.post(f"{BASE_URL}/tin-chap", json=payload, headers=self.get_headers("admin"))
        print_result("Admin create Tin Chap", resp.status_code == 201)
        if resp.status_code == 201:
            return resp.json()['data']['MaHD']
        return None

    def test_collector_permissions(self, ma_hd):
        print("\n--- Testing Collector Permissions ---")
        # Collector should access Users/Debtors
        resp = requests.get(f"{BASE_URL}/auth/users/debtors", headers=self.get_headers("collector"))
        has_access = resp.status_code == 200
        print_result("Collector access Debtors List", has_access)
        
        # Collector should NOT delete contract (Admin only)
        # Checking router: delete API usually requires admin
        if ma_hd:
            resp = requests.delete(f"{BASE_URL}/tin-chap/{ma_hd}", headers=self.get_headers("collector"))
            # Expect 403 Forbidden
            print_result("Collector CANNOT delete contract (Expect 403)", resp.status_code == 403)
            
        # Collector accessing Dashboard? 
        # dashboard.py says require_admin -> Expect 403
        resp = requests.get(f"{BASE_URL}/dashboard?time_period=all", headers=self.get_headers("collector"))
        print_result("Collector CANNOT access Dashboard (Expect 403)", resp.status_code == 403)

    def test_debtor_permissions(self, ma_hd):
        print("\n--- Testing Debtor Permissions ---")
        # Debtor accessing own portal
        resp = requests.get(f"{BASE_URL}/debtor/summary", headers=self.get_headers("debtor"))
        print_result("Debtor access Debtor Portal", resp.status_code == 200)
        
        # Debtor accessing Admin routes -> Expect 403
        if ma_hd:
            resp = requests.get(f"{BASE_URL}/tin-chap/{ma_hd}", headers=self.get_headers("debtor"))
            print_result("Debtor CANNOT access Admin Contract API (Expect 403)", resp.status_code == 403)
            
        # Debtor creating contract -> Expect 403
        payload = {
            "HoTen": "Hacker",
            "SoTienVay": 1000,
            "KyDong": 1,
            "LaiSuat": 1,
            "NgayVay": date.today().isoformat()
        }
        resp = requests.post(f"{BASE_URL}/tin-chap", json=payload, headers=self.get_headers("debtor"))
        print_result("Debtor CANNOT create contract (Expect 403)", resp.status_code == 403)

    def run(self):
        try:
            self.setup_users()
            ma_hd = self.test_admin_routes()
            self.test_collector_permissions(ma_hd)
            self.test_debtor_permissions(ma_hd)
        except Exception as e:
            print(f"Test failed with error: {e}")

if __name__ == "__main__":
    tester = RBACTester()
    tester.run()
