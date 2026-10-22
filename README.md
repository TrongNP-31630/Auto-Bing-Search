# Bing Search Runner 1.2.1 — Edge / Brave

Extension Manifest V3 tìm kiếm theo lịch trong một tab Bing. Không cần cài thư viện hay đăng nhập vào extension.

Bản 1.1.1 sửa lỗi chỉ tìm kiếm một lần khi Bing cập nhật kết quả mà không tải lại toàn bộ trang. Bộ đếm nhận biết thay đổi URL trong cùng trang để tiếp tục lượt sau, hủy thông báo lỗi cũ sau khi chuyển kết quả, và bỏ qua nút gửi ẩn khi chọn kính lúp.

## Cài đặt

### Máy tính — Edge / Brave

1. Edge: nhập `edge://extensions` vào thanh địa chỉ. Brave: nhập `brave://extensions`.
2. Bật **Developer mode / Chế độ dành cho nhà phát triển**.
3. Chọn **Load unpacked / Tải tiện ích đã giải nén**.
4. Chọn thư mục repository đã tải về chứa `manifest.json`.
5. Ghim Bing Search Runner vào thanh công cụ để tiện mở.

Nếu dùng file ZIP, giải nén trước rồi chọn thư mục chứa manifest.json.

### Android — Edge Canary (thử nghiệm)

- [Tải bản Android 1.2.1 (.crx)](downloads/android/bing-search-runner-android-v1.2.1.crx). Trên trang file của GitHub, chọn **Download raw file** để tải file cài.
- [Hướng dẫn cài trên Android](downloads/android/README.md).
- Bản Android dùng cùng chức năng với mã nguồn PC, với giao diện điều chỉnh cho màn hình hẹp. Gói đã được kiểm tra chữ ký và nội dung; chưa được xác nhận trên thiết bị Android thật.
- Giữ Edge ở trước màn hình khi thử. Android có thể tạm dừng tab khi chuyển ứng dụng hoặc khóa màn hình.

File CRX là gói cài đặt có thể chia sẻ công khai. Khóa ký riêng (`.pem`, `.key`) được giữ ngoài repository và được chặn bởi `.gitignore`.

## Sử dụng

1. Mở `https://www.bing.com` và chọn tab đó.
2. Bấm biểu tượng extension, nhập số lượt (1–200) và thời gian chờ (0–3600 giây). Cho phép số thập phân, ví dụ `0.5` giây.
3. Để trống ô từ khóa để ghép 2–5 từ ngẫu nhiên từ bộ 264 từ Việt/Anh, có thể vô nghĩa (ví dụ `mây robot silver bánh`). Bản 1.2.1 bổ sung 200 từ tiếng Anh về thực phẩm, thiên nhiên, động vật, công nghệ, nghệ thuật và các chủ đề khác. Danh sách được tạo mới mỗi phiên, không theo mẫu câu và không trùng cụm trong cùng phiên. Hoặc nhập mỗi dòng một từ khóa riêng; danh sách riêng cần đủ số từ khóa khác nhau cho số lượt đã đặt.
4. Bấm **Bắt đầu**. Extension điền văn bản vào ô tìm kiếm Bing, phát sự kiện cập nhật ô rồi bấm nút kính lúp. Không điều hướng bằng URL tìm kiếm và không thao tác thanh địa chỉ. Không lặp từ khóa trong cùng phiên.
5. Bạn có thể chuyển sang tab khác, thu nhỏ trình duyệt hoặc đóng popup. Extension vẫn dùng đúng tab Bing ban đầu và không tự giành lại tiêu điểm.
6. Mở extension từ bất kỳ tab nào để xem tiến độ hoặc bấm **Dừng**.

Giữ tab Bing mở. Đóng tab đó hoặc điều hướng nó sang trang ngoài Bing sẽ dừng phiên. Chuyển sang tab khác không dừng phiên. Đóng rồi mở lại trình duyệt sẽ dừng phiên, nhưng giữ cấu hình để bạn bắt đầu lại. Một phiên chạy tại một thời điểm.

## Thời gian và điểm thưởng

- Đã bỏ giới hạn 30 giây. Bộ hẹn giờ nằm trong tab Bing và được tạo lại sau mỗi lần trang tải. Mỗi lượt phải đợi cả thời gian đã đặt lẫn trang mới sẵn sàng. Delay 0 nghĩa là không chờ thêm, không có nghĩa là nhiều lượt đồng thời.
- Tab nền vẫn tiếp tục được lên lịch, nhưng Chromium có thể làm chậm hoặc tạm ngưng tab để tiết kiệm tài nguyên. Thời gian thực tế có thể dài hơn cấu hình. Máy ngủ hoặc trình duyệt đóng thì không thể tìm kiếm. Không chạy dồn các lượt đã bỏ lỡ.
- Tiến độ đếm lượt đã cấp cho thao tác tìm kiếm, không xác nhận trang tải thành công hoặc được tính điểm. Khi không tìm thấy ô/nút tìm kiếm hoặc bấm mà trang không chuyển sau 20 giây, phiên dừng và hiển thị lỗi.
- Thao tác điền và bấm bằng extension vẫn là tự động; không giống một thao tác bàn phím/chuột vật lý và không bảo đảm được Rewards tính điểm.
- Microsoft không khuyến khích tìm kiếm bằng bot/macro và có thể giới hạn việc nhận điểm. Công cụ không bảo đảm kiếm được Rewards, không đọc số điểm, không vượt CAPTCHA và không giả lập hành vi người dùng.
- Nguồn: https://support.microsoft.com/en-us/accounts-billing/rewards/limiting-your-searches-in-microsoft-rewards
- Tài liệu content script: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

## Dữ liệu và quyền truy cập

Chỉ dùng quyền lưu cấu hình/tiến độ trên máy và chạy script trong các trang `https://www.bing.com/*`, `https://bing.com/*`. Script tìm ô nhập từ khóa và nút tìm kiếm để điền và bấm. Không có máy chủ riêng, không đọc cookie, mật khẩu hay điểm Rewards. Từ khóa được gửi đến Bing qua biểu mẫu tìm kiếm. Gỡ extension để xóa dữ liệu cục bộ của nó.

## Cập nhật từ phiên bản cũ

Nếu đã tải thư mục `D:\Extensions\bing-search-runner`, vào trang quản lý extension và bấm **Reload / Tải lại**. Nếu trình duyệt yêu cầu chấp thuận quyền mới để thao tác trang Bing, chấp thuận rồi tải lại tab Bing. Cấu hình cũ vẫn được giữ: nếu delay trước đó là 30, đổi lại trong popup theo ý bạn.

## Kiểm tra logic bằng Node.js

Chạy `node tests/background.test.cjs` trong thư mục extension. Các kiểm tra dùng API trình duyệt giả lập, không gửi tìm kiếm thật. Cần tải extension trong Edge/Brave để kiểm tra vận hành thực tế.
