"""
CRUD operations for LichSuTraLai
"""
from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func
from typing import List, Optional

from app.core.enums import TrangThaiThanhToan, TrangThaiNgayThanhToan
from app.models.lich_su_tra_lai import LichSuTraLai
from app.models.tin_chap import TinChap
from app.models.tra_gop import TraGop
from app.schemas.lich_su_tra_lai import LichSuTraLaiCreate, LichSuTraLaiUpdate

from app.utils.lich_su import create_lich_su as create_lich_su_utils, delete_lich_su as delete_lich_su_utils
from app.models.lich_su import LichSu

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

        # 3. Tính số tiền mỗi kỳ dựa trên loại hợp đồng
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
        
        # 4. Tạo danh sách kỳ thanh toán
        danh_sach_ky = []
        
        if loai_hop_dong == "TG":
            # Trả Góp: Tạo đủ số kỳ theo SoLanTra
            so_lan_tra = data_hop_dong.SoLanTra
            # Nếu có nhiều kỳ (N > 1) thì theo yêu cầu, kỳ đầu tiên = date_now + (N-1) days
            # (ví dụ N=3 -> ngày đầu = today + 2 days)
            if ky_dong and ky_dong > 1:
                ngay_ky_hien_tai = ngay_vay + timedelta(days=(ky_dong - 1))
            elif ky_dong == 1 :
                ngay_ky_hien_tai = ngay_vay

            for ky_thu in range(0, so_lan_tra):
                ky_thu += 1
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
            if ngay_vay == date_now and ky_dong == 1:
                danh_sach_ky.append({
                    "ngay": ngay_vay,
                    "ky_thu": ky_thu,
                    "so_tien_ky": so_tien_moi_ky
                })
                ky_thu += 1
                

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
        end_date = danh_sach_ky[-1]["ngay"]
        
        for idx, ky in enumerate(danh_sach_ky):
            # Xác định trạng thái ngày thanh toán dựa trên ngày kỳ
            if loai_hop_dong == "TG" and end_date < date_now:
                # Trả Góp: Nếu ngày cuối cùng đã quá hạn, tất cả các kỳ đều QUA_HAN
                trang_thai_ngay = TrangThaiNgayThanhToan.QUA_HAN.value
                sua_lich_su = False
            elif ky["ngay"] == date_now:
                trang_thai_ngay = TrangThaiNgayThanhToan.DEN_HAN.value
                sua_lich_su = True
            elif ky["ngay"] < date_now:
                trang_thai_ngay = TrangThaiNgayThanhToan.QUA_HAN.value
                sua_lich_su = False
            else:
                trang_thai_ngay = TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                sua_lich_su = False
            
            # Tính số tiền dựa trên loại hợp đồng và trạng thái
            if loai_hop_dong == "TG":
                # Trả Góp: Logic cộng dồn đặc biệt
                if end_date < date_now:
                    # Nếu ngày cuối cùng đã quá hạn:
                    # - Các kỳ trước kỳ cuối: SoTien = 0
                    # - Kỳ cuối cùng: SoTien = tổng cộng dồn tất cả các kỳ
                    if idx < len(danh_sach_ky) - 1:
                        so_tien = 0
                    else:
                        # Kỳ cuối cùng: cộng dồn tất cả
                        so_tien = so_tien_moi_ky * so_ky
                elif ky["ngay"] < date_now:
                    # Các kỳ quá hạn: SoTien = 0
                    so_tien = 0
                elif ky["ngay"] == date_now:
                    # Kỳ hiện tại: SoTien = tổng cộng dồn của tất cả kỳ quá hạn + kỳ hiện tại
                    so_ky_qua_han = sum(1 for k in danh_sach_ky if k["ngay"] < date_now)
                    so_tien = so_tien_moi_ky * (so_ky_qua_han + 1)  # +1 cho kỳ hiện tại
                else:
                    # Các kỳ chưa đến hạn: SoTien = số tiền cố định
                    # so_tien = so_tien_moi_ky
                    so_ky_qua_han = sum(1 for k in danh_sach_ky if k["ngay"] < date_now)
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
                TienDaTra=0,
                ThanhToan=False,
                SuaLichSu=sua_lich_su
            )
            db.add(db_lich_su)
        # 8. Commit vào database
        db.commit()
        # 9. Tự động tạo lịch sử trả lãi cho hôm nay nếu đến hạn
        if end_date < date_now and loai_hop_dong == "TG":
            auto_create_lich_su(db)
            
        # 10. Trả về kết quả
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

def get_prefix_noi_dung(noi_dung: str, ky_so: int) -> str:
    """
    Lấy phần prefix 'Trả lãi kỳ X (cộng dồn ...)' từ NoiDung cũ.
    Nếu không có thì fallback về 'Trả lãi kỳ {ky_so}'.
    """
    if not noi_dung:
        return f"Trả lãi kỳ {ky_so}"
    # Lấy phần trước dấu | nếu có
    # prefix = noi_dung.split("|")[0].strip()
    # lich_su_today.NoiDung = lich_su_today.NoiDung.split("|")[0].strip()  # Giữ lại phần trước dấu '|'
    parts = [p.strip() for p in noi_dung.split("|")]
    if len(parts) > 1:
        prefix = " | ".join(parts[:-1]).strip()
    else:
        prefix = ""
    if not prefix:
        prefix = f"Trả lãi kỳ {ky_so}"
    return prefix


