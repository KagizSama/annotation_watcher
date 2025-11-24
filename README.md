# Labeling Tool – Phần mềm gán nhãn dữ liệu

Phần mềm **Labeling Tool** hỗ trợ gán nhãn (label) dữ liệu phục vụ cho các bài toán Machine Learning / Deep Learning, đặc biệt là các bài toán thị giác máy tính như phân loại ảnh, phát hiện đối tượng (object detection), v.v.

Ứng dụng cho phép người dùng:
- Mở thư mục chứa dữ liệu (ảnh).
- Tạo và quản lý danh sách nhãn (labels).
- Gán nhãn cho từng ảnh hoặc từng vùng (bounding box).
- Xuất dữ liệu nhãn ra các định dạng phổ biến để dùng cho huấn luyện mô hình.

---

## 1. Tính năng chính

- ✅ Gán nhãn (label) cho ảnh theo từng lớp (image-level classification).
- ✅ Vẽ và chỉnh sửa **bounding box** cho bài toán object detection.
- ✅ Quản lý danh sách nhãn: thêm, xoá, sửa tên label.
- ✅ Hỗ trợ duyệt ảnh nhanh (Next / Previous).
- ✅ Tự động lưu tiến độ gán nhãn theo từng project.
- ✅ Xuất file nhãn ra các định dạng:
  - `CSV` (image_path, x_min, y_min, x_max, y_max, label)
  - Định dạng tương thích YOLO (nếu cần).
- ✅ Giao diện đơn giản, phù hợp cho sinh viên/nhóm nghiên cứu gán nhãn thủ công.

---

## 2. Công nghệ sử dụng

- Ngôn ngữ: **Python 3.x**
- Giao diện: có thể dùng **PyQt5 / Tkinter** (tuỳ theo cài đặt trong project của bạn).
- Thư viện xử lý ảnh: `Pillow` hoặc `opencv-python` (nếu có).
- Quản lý môi trường & phụ thuộc: `pip` + `requirements.txt`.

> 📌 Ghi chú: Phần này bạn có thể chỉnh lại chính xác theo project của mình (VD: “Dùng PyQt5 cho GUI”, “Dùng FastAPI + React cho web”, …).

---

## 3. Cài đặt

### 3.1. Clone repository

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
