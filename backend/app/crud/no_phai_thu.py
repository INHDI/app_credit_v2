from sqlalchemy.orm import Session
from app.models.tin_chap import TinChap
from app.models.lich_su_tra_lai import LichSuTraLai
from app.models.tra_gop import TraGop
from app.schemas.no_phai_thu import NoPhaiThuResponse
from app.schemas.lich_su_tra_lai import LichSuTraLai as LichSuTraLaiSchema
from typing import List
from datetime import date, timedelta
from app.core.enums import TrangThaiThanhToan

def get_no_phai_thus(db: Session, time: str = "today") -> List[NoPhaiThuResponse]:
    try:
        list_ma_hd_tc = db.query(TinChap.MaHD).filter(
            TinChap.TrangThai != TrangThaiThanhToan.DA_TAT_TOAN.value
        ).distinct().all()
        list_ma_hd_tg = db.query(TraGop.MaHD).filter(
            TraGop.TrangThai != TrangThaiThanhToan.DA_TAT_TOAN.value
        ).distinct().all()
        active_ids = {row[0] for row in list_ma_hd_tc} | {row[0] for row in list_ma_hd_tg}

        if time == "today":
            list_ma_hd_in_lich_su_tra_lai = db.query(LichSuTraLai.MaHD).filter(
                LichSuTraLai.Ngay == date.today()
            ).distinct().all()
        elif time == "all":
            list_ma_hd_in_lich_su_tra_lai = db.query(LichSuTraLai.MaHD).distinct().all()
        else:
            return []
        
        # Intersection: active contracts that have history in the selected window
        in_history_ids = {row[0] for row in list_ma_hd_in_lich_su_tra_lai}
        target_ids = sorted(active_ids & in_history_ids)

        results: List[NoPhaiThuResponse] = []
        for ma_hd in target_ids:
            # Determine contract type (TinChap or TraGop)
            tc = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
            tg = None if tc else db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()

            if not tc and not tg:
                continue

            contract = tc if tc else tg

            # Fetch history
            lich_sus = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).all()
            lich_su_schemas = [LichSuTraLaiSchema.model_validate(ls).model_dump() for ls in lich_sus]

            # Compute today's payment aggregates only
            today = date.today()
            lai_da_tra = sum(ls.TienDaTra for ls in lich_sus if ls.Ngay == today)
            total_due = sum(ls.SoTien for ls in lich_sus if ls.Ngay == today)
            lai_con_lai = max(0, total_due - lai_da_tra)

            # Derive fields depending on contract type
            if tc:
                so_tien_tra_goc = tc.SoTienTraGoc
                trang_thai = tc.TrangThai
                ho_ten = tc.HoTen
                ngay_vay = tc.NgayVay
                so_tien_vay = tc.SoTienVay
                ky_dong = tc.KyDong
                lai_suat = tc.LaiSuat
                # Tin chấp: Tổng = SoTienVay + LaiSuat * <số kỳ đóng>
                so_ky_dong = len(lich_sus)
                tong_tien_vay_va_lai = so_tien_vay + lai_suat * so_ky_dong
            else:
                # TraGop: approximate principal per period; fallback if SoLanTra is 0
                so_lan_tra = tg.SoLanTra if tg.SoLanTra else 0
                so_tien_tra_goc = (tg.SoTienVay // so_lan_tra) if so_lan_tra else 0
                trang_thai = tg.TrangThai
                ho_ten = tg.HoTen
                ngay_vay = tg.NgayVay
                so_tien_vay = tg.SoTienVay
                ky_dong = tg.KyDong
                lai_suat = tg.LaiSuat
                # Trả góp: Tổng = SoTienVay + LaiSuat
                tong_tien_vay_va_lai = so_tien_vay + lai_suat

            # Latest day status if available
            trang_thai_ngay_thanh_toan = lich_sus[-1].TrangThaiNgayThanhToan if lich_sus else ""

            results.append(
                NoPhaiThuResponse(
                    MaHD=ma_hd,
                    HoTen=ho_ten,
                    NgayVay=ngay_vay,
                    SoTienVay=so_tien_vay,
                    KyDong=ky_dong,
                    LaiSuat=lai_suat,
                    SoTienTraGoc=so_tien_tra_goc,
                    TrangThaiThanhToan=trang_thai,
                    TrangThaiNgayThanhToan=trang_thai_ngay_thanh_toan,
                    LichSuTraLai=lich_su_schemas,
                    LaiDaTra=lai_da_tra,
                    TongTienVayVaLai=tong_tien_vay_va_lai,
                    LaiConLai=lai_con_lai,
                )
            )

        return results
    except Exception as e:
        raise e