def format_amount(amount: Optional[int]) -> str:
    """
    Làm tròn số tiền đến hàng nghìn và format với dấu phân cách.
    """
    normalized = amount or 0
    sign = 1 if normalized >= 0 else -1
    rounded = int(((abs(normalized) + 500) // 1000) * 1000 * sign)
    return f"{rounded:,}"

def check_tat_toan_hop_dong(db: Session, ma_hd: str) -> bool:
    """
    Kiểm tra xem hợp đồng có tất toán không
    """
    if "TC" in ma_hd:
        return False
    contract = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy hợp đồng {ma_hd}")
    so_tien_tra = contract.SoTienTraGoc + contract.LaiSuat
    lich_su_tra_lai = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).all()
    tong_da_tra = sum(ls.TienDaTra for ls in lich_su_tra_lai)
    if tong_da_tra >= so_tien_tra:
        contract.TrangThai = TrangThaiThanhToan.DA_TAT_TOAN.value
        db.commit()
        return True
    else:
        return False
    
    

def update_lich_su(db: Session, ma_hd: str, tien_da_tra: int = 0):
    """
    Update a payment history record
    
    Args:
        db: Database session
        ma_hd: Contract ID
        tien_da_tra: Amount paid
        
    Returns:
        dict: Thông tin thành công với số bản ghi đã cập nhật
    """
    db_lich_su = get_lich_sus_by_contract(db, ma_hd=ma_hd)
    
    if len(db_lich_su) == 0:
        return None
    
    # lich_sus_by_contract_today = sorted([ls for ls in db_lich_su if ls.Ngay >= date.today()], key=lambda x: x.Ngay)
    
    so_tien_con_lai_de_phan_bo = tien_da_tra
    tong_da_thanh_toan = 0
    is_first_period = True  

    if "TC" in ma_hd:
        contract = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
        if not contract:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy hợp đồng {ma_hd}")

        daily_interest = contract.LaiSuat or 0
        ky_dong_days = contract.KyDong or 1
        if ky_dong_days == 1:
            current_date = date.today()
        else:
            current_date = date.today() + timedelta(days=(ky_dong_days - 1))
        # Lấy ra kì thanh toán gần nhất
        last_period = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd, LichSuTraLai.Ngay == (date.today())).first()
        noi_dung_last_period = last_period.NoiDung if last_period else None
        if last_period:
            if "cộng dồn" in last_period.NoiDung:
                ky_so = int(last_period.NoiDung.split("lãi kỳ ")[1].split(" ")[0])
            else:
                ky_so = int(last_period.NoiDung.split("lãi kỳ ")[1].split("|")[0])
        else:
            ky_so = 1
        # Xóa lịch sử của hợp đồng từ ngày hôm nay đến hết
        db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd, LichSuTraLai.Ngay >= date.today()).delete(synchronize_session=False)
        db.commit()

        while so_tien_con_lai_de_phan_bo > 0:
            # Tìm hoặc tạo bản ghi cho current_date
            period = (
                db.query(LichSuTraLai)
                .filter(LichSuTraLai.MaHD == ma_hd, LichSuTraLai.Ngay == current_date)
                .first()
            )
            if not period:
                if is_first_period:
                    # Kỳ đầu tiên: ghi tổng số tiền thanh toán
                    noi_dung = f"{get_prefix_noi_dung(noi_dung_last_period, ky_so)} |Sửa số tiền thanh toán: {format_amount(tien_da_tra)} VNĐ"
                    period = LichSuTraLai(
                        MaHD=ma_hd,
                        Ngay=current_date,
                        SoTien=daily_interest,
                        NoiDung=noi_dung,
                        TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                        TrangThaiNgayThanhToan=(
                            TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                            if current_date > date.today()
                            else (
                                TrangThaiNgayThanhToan.DEN_HAN.value
                                if current_date == date.today()
                                else TrangThaiNgayThanhToan.QUA_HAN.value
                            )
                        ),
                        TienDaTra=0,
                        ThanhToan=True,
                        SuaLichSu=True
                    )
                else:
                    # Các kỳ sau: chỉ ghi lãi đã được trả
                    period = LichSuTraLai(
                        MaHD=ma_hd,
                        Ngay=current_date,
                        SoTien=daily_interest,
                        NoiDung=f"Trả lãi kỳ {ky_so} |Lãi đã được trả vào ngày {date.today().isoformat()}",
                        TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                        TrangThaiNgayThanhToan=(
                            TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                            if current_date > date.today()
                            else (
                                TrangThaiNgayThanhToan.DEN_HAN.value
                                if current_date == date.today()
                                else TrangThaiNgayThanhToan.QUA_HAN.value
                            )
                        ),
                        TienDaTra=0,
                        ThanhToan=False,
                        SuaLichSu=False
                    )
                db.add(period)
            
            con_lai_ky = max(0, period.SoTien - period.TienDaTra)
            if con_lai_ky > 0:
                nop_vao_ky = min(so_tien_con_lai_de_phan_bo, con_lai_ky)
                period.TienDaTra += nop_vao_ky
                tong_da_thanh_toan += nop_vao_ky
                so_tien_con_lai_de_phan_bo -= nop_vao_ky

                period.TrangThaiThanhToan = (
                    TrangThaiThanhToan.DONG_DU.value
                    if period.TienDaTra >= period.SoTien
                    else TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
                )
                period.ThanhToan = True
                period.SuaLichSu = True
                
                if not is_first_period:
                    # Các kỳ sau: cộng dồn nội dung thanh toán
                    # if "Số tiền thanh toán" in period.NoiDung:
                    #     # Đã có ghi chú thanh toán trước đó, cộng dồn
                    #     period.NoiDung += f" + {nop_vao_ky:,} VNĐ"
                    # else:
                        # Chưa có ghi chú thanh toán, tạo mới
                    period.NoiDung = f"Trả lãi kỳ {ky_so} |Lãi đã được trả vào ngày {date.today().isoformat()}"
                    period.ThanhToan = False
                    period.SuaLichSu = False

            # Nếu kỳ đã đóng đủ thì tiến sang ngày kế tiếp theo KyDong
            if period.TienDaTra >= period.SoTien or con_lai_ky == 0:
                current_date = current_date + timedelta(days=ky_dong_days)
                ky_so += 1  # Increment period number for next iteration
                is_first_period = False  # After first period, mark as not first
            else:
                # Không đủ để đóng đủ kỳ hiện tại thì dừng
                break
        contract.TrangThai = TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value

    elif "TG" in ma_hd:
        contract = db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()
        if not contract:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy hợp đồng {ma_hd}")
        daily_interest = contract.LaiSuat or 0
        ky_dong_days = contract.KyDong or 1
        if ky_dong_days == 1:
            current_date = date.today()
        else:
            current_date = date.today() + timedelta(days=(ky_dong_days - 1))
        # Lấy ra kì thanh toán gần nhất
        last_period = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd, LichSuTraLai.Ngay == date.today()).first()
        noi_dung_last_period = last_period.NoiDung if last_period else None
        if last_period:
            if "cộng dồn" in last_period.NoiDung:
                ky_so = int(last_period.NoiDung.split("lãi kỳ ")[1].split(" ")[0]) +1
            else:
                ky_so = int(last_period.NoiDung.split("lãi kỳ ")[1].split("|")[0]) +1
        else:
            ky_so = 1
        # Lấy LichSuTraLai của hợp đồng từ ngày hôm nay đến hết
        lich_su_tra_lai = sorted(db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd, LichSuTraLai.Ngay >= date.today()).all(), key=lambda x: x.Ngay)
        if len(lich_su_tra_lai) == 0:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy lịch sử trả lãi của hợp đồng {ma_hd}")
        for ls in lich_su_tra_lai:
            ls.TienDaTra = 0
            if ls.Ngay == date.today():
                ls.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.DEN_HAN.value
                ls.TrangThaiThanhToan = TrangThaiThanhToan.CHUA_THANH_TOAN.value
                ls.ThanhToan = True
                ls.SuaLichSu = True
            else:
                ls.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                ls.TrangThaiThanhToan = TrangThaiThanhToan.CHUA_THANH_TOAN.value
                ls.ThanhToan = False
                ls.SuaLichSu = False
            # ls.NoiDung = f""
            db.commit()

        for db_lich_su_cong_don_lai in lich_su_tra_lai:
            if so_tien_con_lai_de_phan_bo <= 0:
                continue

            # if "Số tiền thanh toán" in db_lich_su_cong_don_lai.NoiDung:
                # if date.today().isoformat() in db_lich_su_cong_don_lai.NoiDung:
                #     db_lich_su_cong_don_lai.NoiDung += f" + {tien_da_tra:,} VNĐ"
                # else:
            
            # else:
            #     if is_first_period != False:
            #         db_lich_su_cong_don_lai.NoiDung = f"| Số tiền thanh toán: {tien_da_tra:,} VNĐ"

            con_lai_ky = max(0, db_lich_su_cong_don_lai.SoTien - db_lich_su_cong_don_lai.TienDaTra)
            if con_lai_ky <= 0:
                continue

            nop_vao_ky = min(so_tien_con_lai_de_phan_bo, con_lai_ky)
            db_lich_su_cong_don_lai.TienDaTra += nop_vao_ky
            tong_da_thanh_toan += nop_vao_ky
            so_tien_con_lai_de_phan_bo -= nop_vao_ky
            db_lich_su_cong_don_lai.NoiDung = f"{get_prefix_noi_dung(noi_dung_last_period, ky_so)} |Sửa số tiền thanh toán: {format_amount(tien_da_tra)} VNĐ"

            # Cập nhật trạng thái thanh toán kỳ
            if db_lich_su_cong_don_lai.TienDaTra >= db_lich_su_cong_don_lai.SoTien:
                db_lich_su_cong_don_lai.TrangThaiThanhToan = TrangThaiThanhToan.DONG_DU.value
            else:
                db_lich_su_cong_don_lai.TrangThaiThanhToan = TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
            
            # Cộng dồn nội dung thanh toán cho Trả Góp
            if is_first_period:
                # Kỳ đầu tiên: không cần cập nhật vì đã cập nhật ở trên
                is_first_period = False
            else:
                # Các kỳ sau: cộng dồn nội dung thanh toán
                noi_dung_lai = f"Trả lãi kỳ {ky_so} |Lãi đã được trả vào ngày {date.today().isoformat()}"
                # if "Số tiền thanh toán" in db_lich_su_cong_don_lai.NoiDung:
                    # Đã có ghi chú thanh toán trước đó, cộng dồn
                    # db_lich_su_cong_don_lai.NoiDung += f" + {nop_vao_ky:,} VNĐ"
                # else:
                    # Chưa có ghi chú thanh toán, tạo mới
                db_lich_su_cong_don_lai.NoiDung = f"{noi_dung_lai}"
            ky_so += 1
        


    # Tạo bản ghi lịch sử cho việc thanh toán (sau khi commit thành công)
    # check sua so tien exist in lich su
    exists_sua_so_tien = (
        db.query(LichSu)
        .filter(
            LichSu.ma_hd == ma_hd,
            LichSu.ngay == date.today(),
            LichSu.hanh_dong.like("%Sửa số tiền thanh toán%"),
        )
        .first()
    )
    

    if exists_sua_so_tien:
        exists_sua_so_tien.so_tien = tien_da_tra
        db.commit()
    else: 
        if "TC" in ma_hd:
            create_lich_su_utils(db, 
                ma_hd=ma_hd, 
                ho_ten=contract.HoTen, 
                ngay=date.today(), 
                so_tien=tien_da_tra, 
                hanh_dong="Sửa số tiền thanh toán lãi hợp đồng tín chấp", 
                loai_hop_dong="TC"
            )
        elif "TG" in ma_hd:
            create_lich_su_utils(db, 
                ma_hd=ma_hd, 
                ho_ten=contract.HoTen, 
                ngay=date.today(), 
                so_tien=tien_da_tra, 
                hanh_dong="Sửa số tiền thanh toán lãi hợp đồng trả góp", 
                loai_hop_dong="TG"
            )
        else:
            raise HTTPException(status_code=400, detail=f"Mã hợp đồng không hợp lệ: {ma_hd}")
        # check tat toan hop dong
        # tat_toan_hop_dong = check_tat_toan_hop_dong(db, ma_hd)
        # if tat_toan_hop_dong:
        #     if "TG" in ma_hd:
        #         create_lich_su_utils(db, 
        #             ma_hd=ma_hd, 
        #             ho_ten=contract.HoTen, 
        #             ngay=date.today(), 
        #             so_tien=tien_da_tra, 
        #             hanh_dong="Tất toán hợp đồng trả góp", 
        #             loai_hop_dong="TG"
        #         )

    return {
        "success": True,
        "ma_hd": ma_hd,
        "da_thanh_toan": tong_da_thanh_toan,
        "so_tien_con_du": tien_da_tra - tong_da_thanh_toan,
        "trang_thai_hop_dong": contract.TrangThai if contract else None,
    }


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
    
    delete_lich_su_utils(db, ma_hd=db_lich_su.MaHD)
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
        
        delete_lich_su_utils(db, ma_hd=ma_hd)
        
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


