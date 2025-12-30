"""
Database initialization script
Run this to create database tables
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import init_db, engine, POSTGRES_SERVER, POSTGRES_PORT, POSTGRES_DB, update_db, SessionLocal
from sqlalchemy import inspect


def check_tables_exist():
    """Check if tables already exist"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return len(tables) > 0


def seed_data():
    """Seed initial data for Banks and Settings"""
    from app.models.settings import Bank, SystemSettings
    
    db = SessionLocal()
    try:
        # 1. Seed Banks
        # Check if banks exist
        if db.query(Bank).count() == 0:
            print("🌱 Seeding Banks...")
            banks_data = [
                {"name": "Ngân hàng Ngoại thương Việt Nam", "short_name": "Vietcombank", "code": "VCB", "bin": "970436"},
                {"name": "Ngân hàng Công thương Việt Nam", "short_name": "VietinBank", "code": "CTG", "bin": "970415"},
                {"name": "Ngân hàng Đầu tư và Phát triển VN", "short_name": "BIDV", "code": "BIDV", "bin": "970418"},
                {"name": "Ngân hàng Nông nghiệp & PT Nông thôn", "short_name": "Agribank", "code": "VARB", "bin": "970405"},
                {"name": "Ngân hàng Quân đội", "short_name": "MBBank", "code": "MB", "bin": "970422"},
                {"name": "Ngân hàng Kỹ thương Việt Nam", "short_name": "Techcombank", "code": "TCB", "bin": "970407"},
                {"name": "Ngân hàng Á Châu", "short_name": "ACB", "code": "ACB", "bin": "970416"},
                {"name": "Ngân hàng Tiên Phong", "short_name": "TPBank", "code": "TPB", "bin": "970423"},
                {"name": "Ngân hàng Việt Nam Thịnh Vượng", "short_name": "VPBank", "code": "VPB", "bin": "970432"},
                {"name": "Ngân hàng Quốc tế", "short_name": "VIB", "code": "VIB", "bin": "970441"},
                {"name": "Ngân hàng Sài Gòn Thương Tín", "short_name": "Sacombank", "code": "STB", "bin": "970403"},
                {"name": "Ngân hàng Xuất Nhập Khẩu", "short_name": "Eximbank", "code": "EIB", "bin": "970431"},
                {"name": "Ngân hàng Sài Gòn Hà Nội", "short_name": "SHB", "code": "SHB", "bin": "970443"},
                {"name": "Ngân hàng TMCP Phương Đông", "short_name": "OCB", "code": "OCB", "bin": "970448"},
                {"name": "Ngân hàng TMCP Phát triển TP.HCM", "short_name": "HDBank", "code": "HDB", "bin": "970437"},
                {"name": "Ngân hàng TMCP Bản Việt", "short_name": "BVBank", "code": "BVB", "bin": "970454"},
                {"name": "Ngân hàng TMCP Quốc Dân", "short_name": "NCB", "code": "NVB", "bin": "970419"},
                {"name": "Ngân hàng TMCP Việt Á", "short_name": "VietABank", "code": "VAB", "bin": "970427"},
            ]
            
            for b in banks_data:
                db.add(Bank(**b))
            db.commit()
            print(f"   ✅ Added {len(banks_data)} banks")
        else:
            print("✅ Banks already seeded")
            
        # 2. Seed SystemSettings
        if db.query(SystemSettings).count() == 0:
            print("🌱 Seeding Default Settings...")
            # Try to link to MB or VCB if exists
            mb = db.query(Bank).filter(Bank.code == "MB").first()
            default_bank_id = mb.id if mb else 1
            
            settings = SystemSettings(
                bank_id=default_bank_id,
                bank_account_no="0000000000",
                bank_account_name="CREDIT ADMIN",
                site_name="Credit App"
            )
            db.add(settings)
            db.commit()
            print("   ✅ Added default system settings")
        else:
            print("✅ System Settings already initialized")
            
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


def create_default_admin():
    """
    Check if admin user exists, if not create one.
    Default admin credentials:
    - Email: admin@example.com
    - Password: admin123
    - Phone: 0000000000
    """
    from app.models.user import User
    from app.core.security import hash_password
    
    db = SessionLocal()
    try:
        # Check if any admin user exists
        admin_user = db.query(User).filter(User.role == "admin").first()
        
        if admin_user:
            print(f"✅ Admin user already exists: {admin_user.email}")
            return
        
        # Get admin credentials from environment or use defaults
        admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        admin_phone = os.getenv("ADMIN_PHONE", "0000000000")
        admin_name = os.getenv("ADMIN_NAME", "Administrator")
        
        # Create default admin user
        hashed_password = hash_password(admin_password)
        
        default_admin = User(
            ho_ten=admin_name,
            so_dien_thoai=admin_phone,
            email=admin_email,
            password_hash=hashed_password,
            role="admin",
            is_active=True
        )
        
        db.add(default_admin)
        db.commit()
        db.refresh(default_admin)
        
        print(f"✅ Created default admin user:")
        print(f"   📧 Email: {admin_email}")
        print(f"   🔑 Password: {admin_password}")
        print(f"   📱 Phone: {admin_phone}")
        print(f"   ⚠️  Please change the password after first login!")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()


def main():
    """Main initialization function"""
    print("="*60)
    print("🗄️  Database Initialization")
    print("="*60)
    print(f"\nDatabase location: {POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}\n")
    
    # Check if tables exist
    if check_tables_exist():
        print("⚠️  Warning: Tables already exist!")
        # In Docker environment, skip recreation by default
        if os.getenv('ENVIRONMENT') == 'local' or os.getenv('RECREATE_DB', '').lower() == 'true':
            print("Recreating tables...")
            # Drop existing tables
            from app.core.database import drop_db
            drop_db()
            print()
        else:
            print("Skipping table recreation in Docker environment")
            return
    
    # Create tables
    init_db()
    update_db()
    
    # Create default admin user if not exists
    create_default_admin()
    
    # Seed banks and settings
    seed_data()
    
    # Verify tables created
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"\n📊 Created {len(tables)} tables:")
    for table in tables:
        columns = inspector.get_columns(table)
        print(f"   - {table} ({len(columns)} columns)")
        for col in columns:
            print(f"      • {col['name']}: {col['type']}")
    
    print("\n" + "="*60)
    print("✅ Database initialization completed successfully!")
    print("="*60)
    print("\n💡 You can now start the API server:")
    print("   python main.py")
    print("   or")
    print("   uvicorn app.main:app --reload --port 8081")
    print()


if __name__ == "__main__":
    main()

