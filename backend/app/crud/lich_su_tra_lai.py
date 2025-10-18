"""
CRUD operations for LichSuTraLai
"""
from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from typing import List, Optional

from app.core.enums import TrangThaiThanhToan, TrangThaiNgayThanhToan
from app.models.lich_su_tra_lai import LichSuTraLai
from app.models.tin_chap import TinChap
from app.models.tra_gop import TraGop
from app.schemas.lich_su_tra_lai import LichSuTraLaiCreate, LichSuTraLaiUpdate


def get_lich_su(db: Session, stt: int) -> Optional[LichSuTraLai]:
    """
    Get a payment history record by STT
    
    Args:
        db: Database session
        stt: Record ID
        
    Returns:
        LichSuTraLai object or None if not found
    """
    return db.query(LichSuTraLai).filter(LichSuTraLai.Stt == stt).first()


def get_lich_sus(db: Session, skip: int = 0, limit: int = 100) -> List[LichSuTraLai]:
    """
    Get all payment history records with pagination
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        
    Returns:
        List of LichSuTraLai objects
    """
    return db.query(LichSuTraLai).offset(skip).limit(limit).all()


def get_lich_sus_by_contract(db: Session, ma_hd: str) -> List[LichSuTraLai]:
    """
    Get payment history records by contract ID
    
    Args:
        db: Database session
        ma_hd: Contract ID
        
    Returns:
        List of LichSuTraLai objects
    """
    return db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).all()