def update_lich_sus_by_contract(db: Session, ma_hd: str) -> int:
    """
    Delete all payment history records for a specific contract and update the contract
    
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
        
        # # Kiểm tra tổng số tiền đã thanh toán
        tong_so_tien = sum(lich_su.TienDaTra for lich_su in lich_sus)
        
        if tong_so_tien > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Không thể xóa lịch sử trả lãi vì đã có {tong_so_tien:,} VNĐ được thanh toán. Vui lòng hoàn tất thanh toán trước khi chỉnh sửa."
            )
        
        delete_lich_su_utils(db, ma_hd=ma_hd)
        
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
        # date_now = date(2025, 11, 6)
        contracts_processed = 0
        records_created = 0
        records_updated = 0
        
        tin_chap_contracts = db.execute(select(TinChap).where(TinChap.TrangThai != TrangThaiThanhToan.DA_TAT_TOAN.value)).scalars().all()
        tra_gop_contracts = db.execute(select(TraGop).where(TraGop.TrangThai != TrangThaiThanhToan.DA_TAT_TOAN.value)).scalars().all()
        # Xử lý Tín Chấp
        for contract in tin_chap_contracts:
            ma_hd = contract.MaHD
            # Chuẩn hóa trạng thái ngày cho TẤT CẢ bản ghi theo date_now
            all_records_tc = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).all()
            noi_dung_ki_so = db.query(LichSuTraLai.NoiDung).filter(LichSuTraLai.MaHD == ma_hd, LichSuTraLai.Ngay == date_now - timedelta(1)).first()
            if noi_dung_ki_so == None:
                continue
            ky_so = int(noi_dung_ki_so[0].split("lãi kỳ ")[1].split(" ")[0])
            
            ky_dong = contract.KyDong
            if ky_dong == 1:
                if (date_now.day - contract.NgayVay.day) % ky_dong != 0:
                    continue
            else:
                if (date_now.day - contract.NgayVay.day + 1) % ky_dong != 0:
                    continue
            for rec in all_records_tc:
                if rec.Ngay < date_now:
                    rec.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.QUA_HAN.value
                    rec.ThanhToan = False
                    rec.SuaLichSu = False
                elif rec.Ngay == date_now:
                    rec.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.DEN_HAN.value
                    rec.ThanhToan = False
                    rec.SuaLichSu = True
                else:
                    rec.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                    rec.ThanhToan = False
                    rec.SuaLichSu = False
            date_today_exists = any(rec.Ngay == date_now  for rec in all_records_tc)
            if date_today_exists:
                continue
            
            
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
                    ky_so = int(ls.NoiDung.split("lãi kỳ ")[1].split(" ")[0])
                    # ls.NoiDung = f"Trả lãi kỳ {ky_so}"

            # Cập nhật hoặc tạo bản ghi cho hôm nay với số tiền = lãi ngày + cộng dồn
            existing_today = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.Ngay == date_now
            ).first()

            so_tien_ky_moi = (contract.LaiSuat or 0) + tong_tien_chua_tra
            if existing_today:
                existing_today.SoTien = so_tien_ky_moi
                existing_today.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.DEN_HAN.value
                existing_today.SuaLichSu = True
                # Cập nhật NoiDung thể hiện cộng dồn
                existing_today.NoiDung = f"Trả lãi kỳ {ky_so + 1} (cộng dồn {format_amount(tong_tien_chua_tra)})"
                records_updated += 1
            else:
                db_lich_su = LichSuTraLai(
                    MaHD=ma_hd,
                    Ngay=date_now,
                    SoTien=so_tien_ky_moi,
                    NoiDung=f"Trả lãi kỳ {ky_so + 1} (cộng dồn {format_amount(tong_tien_chua_tra)})",
                    TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                    TrangThaiNgayThanhToan=TrangThaiNgayThanhToan.DEN_HAN.value,
                    SuaLichSu=True,
                    TienDaTra=0
                )
                db.add(db_lich_su)
                records_created += 1
        
        # Xử lý Trả Góp
        
        for contract in tra_gop_contracts:
            ma_hd = contract.MaHD
            ky_dong = contract.KyDong
            all_records_tg = (
                db.query(LichSuTraLai)
                .filter(LichSuTraLai.MaHD == ma_hd)
                .order_by(LichSuTraLai.Ngay.asc())
                .all()
            )

            end_date = all_records_tg[-1].Ngay
            if end_date >= date_now:
                # if "TG005" not in ma_hd:
                #     continue
                # Kiểm tra ngày hôm nay có phải là ngày đóng lãi không
                check_ngay_dong_lai = db.query(LichSuTraLai).filter(
                    LichSuTraLai.MaHD == ma_hd,
                    LichSuTraLai.Ngay == date_now,
                    # LichSuTraLai.SoTien != LichSuTraLai.TienDaTra
                ).first()
                if not check_ngay_dong_lai:
                    continue
                    
                # Tìm kỳ có trạng thái "Đến hạn trả lãi" (kỳ cần cập nhật)
                latest_ky = db.query(LichSuTraLai).filter(
                    LichSuTraLai.MaHD == ma_hd,
                    LichSuTraLai.Ngay == date_now-timedelta(days=ky_dong),
                    LichSuTraLai.SoTien != 0
                ).first()
                
                if not latest_ky:
                    continue
                for rec in all_records_tg:
                    if rec.Ngay < date_now:
                        rec.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.QUA_HAN.value
                        rec.SuaLichSu = False
                        rec.ThanhToan = False
                    elif rec.Ngay == date_now:
                        rec.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.DEN_HAN.value
                        rec.SuaLichSu = True
                        rec.ThanhToan = False
                    else:
                        rec.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                        rec.SuaLichSu = False
                        rec.ThanhToan = False
                
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
                check_ngay_dong_lai.SuaLichSu = True
                # Cập nhật NoiDung
                if "kỳ" in latest_ky.NoiDung:
                    ky_so = int(latest_ky.NoiDung.split('kỳ ')[1].split(' ')[0]) + 1
                    them_noi_dung = ''
                    if "Lãi đã được trả vào ngày" in check_ngay_dong_lai.NoiDung:
                        them_noi_dung = check_ngay_dong_lai.NoiDung.split('|')[-1]
                    check_ngay_dong_lai.NoiDung = f"Trả lãi kỳ {ky_so} (cộng dồn {format_amount(tong_tien_chua_tra)}) |{them_noi_dung}"
                
                records_updated += 1
            else:
                # Tính số tiền cộng dồn từ tất cả các kỳ chưa trả
                tong_tien_chua_tra = 0
                lich_sus_chua_tra = db.query(LichSuTraLai).filter(
                    LichSuTraLai.MaHD == ma_hd,
                    LichSuTraLai.SoTien > LichSuTraLai.TienDaTra,
                    LichSuTraLai.SoTien != 0
                ).all()
                so_tien_chua_tra = 0
                # Cập nhật tất cả các kỳ cũ: SoTien = 0, TrangThaiNgayThanhToan = QUA_HAN
                for ls in lich_sus_chua_tra:
                    # Tính số tiền chưa trả TRƯỚC KHI set SoTien = 0
                    so_tien_chua_tra = ls.SoTien - ls.TienDaTra
                    if so_tien_chua_tra > 0:  # Chỉ cộng dồn nếu thực sự chưa trả đủ
                        tong_tien_chua_tra += so_tien_chua_tra
                    # Sau đó mới set SoTien = 0
                    ls.SoTien = 0
                    ls.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.QUA_HAN.value
                    ls.NoiDung = f"Trả lãi kỳ {len(all_records_tg) + 1}".strip()
                so_tien_ky_moi = tong_tien_chua_tra
            
                db_lich_su = LichSuTraLai(
                    MaHD=ma_hd,
                    Ngay=date_now,
                    SoTien=so_tien_ky_moi,
                    NoiDung=f"Trả lãi kỳ {len(all_records_tg) + 1} (cộng dồn {format_amount(tong_tien_chua_tra)})",
                    TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                    TrangThaiNgayThanhToan=TrangThaiNgayThanhToan.DEN_HAN.value,
                    SuaLichSu=True,
                    TienDaTra=0
                )
                db.add(db_lich_su)
                records_created += 1
        
        # Commit tất cả thay đổi
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

    ma_hd = db_lich_su.MaHD

    so_tien_con_lai_de_phan_bo = so_tien
    tong_da_thanh_toan = 0

    if "TC" in ma_hd:
        # Tín Chấp: có thể chưa tồn tại bản ghi tương lai; tạo dần theo KyDong và phân bổ
        contract = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
        if not contract:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy hợp đồng {ma_hd}")

        current_date = db_lich_su.Ngay
        ky_dong_days = contract.KyDong or 1
        daily_interest = contract.LaiSuat or 0
        ky_so = 1  # Initialize period number
        is_first_period = True  # Track if this is the first period (selected period)

        # Cộng dồn nội dung cho bản ghi được chọn (STT)
        if "Số tiền thanh toán" in db_lich_su.NoiDung:
            db_lich_su.NoiDung += f" + {format_amount(so_tien)} VNĐ"
        else:
            db_lich_su.NoiDung += f" |Số tiền thanh toán: {format_amount(so_tien)} VNĐ"

        while so_tien_con_lai_de_phan_bo > 0:
            # Tìm hoặc tạo bản ghi cho current_date
            period = (
                db.query(LichSuTraLai)
                .filter(LichSuTraLai.MaHD == ma_hd, LichSuTraLai.Ngay == current_date)
                .first()
            )
            # nếu không có bản ghi thì tạo bản ghi mới
            if not period:
                if is_first_period:
                    # Kỳ đầu tiên: ghi tổng số tiền thanh toán
                    period = LichSuTraLai(
                        MaHD=ma_hd,
                        Ngay=current_date,
                        SoTien=daily_interest,
                        NoiDung=f"Số tiền thanh toán: {format_amount(so_tien)}",
                        TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                        TrangThaiNgayThanhToan=(
                            TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                            if current_date > date.today()
                            else (
                                TrangThaiNgayThanhToan.DEN_HAN.value
                                if current_date == date.today()
                                else TrangThaiNgayThanhToan.QUA_HAN.value
                            )
                        ),
                        TienDaTra=0,
                        ThanhToan=True,
                        SuaLichSu=True
                    )
                else:
                    # Các kỳ sau: chỉ ghi lãi đã được trả
                    period = LichSuTraLai(
                        MaHD=ma_hd,
                        Ngay=current_date,
                        SoTien=daily_interest,
                        NoiDung=f"Lãi đã được trả vào ngày {date.today().isoformat()}",
                        TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                        TrangThaiNgayThanhToan=(
                            TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                            if current_date > date.today()
                            else (
                                TrangThaiNgayThanhToan.DEN_HAN.value
                                if current_date == date.today()
                                else TrangThaiNgayThanhToan.QUA_HAN.value
                            )
                        ),
                        TienDaTra=0,
                        ThanhToan=False,
                        SuaLichSu=False
                    )
                db.add(period)
            
            con_lai_ky = max(0, period.SoTien - period.TienDaTra)
            if con_lai_ky > 0:
                nop_vao_ky = min(so_tien_con_lai_de_phan_bo, con_lai_ky)
                period.TienDaTra += nop_vao_ky
                tong_da_thanh_toan += nop_vao_ky
                so_tien_con_lai_de_phan_bo -= nop_vao_ky

                period.TrangThaiThanhToan = (
                    TrangThaiThanhToan.DONG_DU.value
                    if period.TienDaTra >= period.SoTien
                    else TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
                )
                period.ThanhToan = True
                period.SuaLichSu = True
                
                if not is_first_period:
                    # Các kỳ sau: cộng dồn nội dung thanh toán
                    # if "Số tiền thanh toán" in period.NoiDung:
                    #     # Đã có ghi chú thanh toán trước đó, cộng dồn
                    #     period.NoiDung += f" + {nop_vao_ky:,} VNĐ"
                    # else:
                        # Chưa có ghi chú thanh toán, tạo mới
                    period.NoiDung = f"Trả lãi kỳ {ky_so} |Lãi đã được trả vào ngày {date.today().isoformat()}"
                    period.ThanhToan = False
                    period.SuaLichSu = False
                

            # Nếu kỳ đã đóng đủ thì tiến sang ngày kế tiếp theo KyDong
            if period.TienDaTra >= period.SoTien or con_lai_ky == 0:
                current_date = current_date + timedelta(days=ky_dong_days)
                ky_so += 1  # Increment period number for next iteration
                is_first_period = False  # After first period, mark as not first
            else:
                # Không đủ để đóng đủ kỳ hiện tại thì dừng
                break
        contract.TrangThai = TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
    
    elif "TG" in ma_hd:
        # Trả Góp: đã có lịch thanh toán đầy đủ → phân bổ trên các bản ghi tương lai sẵn có
        contract = db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()
        if not contract:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy hợp đồng {ma_hd}")
        
        # Cộng dồn nội dung cho bản ghi được chọn (STT) - Trả Góp
        if "Số tiền thanh toán" in db_lich_su.NoiDung:
            db_lich_su.NoiDung += f" + {format_amount(so_tien)} VNĐ"
        else:
            db_lich_su.NoiDung += f" |Số tiền thanh toán: {format_amount(so_tien)} VNĐ"
        
        future_periods: List[LichSuTraLai] = (
            db.query(LichSuTraLai)
            .filter(
        LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.Ngay >= db_lich_su.Ngay,
            )
            .order_by(LichSuTraLai.Ngay.asc())
            .all()
        )

        if not future_periods:
            raise HTTPException(status_code=400, detail="Không có kỳ nào để thanh toán")

        is_first_period = True  # Track if this is the first period (selected period)
        
        for period in future_periods:
            if so_tien_con_lai_de_phan_bo <= 0:
                break

            con_lai_ky = max(0, period.SoTien - period.TienDaTra)
            if con_lai_ky <= 0:
                continue

            nop_vao_ky = min(so_tien_con_lai_de_phan_bo, con_lai_ky)
            period.TienDaTra += nop_vao_ky
            tong_da_thanh_toan += nop_vao_ky
            so_tien_con_lai_de_phan_bo -= nop_vao_ky

            # Cập nhật trạng thái thanh toán kỳ
            if period.TienDaTra >= period.SoTien:
                period.TrangThaiThanhToan = TrangThaiThanhToan.DONG_DU.value
            else:
                period.TrangThaiThanhToan = TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
            
            # Cộng dồn nội dung thanh toán cho Trả Góp
            if is_first_period:
                # Kỳ đầu tiên: không cần cập nhật vì đã cập nhật ở trên
                is_first_period = False
            else:
                # Các kỳ sau: cộng dồn nội dung thanh toán
                noi_dung_lai = f"Số tiền thanh toán: {format_amount(nop_vao_ky)} VNĐ"
                if "Số tiền thanh toán" in period.NoiDung:
                    # Đã có ghi chú thanh toán trước đó, cộng dồn
                    period.NoiDung += f" + {format_amount(nop_vao_ky)} VNĐ"
                else:
                    # Chưa có ghi chú thanh toán, tạo mới
                    period.NoiDung += f" |{noi_dung_lai}"

    # Kiểm tra tất toán: nếu tổng đã trả >= tổng cần trả
    if "TG" in ma_hd:
        # Trả Góp: tổng số tiền của tất cả các kỳ trong lịch sử
        tong_can_tra = contract.SoTienVay + contract.LaiSuat
        
        # Tính tổng đã trả từ lịch sử
        tong_da_tra = sum(ls.TienDaTra for ls in future_periods)
        
        if tong_da_tra >= tong_can_tra:
            contract.TrangThai = TrangThaiThanhToan.DA_TAT_TOAN.value
    # Cập nhật trạng thái hợp đồng dựa trên tổng còn nợ trong lịch sử (nếu chưa tất toán)
    if contract and contract.TrangThai != TrangThaiThanhToan.DA_TAT_TOAN.value and "TG" in ma_hd:
        any_unpaid = db.query(LichSuTraLai).filter(
            LichSuTraLai.MaHD == ma_hd,
            LichSuTraLai.SoTien > LichSuTraLai.TienDaTra
        ).first() is not None

        contract.TrangThai = (
            TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value if any_unpaid else TrangThaiThanhToan.DA_TAT_TOAN.value
        )

    db.commit()

    # Tạo bản ghi lịch sử cho việc thanh toán (sau khi commit thành công)
    if "TC" in ma_hd:
        create_lich_su_utils(db, 
            ma_hd=ma_hd, 
            ho_ten=contract.HoTen, 
            ngay=date.today(), 
            so_tien=so_tien, 
            hanh_dong="Thanh toán lãi hợp đồng tín chấp", 
            loai_hop_dong="TC")
    elif "TG" in ma_hd:
        create_lich_su_utils(db, 
            ma_hd=ma_hd, 
            ho_ten=contract.HoTen, 
            ngay=date.today(), 
            so_tien=so_tien, 
            hanh_dong="Thanh toán lãi hợp đồng trả góp", 
            loai_hop_dong="TG")
    else:
        raise HTTPException(status_code=400, detail=f"Mã hợp đồng không hợp lệ: {ma_hd}")
    # tat_toan_hop_dong = check_tat_toan_hop_dong(db, ma_hd)
    # if tat_toan_hop_dong:
    #     if "TG" in ma_hd:
    #         create_lich_su_utils(db, 
    #             ma_hd=ma_hd, 
    #             ho_ten=contract.HoTen, 
    #             ngay=date.today(), 
    #             so_tien=so_tien, 
    #             hanh_dong="Tất toán hợp đồng trả góp", 
    #             loai_hop_dong="TG"
    #         )

    return {
        "success": True,
        "ma_hd": ma_hd,
        "stt": stt,
        "da_thanh_toan": tong_da_thanh_toan,
        "so_tien_con_du": so_tien - tong_da_thanh_toan,
        "trang_thai_hop_dong": contract.TrangThai if contract else None,
    }

def pay_lich_su_by_contract(db: Session, ma_hd: str, so_tien: int) -> dict:
    """
    Thanh toán lịch sử trả lãi theo chuẩn logic:
    - Chỉ cho phép thanh toán kỳ "Đến hạn" (DEN_HAN)
    - Không cho phép trả vượt quá số tiền còn lại của kỳ
    - Cập nhật trạng thái kỳ: DONG_DU hoặc THANH_TOAN_MOT_PHAN
    - Cập nhật trạng thái HĐ: nếu còn kỳ chưa trả đủ => THANH_TOAN_MOT_PHAN; nếu tất cả đã đủ => DA_TAT_TOAN
    """
    if so_tien <= 0:
        raise HTTPException(status_code=400, detail="Số tiền thanh toán phải > 0")

    # db_lich_su = get_lich_sus_by_contract(db, ma_hd)
    today = date.today()
    db_lich_su = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd, LichSuTraLai.Ngay >= today).all()
    if len(db_lich_su) != 0:
        # data_db_lich_su = sorted([db_lich_su for db_lich_su in db_lich_su if db_lich_su.SoTien != db_lich_su.TienDaTra], key=lambda x: x.Ngay)
        data_db_lich_su = sorted(db_lich_su, key=lambda x: x.Ngay)
    else:
        data_db_lich_su = []
    so_tien_con_lai_de_phan_bo = so_tien
    tong_da_thanh_toan = 0
    is_first_period = True  

    if "TC" in ma_hd:
        # Tín Chấp: có thể chưa tồn tại bản ghi tương lai; tạo dần theo KyDong và phân bổ
        contract = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
        if not contract:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy hợp đồng {ma_hd}")
        ky_dong_days = contract.KyDong or 1
        daily_interest = contract.LaiSuat or 0
        ky_so = 1

        if len(data_db_lich_su) != 0:
            current_date = data_db_lich_su[0].Ngay
            if "Số tiền thanh toán" in data_db_lich_su[0].NoiDung:
                data_db_lich_su[0].NoiDung += f" + {format_amount(so_tien)} VNĐ"
            else:
                data_db_lich_su[0].NoiDung += f" |Số tiền thanh toán: {format_amount(so_tien)} VNĐ"
        else:
            current_date = contract.NgayVay + timedelta(days=ky_dong_days)

        while so_tien_con_lai_de_phan_bo > 0:
            # Tìm hoặc tạo bản ghi cho current_date
            period = (
                db.query(LichSuTraLai)
                .filter(LichSuTraLai.MaHD == ma_hd, LichSuTraLai.Ngay == current_date)
                .first()
            )
            # nếu không có bản ghi thì tạo bản ghi mới
            if not period:
                if is_first_period:
                    # Kỳ đầu tiên: ghi tổng số tiền thanh toán
                    period = LichSuTraLai(
                        MaHD=ma_hd,
                        Ngay=current_date,
                        SoTien=daily_interest,
                        NoiDung=f"Trả lãi kỳ {ky_so} |Số tiền thanh toán: {format_amount(so_tien)}",
                        TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                        TrangThaiNgayThanhToan=(
                            TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                            if current_date > date.today()
                            else (
                                TrangThaiNgayThanhToan.DEN_HAN.value
                                if current_date == date.today()
                                else TrangThaiNgayThanhToan.QUA_HAN.value
                            )
                        ),
                        TienDaTra=0,
                        ThanhToan=True,
                        SuaLichSu=True
                    )
                else:
                    # Các kỳ sau: chỉ ghi lãi đã được trả
                    period = LichSuTraLai(
                        MaHD=ma_hd,
                        Ngay=current_date,
                        SoTien=daily_interest,
                        NoiDung=f"Lãi đã được trả vào ngày {date.today().isoformat()}",
                        TrangThaiThanhToan=TrangThaiThanhToan.CHUA_THANH_TOAN.value,
                        TrangThaiNgayThanhToan=(
                            TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                            if current_date > date.today()
                            else (
                                TrangThaiNgayThanhToan.DEN_HAN.value
                                if current_date == date.today()
                                else TrangThaiNgayThanhToan.QUA_HAN.value
                            )
                        ),
                        TienDaTra=0,
                        ThanhToan=False,
                        SuaLichSu=False
                    )
                db.add(period)
            
            con_lai_ky = max(0, period.SoTien - period.TienDaTra)
            if con_lai_ky > 0:
                nop_vao_ky = min(so_tien_con_lai_de_phan_bo, con_lai_ky)
                period.TienDaTra += nop_vao_ky
                tong_da_thanh_toan += nop_vao_ky
                so_tien_con_lai_de_phan_bo -= nop_vao_ky

                period.TrangThaiThanhToan = (
                    TrangThaiThanhToan.DONG_DU.value
                    if period.TienDaTra >= period.SoTien
                    else TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
                )
                period.ThanhToan = True
                period.SuaLichSu = True
                
                if not is_first_period:
                    # Các kỳ sau: cộng dồn nội dung thanh toán
                    # if "Số tiền thanh toán" in period.NoiDung:
                    #     # Đã có ghi chú thanh toán trước đó, cộng dồn
                    #     period.NoiDung += f" + {nop_vao_ky:,} VNĐ"
                    # else:
                        # Chưa có ghi chú thanh toán, tạo mới
                    period.NoiDung = f"Trả lãi kỳ {ky_so} |Lãi đã được trả vào ngày {date.today().isoformat()}"
                    period.ThanhToan = False
                    period.SuaLichSu = False
                

            # Nếu kỳ đã đóng đủ thì tiến sang ngày kế tiếp theo KyDong
            if period.TienDaTra >= period.SoTien or con_lai_ky == 0:
                current_date = current_date + timedelta(days=ky_dong_days)
                ky_so += 1  # Increment period number for next iteration
                is_first_period = False  # After first period, mark as not first
            else:
                # Không đủ để đóng đủ kỳ hiện tại thì dừng
                break
        contract.TrangThai = TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
    
    elif "TG" in ma_hd:
        # Trả Góp: đã có lịch thanh toán đầy đủ → phân bổ trên các bản ghi tương lai sẵn có
        contract = db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()
        if not contract:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy hợp đồng {ma_hd}")
        for db_lich_su_cong_don_lai in data_db_lich_su:
            if so_tien_con_lai_de_phan_bo <= 0:
                break

            if "Số tiền thanh toán" in db_lich_su_cong_don_lai.NoiDung:
                if date.today().isoformat() in db_lich_su_cong_don_lai.NoiDung:
                    db_lich_su_cong_don_lai.NoiDung += f" + {format_amount(so_tien)} VNĐ"
                else:
                    db_lich_su_cong_don_lai.NoiDung += f"| Số tiền thanh toán: {format_amount(so_tien)} VNĐ"
            else:
                if is_first_period != False:
                    db_lich_su_cong_don_lai.NoiDung += f"| Số tiền thanh toán: {format_amount(so_tien)} VNĐ"
                    db_lich_su_cong_don_lai.ThanhToan = True
                    db_lich_su_cong_don_lai.SuaLichSu = True

            con_lai_ky = max(0, db_lich_su_cong_don_lai.SoTien - db_lich_su_cong_don_lai.TienDaTra)
            if con_lai_ky <= 0:
                break

            nop_vao_ky = min(so_tien_con_lai_de_phan_bo, con_lai_ky)
            db_lich_su_cong_don_lai.TienDaTra += nop_vao_ky
            tong_da_thanh_toan += nop_vao_ky
            so_tien_con_lai_de_phan_bo -= nop_vao_ky

            # Cập nhật trạng thái thanh toán kỳ
            if db_lich_su_cong_don_lai.TienDaTra >= db_lich_su_cong_don_lai.SoTien:
                db_lich_su_cong_don_lai.TrangThaiThanhToan = TrangThaiThanhToan.DONG_DU.value
            else:
                db_lich_su_cong_don_lai.TrangThaiThanhToan = TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
            
            # Cộng dồn nội dung thanh toán cho Trả Góp
            if is_first_period:
                # Kỳ đầu tiên: không cần cập nhật vì đã cập nhật ở trên
                is_first_period = False
            else:
                # Các kỳ sau: cộng dồn nội dung thanh toán
                noi_dung_lai = f"Lãi đã được trả vào ngày {date.today().isoformat()}"
                if "Số tiền thanh toán" in db_lich_su_cong_don_lai.NoiDung:
                    # Đã có ghi chú thanh toán trước đó, cộng dồn
                    db_lich_su_cong_don_lai.NoiDung += f" + {format_amount(nop_vao_ky)} VNĐ"
                else:
                    # Chưa có ghi chú thanh toán, tạo mới
                    db_lich_su_cong_don_lai.NoiDung += f" |{noi_dung_lai}"
                db_lich_su_cong_don_lai.ThanhToan = False
                db_lich_su_cong_don_lai.SuaLichSu = False

    # Kiểm tra tất toán: nếu tổng đã trả >= tổng cần trả
    if "TG" in ma_hd:
        # Trả Góp: tổng số tiền của tất cả các kỳ trong lịch sử
        tong_can_tra = contract.SoTienVay + contract.LaiSuat
        
        # Tính tổng đã trả từ lịch sử
        tong_da_tra = sum(db_lich_su_cong_don_lai.TienDaTra for db_lich_su_cong_don_lai in data_db_lich_su)
        
        if tong_da_tra >= tong_can_tra:
            contract.TrangThai = TrangThaiThanhToan.DA_TAT_TOAN.value
    # Cập nhật trạng thái hợp đồng dựa trên tổng còn nợ trong lịch sử (nếu chưa tất toán)
    if contract and contract.TrangThai != TrangThaiThanhToan.DA_TAT_TOAN.value and "TG" in ma_hd:
        # Tính tổng `TienDaTra` cho hợp đồng (dùng SQL SUM)
        check_tat_toan = (db.query(func.coalesce(func.sum(LichSuTraLai.TienDaTra), 0)).filter(
            LichSuTraLai.MaHD == ma_hd,
        ).scalar() or 0) + so_tien
        
        if check_tat_toan >= (contract.SoTienVay + contract.LaiSuat):
            check_tat_toan_bool = True
        else:
            check_tat_toan_bool = False

        # If check_tat_toan_bool is True -> fully settled (DA_TAT_TOAN), otherwise partial (THANH_TOAN_MOT_PHAN)
        contract.TrangThai = (
            TrangThaiThanhToan.DA_TAT_TOAN.value if check_tat_toan_bool else TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
        )
        if check_tat_toan_bool:
            create_lich_su_utils(db, 
                ma_hd=ma_hd, 
                ho_ten=contract.HoTen, 
                ngay=date.today(), 
                so_tien=so_tien, 
                hanh_dong="Tất toán hợp đồng trả góp", 
                loai_hop_dong="TG"
            )

    db.commit()

    # Tạo bản ghi lịch sử cho việc thanh toán (sau khi commit thành công)
    if "TC" in ma_hd:
        create_lich_su_utils(db, 
            ma_hd=ma_hd, 
            ho_ten=contract.HoTen, 
            ngay=date.today(), 
            so_tien=so_tien, 
            hanh_dong="Thanh toán lãi hợp đồng tín chấp", 
            loai_hop_dong="TC")
    elif "TG" in ma_hd:
        create_lich_su_utils(db, 
            ma_hd=ma_hd, 
            ho_ten=contract.HoTen, 
            ngay=date.today(), 
            so_tien=so_tien, 
            hanh_dong="Thanh toán lãi hợp đồng trả góp", 
            loai_hop_dong="TG")
    else:
        raise HTTPException(status_code=400, detail=f"Mã hợp đồng không hợp lệ: {ma_hd}")
    # tat_toan_hop_dong = check_tat_toan_hop_dong(db, ma_hd)
    # if tat_toan_hop_dong:
    #     if "TG" in ma_hd:
    #         create_lich_su_utils(db, 
    #             ma_hd=ma_hd, 
    #             ho_ten=contract.HoTen, 
    #             ngay=date.today(), 
    #             so_tien=so_tien, 
    #             hanh_dong="Tất toán hợp đồng trả góp", 
    #             loai_hop_dong="TG"
    #         )

    return {
        "success": True,
        "ma_hd": ma_hd,
        "da_thanh_toan": tong_da_thanh_toan,
        "so_tien_con_du": so_tien - tong_da_thanh_toan,
        "trang_thai_hop_dong": contract.TrangThai if contract else None,
    }


def tat_toan_hop_dong(db: Session, ma_hd: str, tien_lai: int = 0) -> dict:
    """
    Tất toán hợp đồng cho cả Trả Góp và Tín Chấp.
    - Đặt trạng thái hợp đồng => DA_TAT_TOAN
    - Cập nhật tất cả lịch sử trả lãi liên quan:
        + Nếu TrangThaiNgayThanhToan != Quá hạn => đánh Đóng đủ và điền đủ số tiền
    """
    try:
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

        # 2. Tính tổng lãi còn nợ (chỉ tính các kỳ không quá hạn)
        total_interest_due = 0
        lich_sus_all = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).all()
        for ls in lich_sus_all:
            if ls.TrangThaiNgayThanhToan != TrangThaiNgayThanhToan.QUA_HAN.value:
                total_interest_due += max(0, (ls.SoTien or 0) - (ls.TienDaTra or 0))

        # 3. Xử lý phân bổ tiền lãi nếu có
        histories_updated = 0
        if tien_lai and tien_lai > 0:
            if tien_lai < total_interest_due:
                # Phân bổ một phần tiền lãi
                so_tien_con_lai_de_phan_bo = tien_lai

                # Ưu tiên từ các kỳ sớm đến muộn, không lấy quá hạn
                periods = (
                    db.query(LichSuTraLai)
                    .filter(
                        LichSuTraLai.MaHD == ma_hd,
                        LichSuTraLai.TrangThaiNgayThanhToan != TrangThaiNgayThanhToan.QUA_HAN.value,
                    )
                    .order_by(LichSuTraLai.Ngay.asc())
                    .all()
                )

                for period in periods:
                    if so_tien_con_lai_de_phan_bo <= 0:
                        break
                    con_lai_ky = max(0, (period.SoTien or 0) - (period.TienDaTra or 0))
                    if con_lai_ky <= 0:
                        continue
                    nop_vao_ky = min(so_tien_con_lai_de_phan_bo, con_lai_ky)
                    period.TienDaTra = (period.TienDaTra or 0) + nop_vao_ky
                    so_tien_con_lai_de_phan_bo -= nop_vao_ky
                    period.TrangThaiThanhToan = (
                        TrangThaiThanhToan.DONG_DU.value
                        if period.TienDaTra >= period.SoTien
                        else TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
                    )
                    # Cập nhật nội dung cộng dồn
                    if period.NoiDung and "Số tiền thanh toán" in period.NoiDung:
                        period.NoiDung += f" + {format_amount(nop_vao_ky)} VNĐ"
                    else:
                        # period.NoiDung = (period.NoiDung or "") + f" |Số tiền thanh toán: {nop_vao_ky:,} VNĐ"
                        period.NoiDung = (period.NoiDung or "")
                    histories_updated += 1
            else:
                # Tất toán đầy đủ - cập nhật tất cả các kỳ không quá hạn
                periods = (
                    db.query(LichSuTraLai)
                    .filter(
                        LichSuTraLai.MaHD == ma_hd,
                        LichSuTraLai.TrangThaiNgayThanhToan != TrangThaiNgayThanhToan.QUA_HAN.value,
                    )
                    .all()
                )

                for period in periods:
                    period.TienDaTra = period.SoTien
                    period.TrangThaiThanhToan = TrangThaiThanhToan.DONG_DU.value
                    histories_updated += 1

        # 4. Cập nhật trạng thái hợp đồng
        contract.TrangThai = TrangThaiThanhToan.DA_TAT_TOAN.value
        tien_con_lai = 0  # Initialize for TG case
        if loai == "TC":
            tien_con_lai = contract.SoTienVay - contract.SoTienTraGoc
            contract.SoTienTraGoc = tien_con_lai

        # 5. Cập nhật nội dung lịch sử hôm nay
        db_lich_su_tra_lai_today = db.query(LichSuTraLai).filter(
            LichSuTraLai.MaHD == ma_hd, 
            LichSuTraLai.Ngay == date.today()
        ).first()
        
        if db_lich_su_tra_lai_today:
            if loai == "TC":
                noi_dung_tat_toan = f'''Tất toán: [Tiền Gốc: {format_amount(tien_con_lai)} VNĐ & Tiền lãi: {format_amount(tien_lai)} VNĐ] | {db_lich_su_tra_lai_today.NoiDung}'''
            else:
                noi_dung_tat_toan = f"Tất toán: {format_amount(tien_lai)} VNĐ | {db_lich_su_tra_lai_today.NoiDung}"
            db_lich_su_tra_lai_today.NoiDung = noi_dung_tat_toan

        db.commit()

        # Tạo bản ghi lịch sử cho việc tất toán hợp đồng
        if loai == "TC":
            # Tín chấp: lãi + gốc còn lại
            so_tien_tat_toan = tien_lai + tien_con_lai
            create_lich_su_utils(db, 
                ma_hd=ma_hd, 
                ho_ten=contract.HoTen, 
                ngay=date.today(), 
                so_tien=so_tien_tat_toan, 
                hanh_dong="Tất toán hợp đồng tín chấp", 
                loai_hop_dong="TC")
        elif loai == "TG":
            # Trả góp: chỉ lãi
            create_lich_su_utils(db, 
                ma_hd=ma_hd, 
                ho_ten=contract.HoTen, 
                ngay=date.today(), 
                so_tien=tien_lai, 
                hanh_dong="Tất toán hợp đồng trả góp", 
                loai_hop_dong="TG")

        return {
            "success": True,
            "message": f"Tất toán hợp đồng {ma_hd} thành công",
            "loai": loai,
            "histories_updated": histories_updated,
            "fully_settled": True,
            "contract_status": contract.TrangThai,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi tất toán hợp đồng: {str(e)}")
    
def delete_thanh_toan(db: Session, ma_hd: str) -> dict:
    """
    Xóa tất cả các bản ghi lịch sử thanh toán từ ngày hôm nay đến hết của lãi của hợp đồng
    """
    try:
        # Xác định loại hợp đồng
        contract = None
        if "TG" in ma_hd:
            contract = db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()
        elif "TC" in ma_hd:
            contract = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
        else:
            raise HTTPException(status_code=400, detail=f"Mã hợp đồng không hợp lệ: {ma_hd}")

        if not contract:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy hợp đồng {ma_hd}")

        deleted_count = 0
        
        if "TC" in ma_hd:
            # Tín Chấp
            lich_su_today = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.Ngay == date.today(),
                LichSuTraLai.ThanhToan == True
            ).first()
            if lich_su_today:
                lich_su_today.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.DEN_HAN.value
                lich_su_today.TrangThaiThanhToan = TrangThaiThanhToan.CHUA_THANH_TOAN.value
                lich_su_today.TienDaTra = 0
                lich_su_today.ThanhToan = False
                # lich_su_today.NoiDung = lich_su_today.NoiDung.split("|")[0].strip()  # Giữ lại phần trước dấu '|'
                if lich_su_today.NoiDung:
                    parts = [p.strip() for p in lich_su_today.NoiDung.split("|")]
                    if len(parts) > 1:
                        lich_su_today.NoiDung = " | ".join(parts[:-1]).strip()
                    else:
                        lich_su_today.NoiDung = ""
            
            lich_su_to_delete = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.Ngay > date.today(),
            ).all()
            for lich_su in lich_su_to_delete:
                db.delete(lich_su)
                deleted_count += 1
            
        else:
            # Trả Góp
            lich_su_today = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.Ngay == date.today(),
                LichSuTraLai.ThanhToan == True
            ).first()
            if lich_su_today:
                lich_su_today.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.DEN_HAN.value
                lich_su_today.TrangThaiThanhToan = TrangThaiThanhToan.CHUA_THANH_TOAN.value
                lich_su_today.TienDaTra = 0
                lich_su_today.ThanhToan = False
                # lich_su_today.NoiDung = lich_su_today.NoiDung.split("|")[0].strip()  # Giữ lại phần trước dấu '|'
                if lich_su_today.NoiDung:
                    parts = [p.strip() for p in lich_su_today.NoiDung.split("|")]
                    if len(parts) > 1:
                        lich_su_today.NoiDung = " | ".join(parts[:-1]).strip()
                    else:
                        lich_su_today.NoiDung = ""
                
                
            lich_su_to_delete = db.query(LichSuTraLai).filter(
                LichSuTraLai.MaHD == ma_hd,
                LichSuTraLai.Ngay > date.today(),
            ).all()
            for lich_su in lich_su_to_delete:
                lich_su.TrangThaiNgayThanhToan = TrangThaiNgayThanhToan.CHUA_DEN_HAN.value
                lich_su.TrangThaiThanhToan = TrangThaiThanhToan.CHUA_THANH_TOAN.value
                lich_su.TienDaTra = 0
                lich_su.ThanhToan = False
                lich_su.NoiDung = lich_su.NoiDung.split("|")[0].strip()  # Giữ lại phần trước dấu '|'
                deleted_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Đã xóa {deleted_count} bản ghi lịch sử thanh toán cho hợp đồng {ma_hd} từ ngày hôm nay trở đi.",
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa lịch sử thanh toán: {str(e)}")