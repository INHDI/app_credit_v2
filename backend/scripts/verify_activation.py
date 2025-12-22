import requests
import sys
import json

BASE_URL = "http://localhost:8000"

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"

def log(message, success=True):
    color = GREEN if success else RED
    print(f"{color}{message}{RESET}")

def verify_activation_logic():
    print("Starting Activation Logic Verification...")

    # 1. Login as Admin
    print("\n1. Logging in as Admin...")
    admin_login = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@example.com",
        "password": "adminpassword" # Assuming default admin password, might need adjustment
    })
    
    if admin_login.status_code != 200:
        log("Failed to login as admin", False)
        print(admin_login.text)
        return

    admin_token = admin_login.json()['data']['token']['access_token']
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    log("Admin login successful")

    # 2. Create Test User
    print("\n2. Creating Test User...")
    test_email = "test_active@example.com"
    test_password = "password123"
    
    # Clean up if exists
    # First get all users to find ID
    users_resp = requests.get(f"{BASE_URL}/auth/users", headers=admin_headers)
    if users_resp.status_code == 200:
        for user in users_resp.json()['data']:
            if user['email'] == test_email:
                requests.delete(f"{BASE_URL}/auth/users/{user['id']}", headers=admin_headers)
                print("Cleaned up existing test user")

    create_resp = requests.post(f"{BASE_URL}/auth/register", json={
        "ho_ten": "Test Active User",
        "email": test_email,
        "password": test_password,
        "so_dien_thoai": "0999999888",
        "role": "debtor"
    })

    if create_resp.status_code != 201:
        log(f"Failed to create test user: {create_resp.text}", False)
        return

    user_id = create_resp.json()['data']['id']
    log(f"Test user created with ID: {user_id}")

    # 3. Verify Test User Login (Should Succeed)
    print("\n3. Verifying Active User Login...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": test_password
    })

    if login_resp.status_code == 200:
        log("Active user logged in successfully")
    else:
        log(f"Active user failed to login: {login_resp.status_code}", False)
        return

    # 4. Deactivate User
    print("\n4. Deactivating User...")
    update_resp = requests.put(f"{BASE_URL}/auth/users/{user_id}", headers=admin_headers, json={
        "is_active": False
    })

    if update_resp.status_code == 200 and update_resp.json()['data']['is_active'] == False:
        log("User deactivated successfully")
    else:
        log(f"Failed to deactivate user: {update_resp.text}", False)
        return

    # 5. Verify Inactive User Login (Should Fail)
    print("\n5. Verifying Inactive User Login (Expect Failure)...")
    login_fail_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": test_password
    })

    if login_fail_resp.status_code == 401:
        log("Inactive user login denied as expected (401)")
    else:
        log(f"Inactive user login SHOULD have failed but got: {login_fail_resp.status_code}", False)
        print(login_fail_resp.text)

    # 6. Reactivate User
    print("\n6. Reactivating User...")
    update_resp_2 = requests.put(f"{BASE_URL}/auth/users/{user_id}", headers=admin_headers, json={
        "is_active": True
    })

    if update_resp_2.status_code == 200 and update_resp_2.json()['data']['is_active'] == True:
        log("User reactivated successfully")
    else:
        log(f"Failed to reactivate user: {update_resp_2.text}", False)
        return

    # 7. Verify Active User Login Again (Should Succeed)
    print("\n7. Verifying Reactivated User Login...")
    login_resp_2 = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": test_password
    })

    if login_resp_2.status_code == 200:
        log("Reactivated user logged in successfully")
    else:
        log(f"Reactivated user failed to login: {login_resp_2.status_code}", False)

    # 8. Cleanup
    print("\n8. Cleaning up...")
    requests.delete(f"{BASE_URL}/auth/users/{user_id}", headers=admin_headers)
    log("Test user deleted")

if __name__ == "__main__":
    try:
        verify_activation_logic()
    except Exception as e:
        log(f"An error occurred: {e}", False)
