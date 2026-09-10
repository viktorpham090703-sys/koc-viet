# Luồng booking AI Clone

## Gửi yêu cầu và báo giá

1. Doanh nghiệp chọn tối đa 10 KOC đang hoạt động và đã đăng ký AI Clone.
2. Nhập ngành hàng, loại nội dung, link sản phẩm, deadline, quy mô, số lượng video và brief. Nội dung affiliate/combo cần thêm sàn, link sản phẩm trên sàn và hoa hồng.
3. Gửi yêu cầu: mỗi KOC có một booking, cùng mã nhóm `aiclone_batch_id`, trạng thái `quote_pending` (chờ Admin báo giá). Không bắt buộc KOC có giá niêm yết cho ngành trong brief. Chưa thu tiền hay ký quỹ.
4. Admin nhận thông báo, đánh giá brief và mức độ phù hợp của từng KOC với ngành hàng. Admin nhập phí từng KOC, phí sản xuất, phí nền tảng, chi phí bổ sung và ghi chú.
5. Admin gửi một báo giá tổng cho nhóm. Booking đại diện ở trạng thái `quote_sent`, các booking còn lại là `quote_grouped`. Tổng báo giá chính thức phải lớn hơn 0.
6. Doanh nghiệp xem báo giá:
   - Chấp nhận: hệ thống kiểm tra số dư ví và ký quỹ đúng tổng giá chính thức, sau đó chuyển nhóm sang `brief_review`. Nếu thiếu số dư, chưa chuyển sang sản xuất.
   - Từ chối: nhập lý do; nhóm chuyển sang `rejected` và Admin nhận thông báo.

## Sản xuất và duyệt video

1. Admin xử lý brief, soạn nội dung sản xuất và chuyển sang `producing`.
2. Admin giao video cho doanh nghiệp: `pending_business_review`.
3. Doanh nghiệp duyệt để chuyển sang `pending_koc_review`, hoặc yêu cầu chỉnh sửa (`revision_requested`).
4. KOC duyệt để chuyển sang `video_approved`, hoặc yêu cầu chỉnh sửa.
5. KOC đăng bài và tiếp tục quy trình theo dõi, nghiệm thu, quyết toán hiện có.

## Quy tắc giá

- Nhãn “Đã đăng ký AI Clone” không cam kết KOC phù hợp mọi ngành; Admin cần kiểm tra trước khi báo giá.
- Ngành hàng trong brief không cần trùng với các ngành có giá niêm yết của KOC.
- `price=0` khi `quote_pending` nghĩa là chưa được báo giá, không phải miễn phí. Giao diện hiển thị “Chờ báo giá”.
- Phí sản xuất ước tính lưu lúc gửi brief chỉ là tham khảo nội bộ cho Admin. Không trả tổng ước tính hoặc phí KOC giả khi chưa có báo giá (`estimated_price` và `koc_fee` là `null`).
- Các khoản trong báo giá do Admin gửi mới quyết định tổng thanh toán. Chặn thanh toán khi còn `quote_pending`, kể cả đường thanh toán demo.
- Không cần migration database hoặc bổ sung bảng giá giả để sử dụng luồng này.

Ví dụ: doanh nghiệp chọn Nguyễn Thu Hà và Lê Phương Anh cho ngành “Mẹ & Bé” vẫn gửi được yêu cầu nếu cả hai đang hoạt động và đã đăng ký AI Clone. Admin xem xét khả năng nhận brief trước khi gửi báo giá chính thức.