def create_lich_su(db: Session, ma_hd: str) -> dict:
    """
    Tạo các bản ghi lịch sử trả lãi dựa trên thông tin hợp đồng
    
    Logic:
    - Tín Chấp (TC): Mỗi kỳ trả = LaiSuat (chỉ trả lãi)
    - Trả Góp (TG): Mỗi kỳ trả = (SoTienVay + LaiSuat) / SoLanTra (trả cả gốc và lãi)
    - KyDong: Số ngày giữa các kỳ thanh toán
    - Trả Góp: Tạo đủ số kỳ theo SoLanTra, mỗi kỳ trả số tiền cố định
    - Tín Chấp: Tạo kỳ từ NgayVay đến hôm nay với logic cộng dồn
    
    Args:
        db: Database session
        ma_hd: Mã hợp đồng (TCXXX hoặc TGXXX)
        
    Returns:
        dict: Thông tin thành công với số bản ghi đã tạo
    """
    try:
        # 0. Kiểm tra nếu hợp đồng đã tồn tại trong bảng lịch sử trả lãi
        if db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).first():
            return {
                "success": True,
                "message": "Hợp đồng đã tồn tại trong bảng lịch sử trả lãi",
                "records_created": 0
            }
        # 1. Xác định loại hợp đồng và lấy dữ liệu
        loai_hop_dong = ""
        data_hop_dong = None
        
        if "TG" in ma_hd:
            loai_hop_dong = "TG"
            data_hop_dong = db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()
        elif "TC" in ma_hd:
            loai_hop_dong = "TC"
            data_hop_dong = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
        else:
            raise HTTPException(status_code=400, detail=f"Mã hợp đồng không hợp lệ: {ma_hd}")
        
        if not data_hop_dong:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy hợp đồng {ma_hd}")
        
        # 2. Lấy thông tin từ hợp đồng
        ngay_vay = data_hop_dong.NgayVay
        ky_dong = data_hop_dong.KyDong  # Số ngày giữa các kỳ
        lai_suat = data_hop_dong.LaiSuat
        date_now = date.today()
        
        # 3. Kiểm tra nếu NgayVay = hôm nay → không tạo gì
        if ngay_vay >= date_now:
            return {
                "success": True,
                "message": "Ngày vay chưa đến hoặc là hôm nay, không cần tạo lịch sử",
                "records_created": 0
            }
        
        # 4. Tính số tiền mỗi kỳ dựa trên loại hợp đồng
        so_tien_moi_ky = 0
        if loai_hop_dong == "TC":
            # Tín Chấp: Mỗi kỳ chỉ trả lãi
            so_tien_moi_ky = lai_suat
        elif loai_hop_dong == "TG":
            # Trả Góp: Mỗi kỳ trả = (Gốc + Lãi) / Số lần trả
            so_tien_vay = data_hop_dong.SoTienVay
            so_lan_tra = data_hop_dong.SoLanTra
            if so_lan_tra <= 0:
                raise HTTPException(status_code=400, detail="SoLanTra phải lớn hơn 0")
            so_tien_moi_ky = (so_tien_vay + lai_suat) // so_lan_tra  # Làm tròn xuống
        
        # 5. Tạo danh sách kỳ thanh toán
        danh_sach_ky = []
        
        if loai_hop_dong == "TG":
            # Trả Góp: Tạo đủ số kỳ theo SoLanTra
            so_lan_tra = data_hop_dong.SoLanTra
            ngay_ky_hien_tai = ngay_vay + timedelta(days=ky_dong)  # Kỳ đầu tiên
            
            for ky_thu in range(1, so_lan_tra + 1):
                danh_sach_ky.append({
                    "ngay": ngay_ky_hien_tai,
                    "ky_thu": ky_thu,
                    "so_tien_ky": so_tien_moi_ky
                })
                ngay_ky_hien_tai += timedelta(days=ky_dong)
        else:
            # Tín Chấp: Tạo kỳ từ NgayVay đến hôm nay (logic cũ)
            ngay_ky_hien_tai = ngay_vay + timedelta(days=ky_dong)  # Kỳ đầu tiên
            ky_thu = 1
            
            while ngay_ky_hien_tai <= date_now:
                danh_sach_ky.append({
                    "ngay": ngay_ky_hien_tai,
                    "ky_thu": ky_thu,
                    "so_tien_ky": so_tien_moi_ky
                })
                ngay_ky_hien_tai += timedelta(days=ky_dong)
                ky_thu += 1
        
        # 6. Nếu không có kỳ nào
        if len(danh_sach_ky) == 0:
            return {
                "success": True,
                "message": "Chưa đến kỳ thanh toán đầu tiên",
                "records_created": 0
            }
        
        # 7. Tạo các bản ghi lịch sử
        so_ky = len(danh_sach_ky)
        
        for idx, ky in enumerate(danh_sach_ky):
            # Xác định trạng thái ngày thanh toán dựa trên ngày kỳ
            if ky["ngay"] == date_now:
                trang_thai_ngay = TrangThaiNgayThanhToan.DEN_HAN.value
            elif ky["ngay"] < date_now:
                trang_thai_ngay = TrangThaiNgayThanhToan.QUA_HAN.value
            else:
                trang_thai_ngay = TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
            
            # Tính số tiền dựa trên loại hợp đồng và trạng thái
            if loai_hop_dong == "TG":
                # Trả Góp: Logic cộng dồn đặc biệt
                if ky["ngay"] < date_now:
                    # Các kỳ quá hạn: SoTien = 0
                    so_tien = 0
                elif ky["ngay"] == date_now:
                    # Kỳ hiện tại: SoTien = tổng cộng dồn của tất cả kỳ quá hạn + kỳ hiện tại
                    so_ky_qua_han = sum(1 for k in danh_sach_ky if k["ngay"] < date_now)
                    so_tien = so_tien_moi_ky * (so_ky_qua_han + 1)  # +1 cho kỳ hiện tại
                else:
                    # Các kỳ chưa đến hạn: SoTien = số tiền cố định
                    so_tien = so_tien_moi_ky
            else:
                # Tín Chấp: Logic cộng dồn (các kỳ cũ = 0, kỳ cuối = tổng cộng dồn)
                tong_tien_cong_don = so_tien_moi_ky * so_ky
                so_tien = 0 if idx < len(danh_sach_ky) - 1 else tong_tien_cong_don
                
            db_lich_su = LichSuTraLai(
                MaHD=ma_hd,
                Ngay=ky["ngay"],
                SoTien=so_tien,
                NoiDung=f"Trả lãi kỳ {ky['ky_thu']}",
                TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                TrangThaiNgayThanhToan=trang_thai_ngay,
                TienDaTra=0
            )
            db.add(db_lich_su)
        
        # 8. Commit vào database
        db.commit()
        
        return {
            "success": True,
            "message": f"Đã tạo {so_ky} bản ghi lịch sử trả lãi",
            "records_created": so_ky,
            "loai_hop_dong": loai_hop_dong,
            "so_tien_moi_ky": so_tien_moi_ky
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo lịch sử: {str(e)}")


def update_lich_su(db: Session, stt: int, lich_su_update: LichSuTraLaiUpdate) -> Optional[LichSuTraLai]:
    """
    Update a payment history record
    
    Args:
        db: Database session
        stt: Record ID
        lich_su_update: Update data
        
    Returns:
        Updated LichSuTraLai object or None if not found
    """
    db_lich_su = get_lich_su(db, stt)
    
    if not db_lich_su:
        return None
    
    update_data = lich_su_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_lich_su, key, value)
    
    db.commit()
    db.refresh(db_lich_su)
    
    return db_lich_su


