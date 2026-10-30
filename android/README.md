# Bing Search Runner 1.3.1 — thử nghiệm trên Edge Android

File cài: [bing-search-runner-android-v1.3.1.crx](bing-search-runner-android-v1.3.1.crx). Trên trang file của GitHub, chọn **Download raw file** để tải.

Đây là gói từ [mã nguồn PC trong cùng repository](../README.md), giữ chức năng điền ô Bing rồi bấm kính lúp. Giao diện được điều chỉnh cho màn hình hẹp. Đã xác minh chữ ký CRX3 và nội dung ZIP; chưa xác nhận trên thiết bị Android thật.

Bản 1.3.1 bao gồm bộ 464 từ ngẫu nhiên và tùy chọn **Tự xóa lịch sử sau 5 giây**, áp dụng cho cả lượt tìm kiếm cuối. Thời gian chờ xóa độc lập với delay tìm kiếm. URL có lịch sử cũ hoặc nhiều lượt truy cập sẽ được giữ lại để tránh xóa nhầm. Chức năng này chỉ tác động lịch sử trình duyệt, không xóa dữ liệu phía Microsoft.

## Cập nhật bản đã cài

Cài file CRX 1.3.1 qua cùng mục **Extension install by crx** như trước. Gói dùng cùng khóa ký và cùng extension ID với bản Android cũ. Nếu trình duyệt yêu cầu, cấp thêm quyền truy cập lịch sử, sau đó tải lại tab Bing. Việc trình duyệt Android hỗ trợ cập nhật tại chỗ và API lịch sử vẫn cần kiểm tra trên thiết bị thật. Nếu báo lỗi quyền hoặc không xóa được, bỏ chọn tùy chọn xóa lịch sử để tiếp tục dùng tìm kiếm.

## Cài đặt

1. Cài **Microsoft Edge Canary** từ Google Play: https://play.google.com/store/apps/details?id=com.microsoft.emmx.canary
2. Mở Edge Canary → **Settings / Cài đặt → About Microsoft Edge / Giới thiệu Microsoft Edge**.
3. Chạm liên tiếp vào số phiên bản khoảng 5 lần để bật **Developer options / Tùy chọn nhà phát triển**.
4. Quay lại Cài đặt → **Developer options → Extension install by crx**.
5. Chọn file `bing-search-runner-android-v1.3.1.crx` đã chuyển vào thư mục Downloads trên điện thoại, và xác nhận cài đặt/quyền lịch sử nếu được hỏi.
6. Mở `https://www.bing.com` → menu Edge → **Extensions / Tiện ích mở rộng** → **Bing Search Runner**.
7. Đặt số lượt và delay, rồi bấm **Bắt đầu**.

Đường dẫn cài file riêng là tính năng thử nghiệm và có thể khác hoặc không xuất hiện trên một số phiên bản. Nếu không có **Extension install by crx**, gửi lại phiên bản Edge Canary và các mục bạn thấy trong Developer options để xác định bước tiếp theo. File ZIP không thể thay cho file CRX bằng cách đổi đuôi.

## Khi sử dụng

- Khi thử lần đầu, giữ Edge ở trước màn hình và màn hình đang bật. Android có thể dừng tab khi chuyển app, khóa màn hình hoặc tiết kiệm pin; không bảo đảm chạy nền như máy tính.
- Khi ứng dụng bị tạm dừng, việc xóa lịch sử có thể trễ hơn 5 giây. Nếu API lịch sử không được hỗ trợ trên bản trình duyệt đang dùng, popup sẽ báo chưa xóa được thay vì dừng tìm kiếm.
- Nếu trình duyệt chặn tải `.crx`, chuyển file từ máy tính sang điện thoại qua USB hoặc Drive; giữ nguyên đuôi `.crx`.
- Điểm Rewards do Microsoft quyết định. Tự động tìm kiếm không bảo đảm được tính điểm.

Nguồn tham khảo đường dẫn cài thử nghiệm: https://github.com/microsoft/amplifier-browser-bridge/blob/main/docs/ANDROID.md

Tệp `signing-key.pem` nằm trên máy tính để ký các bản cập nhật cùng extension ID. Không gửi tệp khóa này cho người khác hoặc cài nó lên điện thoại.
