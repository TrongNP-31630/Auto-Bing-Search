# Bing Search Runner — thử nghiệm trên Edge Android

File cài: [bing-search-runner-android-v1.2.1.crx](bing-search-runner-android-v1.2.1.crx). Trên trang file của GitHub, chọn **Download raw file** để tải.

Đây là gói từ [mã nguồn PC trong cùng repository](../README.md), giữ chức năng điền ô Bing rồi bấm kính lúp. Giao diện được điều chỉnh cho màn hình hẹp. Đã xác minh chữ ký CRX3 và nội dung ZIP; chưa xác nhận trên thiết bị Android thật.

## Cài đặt

1. Cài **Microsoft Edge Canary** từ Google Play: https://play.google.com/store/apps/details?id=com.microsoft.emmx.canary
2. Mở Edge Canary → **Settings / Cài đặt → About Microsoft Edge / Giới thiệu Microsoft Edge**.
3. Chạm liên tiếp vào số phiên bản khoảng 5 lần để bật **Developer options / Tùy chọn nhà phát triển**.
4. Quay lại Cài đặt → **Developer options → Extension install by crx**.
5. Chọn file `bing-search-runner-android-v1.2.1.crx` đã chuyển vào thư mục Downloads trên điện thoại, và xác nhận cài đặt nếu được hỏi.
6. Mở `https://www.bing.com` → menu Edge → **Extensions / Tiện ích mở rộng** → **Bing Search Runner**.
7. Đặt số lượt và delay, rồi bấm **Bắt đầu**.

Đường dẫn cài file riêng là tính năng thử nghiệm và có thể khác hoặc không xuất hiện trên một số phiên bản. Nếu không có **Extension install by crx**, gửi lại phiên bản Edge Canary và các mục bạn thấy trong Developer options để xác định bước tiếp theo. File ZIP không thể thay cho file CRX bằng cách đổi đuôi.

## Khi sử dụng

- Khi thử lần đầu, giữ Edge ở trước màn hình và màn hình đang bật. Android có thể dừng tab khi chuyển app, khóa màn hình hoặc tiết kiệm pin; không bảo đảm chạy nền như máy tính.
- Nếu trình duyệt chặn tải `.crx`, chuyển file từ máy tính sang điện thoại qua USB hoặc Drive; giữ nguyên đuôi `.crx`.
- Điểm Rewards do Microsoft quyết định. Tự động tìm kiếm không bảo đảm được tính điểm.

Nguồn tham khảo đường dẫn cài thử nghiệm: https://github.com/microsoft/amplifier-browser-bridge/blob/main/docs/ANDROID.md

Tệp `signing-key.pem` nằm trên máy tính để ký các bản cập nhật cùng extension ID. Không gửi tệp khóa này cho người khác hoặc cài nó lên điện thoại.