def delete_lich_su(db: Session, stt: int) -> bool:
    """
    Delete a payment history record
    
    Args:
        db: Database session
        stt: Record ID
        
    Returns:
        True if deleted, False if not found
    """
    db_lich_su = get_lich_su(db, stt)
    
    if not db_lich_su:
        return False
    
    db.delete(db_lich_su)
    db.commit()
    
    return True


def count_lich_sus(db: Session) -> int:
    """
    Count total payment history records
    
    Args:
        db: Database session
        
    Returns:
        Total count
    """
    return db.query(LichSuTraLai).count()


def count_lich_sus_by_contract(db: Session, ma_hd: str) -> int:
    """
    Count payment history records for a specific contract
    
    Args:
        db: Database session
        ma_hd: Contract ID
        
    Returns:
        Count of records
    """
    return db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).count()


def delete_lich_sus_by_contract(db: Session, ma_hd: str) -> int:
    """
    Delete all payment history records for a specific contract
    
    Args:
        db: Database session
        ma_hd: Contract ID
        
    Returns:
        Number of records deleted
    """
    try:
        # Lấy tất cả bản ghi lịch sử của hợp đồng
        lich_sus = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).all()
        
        if not lich_sus:
            return 0
        
        # Đếm số bản ghi trước khi xóa
        so_ban_ghi = len(lich_sus)
        
        # Xóa tất cả bản ghi
        for lich_su in lich_sus:
            db.delete(lich_su)
        
        # Commit vào database
        db.commit()
        
        return so_ban_ghi
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa lịch sử trả lãi: {str(e)}")


def auto_create_lich_su(db: Session) -> dict:
    """
    Tự động cập nhật lịch sử trả lãi cho tất cả hợp đồng chưa thanh toán
    
    Logic:
    - Chỉ xử lý hợp đồng chưa có trạng thái "DA_TAT_TOAN"
    - Kiểm tra ngày hôm nay đã có trong bảng lịch_su_tra_lai chưa
    - Tín Chấp: Cộng dồn số tiền chưa trả vào kỳ mới, tạo bản ghi mới
    - Trả Góp: Cập nhật kỳ có ngày trùng với hôm nay, không tạo mới
    
    Returns:
        dict: Thông tin kết quả xử lý
    """
    try:
        date_now = date.today()
        # test với ngày 13/10/2025
        # date_now = date(2025, 10, 17)
        contracts_processed = 0
        records_created = 0
        records_updated = 0
        
        # 1. Lấy tất cả hợp đồng Tín Chấp chưa thanh toán
        tin_chap_contracts = db.execute(select(TinChap).where(TinChap.TrangThai != "DA_TAT_TOAN")).scalars().all()
        # 2. Lấy tất cả hợp đồng Trả Góp chưa thanh toán  
        tra_gop_contracts = db.execute(select(TraGop).where(TraGop.TrangThai != "DA_TAT_TOAN")).scalars().all()
        # 3. Xử lý Tín Chấp
        for contract in tin_chap_contracts:
            ma_hd = contract.MaHD
            # Kiểm tra hôm nay có phải là ngày đóng lãi không
            ky_dong = contract.KyDong
            if (date_now.day - contract.NgayVay.day) % ky_dong != 0:
                print(ma_hd)
                continue
            
            # Kiểm tra đã có lịch sử cho ngày hôm nay chưa
            existing_today = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.Ngay == date_now
            ).first()
            
            if existing_today:
                continue  # Đã có lịch sử cho hôm nay, bỏ qua
            
            # Tính số tiền cộng dồn từ tất cả các kỳ chưa trả
            tong_tien_chua_tra = 0
            lich_sus_chua_tra = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.SoTien > LichSuTraLai.TienDaTra,
                LichSuTraLai.SoTien != 0
            ).all()
            
            # Cập nhật tất cả các kỳ cũ: SoTien = 0, TrangThaiNgayThanhToan = QUA_HAN
            for ls in lich_sus_chua_tra:
                tong_tien_chua_tra += (ls.SoTien - ls.TienDaTra)
                ls.SoTien = 0
                ls.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.QUA_HAN.value
                # Cập nhật NoiDung để bỏ phần cộng dồn
                if "kỳ" in ls.NoiDung:
                    ky_so = ls.NoiDung.split("kỳ ")[1].split(" ")[0]
                    ls.NoiDung = f"Trả lãi kỳ {ky_so}"


            # Tạo bản ghi mới cho hôm nay
            so_tien_ky_moi = contract.LaiSuat + tong_tien_chua_tra
            
            db_lich_su = LichSuTraLai(
                MaHD=ma_hd,
                Ngay=date_now,
                SoTien=so_tien_ky_moi,
                NoiDung=f"Trả lãi kỳ {len(lich_sus_chua_tra) + 1} (cộng dồn {tong_tien_chua_tra})",
                TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                TrangThaiNgayThanhToan=TrangThaiNgayThanhToan.DEN_HAN.value,
                TienDaTra=0
            )
            db.add(db_lich_su)
            records_created += 1
        
        # 4. Xử lý Trả Góp
        for contract in tra_gop_contracts:
            ma_hd = contract.MaHD
            ky_dong = contract.KyDong
            
            # Kiểm tra ngày hôm nay có phải là ngày đóng lãi không
            check_ngay_dong_lai = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.Ngay == date_now
            ).first()
            print(check_ngay_dong_lai)
            if not check_ngay_dong_lai:
                continue
                
            # Tìm kỳ có trạng thái "Đến hạn trả lãi" (kỳ cần cập nhật)
            latest_ky = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.Ngay == date_now-timedelta(days=ky_dong)
            ).first()
            
            if not latest_ky:
                continue
                
            # Lưu số tiền gốc trước khi đặt = 0
            so_tien_goc = latest_ky.SoTien
            tong_tien_chua_tra = so_tien_goc - latest_ky.TienDaTra
            
            # Cập nhật kỳ cũ: SoTien = 0, TrangThaiNgayThanhToan = QUA_HAN
            latest_ky.SoTien = 0
            latest_ky.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.QUA_HAN.value
            
            # Cập nhật kỳ hôm nay với số tiền cộng dồn
            so_tien_moi_ky = (contract.SoTienVay + contract.LaiSuat) // contract.SoLanTra
            check_ngay_dong_lai.SoTien = so_tien_moi_ky + tong_tien_chua_tra
            check_ngay_dong_lai.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.DEN_HAN.value
            
            # Cập nhật NoiDung
            if "kỳ" in latest_ky.NoiDung:
                ky_so = int(latest_ky.NoiDung.split('kỳ ')[1].split(' ')[0]) + 1
                check_ngay_dong_lai.NoiDung = f"Trả lãi kỳ {ky_so} (cộng dồn {tong_tien_chua_tra})"
            
            records_updated += 1
        
        # 4.1. Xử lý Trả Góp - Tạo kỳ mới khi quá hạn
        for contract in tra_gop_contracts:
            ma_hd = contract.MaHD
            # Kiểm tra hôm nay có phải là ngày đóng lãi không
            ky_dong = contract.KyDong
            if (date_now.day - contract.NgayVay.day) % ky_dong != 0:
                print(ma_hd)
                continue
            
            # Kiểm tra đã có lịch sử cho ngày hôm nay chưa
            existing_today = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.Ngay == date_now
            ).first()
            
            if existing_today:
                continue  # Đã có lịch sử cho hôm nay, bỏ qua
            
            # Tính số tiền cộng dồn từ tất cả các kỳ chưa trả
            tong_tien_chua_tra = 0
            lich_sus_chua_tra = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.SoTien > LichSuTraLai.TienDaTra,
                LichSuTraLai.SoTien != 0
            ).all()
            
            # Cập nhật tất cả các kỳ cũ: SoTien = 0, TrangThaiNgayThanhToan = QUA_HAN
            for ls in lich_sus_chua_tra:
                # Tính số tiền chưa trả TRƯỚC KHI set SoTien = 0
                so_tien_chua_tra = ls.SoTien - ls.TienDaTra
                if so_tien_chua_tra > 0:  # Chỉ cộng dồn nếu thực sự chưa trả đủ
                    tong_tien_chua_tra += so_tien_chua_tra
                # Sau đó mới set SoTien = 0
                ls.SoTien = 0
                ls.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.QUA_HAN.value
                # Cập nhật NoiDung để bỏ phần cộng dồn
                if "kỳ" in ls.NoiDung:
                    ky_so = ls.NoiDung.split("kỳ ")[1].split(" ")[0]
                    ls.NoiDung = f"Trả lãi kỳ {ky_so}"

            # Tạo bản ghi mới cho hôm nay
            so_tien_ky_moi = so_tien_chua_tra
            
            db_lich_su = LichSuTraLai(
                MaHD=ma_hd,
                Ngay=date_now,
                SoTien=so_tien_ky_moi,
                NoiDung=f"Trả lãi kỳ {len(lich_sus_chua_tra) + 1} (cộng dồn {tong_tien_chua_tra})",
                TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                TrangThaiNgayThanhToan=TrangThaiNgayThanhToan.DEN_HAN.value,
                TienDaTra=0
            )
            db.add(db_lich_su)
            records_created += 1
        
        # 5. Commit tất cả thay đổi
        db.commit()
        contracts_processed = len(tin_chap_contracts) + len(tra_gop_contracts)
        
        return {
            "success": True,
            "message": f"Đã xử lý {contracts_processed} hợp đồng",
            "contracts_processed": contracts_processed,
            "records_created": records_created,
            "records_updated": records_updated
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi tự động cập nhật lịch sử: {str(e)}")

def pay_lich_su(db: Session, stt: int, so_tien: int) -> dict:
    """
    Thanh toán lịch sử trả lãi theo chuẩn logic:
    - Chỉ cho phép thanh toán kỳ "Đến hạn" (DEN_HAN)
    - Không cho phép trả vượt quá số tiền còn lại của kỳ
    - Cập nhật trạng thái kỳ: DONG_DU hoặc THANH_TOAN_MOT_PHAN
    - Cập nhật trạng thái HĐ: nếu còn kỳ chưa trả đủ => THANH_TOAN_MOT_PHAN; nếu tất cả đã đủ => DA_TAT_TOAN
    """
    if so_tien <= 0:
        raise HTTPException(status_code=400, detail="Số tiền thanh toán phải > 0")

    db_lich_su = get_lich_su(db, stt)
    if not db_lich_su:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi lịch sử")
    if db_lich_su.TrangThaiNgayThanhToan != TrangThaiNgayThanhToan.DEN_HAN.value:
        raise HTTPException(status_code=400, detail="Chỉ được thanh toán kỳ đến hạn")

    con_lai_ky = max(0, db_lich_su.SoTien - db_lich_su.TienDaTra)
    if con_lai_ky == 0:
        raise HTTPException(status_code=400, detail="Kỳ này đã thanh toán đủ")

    thanh_toan_thuc_te = min(so_tien, con_lai_ky)
    db_lich_su.TienDaTra += thanh_toan_thuc_te
    if db_lich_su.TienDaTra >= db_lich_su.SoTien:
        db_lich_su.TrangThaiThanhToan = TrangThaiThanhToan.DONG_DU.value
    else:
        db_lich_su.TrangThaiThanhToan = TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value

    ma_hd = db_lich_su.MaHD
    # Cập nhật trạng thái hợp đồng dựa trên tổng còn nợ trong lịch sử
    any_unpaid = db.query(LichSuTraLai).filter(
        LichSuTraLai.MaHD == ma_hd,
        LichSuTraLai.SoTien > LichSuTraLai.TienDaTra
    ).first() is not None

    if "TG" in ma_hd:
        contract = db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()
    else:
        contract = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()

    if contract:
        contract.TrangThai = (
            TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value if any_unpaid else TrangThaiThanhToan.DA_TAT_TOAN.value
        )

    db.commit()

    return {
        "success": True,
        "ma_hd": ma_hd,
        "stt": stt,
        "da_thanh_toan": thanh_toan_thuc_te,
        "so_tien_da_tra_ky": db_lich_su.TienDaTra,
        "so_tien_ky": db_lich_su.SoTien,
        "trang_thai_thanh_toan_ky": db_lich_su.TrangThaiThanhToan,
        "trang_thai_hop_dong": contract.TrangThai if contract else None,
    }


def tat_toan_hop_dong(db: Session, ma_hd: str) -> dict:
    """
    Tất toán hợp đồng cho cả Trả Góp và Tín Chấp.
    - Đặt trạng thái hợp đồng => DA_TAT_TOAN
    - Cập nhật tất cả lịch sử trả lãi liên quan:
        + Nếu TrangThaiNgayThanhToan != Quá hạn => đánh Đóng đủ và điền đủ số tiền
    """
    # 1. Xác định loại hợp đồng
    contract = None
    loai = None
    if "TG" in ma_hd:
        loai = "TG"
        contract = db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()
    elif "TC" in ma_hd:
        loai = "TC"
        contract = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
    else:
        raise HTTPException(status_code=400, detail=f"Mã hợp đồng không hợp lệ: {ma_hd}")

    if not contract:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy hợp đồng {ma_hd}")

    # 2. Cập nhật trạng thái hợp đồng
    contract.TrangThai = TrangThaiThanhToan.DA_TAT_TOAN.value

    # 3. Cập nhật lịch sử liên quan
    lich_sus = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).all()
    updated = 0
    for ls in lich_sus:
        # Chỉ đóng đủ cho các kỳ không phải quá hạn
        if ls.TrangThaiNgayThanhToan != TrangThaiNgayThanhToan.QUA_HAN.value:
            if ls.TienDaTra < ls.SoTien:
                ls.TienDaTra = ls.SoTien
            ls.TrangThaiThanhToan = TrangThaiThanhToan.DONG_DU.value
            updated += 1

    db.commit()

    return {
        "success": True,
        "message": f"Tất toán hợp đồng {ma_hd} thành công",
        "loai": loai,
        "histories_updated": updated
    }