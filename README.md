<div align="center">

  # 🎙️ Narration Studio
  
  *A Next-Generation Video Narration Platform Powered by AI.*

  [![React](https://img.shields.io/badge/React-19.0.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-5.0.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

  [Fitur Utama](#-fitur-utama) • [Teknologi](#-teknologi) • [Cara Instalasi](#-cara-instalasi) • [Lisensi](#-lisensi)
</div>

---

## ✨ Fitur Utama

🚀 **AI-Powered Generation**
Hasilkan skrip narasi berkualitas tinggi dengan integrasi AI kustom. Biarkan AI membantu Anda menemukan kata-kata yang tepat.

📺 **YouTube Transcript Import**
Tarik transkrip langsung dari video YouTube favorit Anda dan bersihkan secara otomatis untuk referensi atau bahan dasar.

📂 **Manajemen Proyek Lengkap**
Buat, edit, dan kelola berbagai proyek narasi dengan mudah. Semua tersimpan aman secara lokal.

📝 **Rich Text Editor Modern**
Pengalaman menulis tanpa hambatan dengan editor teks kaya fitur yang dibangun dengan komponen React modern.

📦 **Ekspor Mudah**
Simpan dan bagikan karya Anda dengan dukungan ekspor JSZip langsung dari browser.

🎨 **Desain Antarmuka Premium**
Nikmati UI yang menawan, responsif, dan mendukung *dark mode* berkat kekuatan Tailwind CSS v4.

---

## 🛠 Teknologi

Kami menggunakan *tech stack* modern untuk memastikan performa yang luar biasa:

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Fondasi aplikasi yang sangat cepat dan interaktif. |
| **Styling** | Tailwind CSS v4 | Utilitas CSS untuk desain yang konsisten dan indah. |
| **Backend** | Express, tsx | Server ringan untuk menangani *requests* API. |
| **Database** | Dexie (IndexedDB) | Penyimpanan lokal yang efisien di browser. |
| **Integrasi** | Custom AI API | Endpoint untuk pemrosesan teks tingkat lanjut. |

---

## 🚀 Cara Instalasi

Ikuti langkah-langkah mudah berikut untuk menjalankan **Narration Studio** di mesin lokal Anda:

### 1. Kloning Repositori & Instal Dependensi

Pastikan Node.js sudah terinstal, lalu jalankan:

```bash
# Instal semua paket yang dibutuhkan
npm install
```

### 2. Konfigurasi Environment

Duplikat file konfigurasi *environment* dan sesuaikan dengan kredensial Anda:

```bash
# Salin template environment
cp .env.example .env.local
```

Buka file `.env.local` dan isi *environment variables* berikut:

- `AI_API_KEY`: Kunci API untuk *generator* konten AI.
- `AI_BASE_URL`: URL dasar untuk endpoint API AI.
- `YOUTUBE_TRANSCRIPT_API_URL`: Endpoint API transkrip YouTube.

### 3. Jalankan Server Pengembangan

```bash
# Mulai petualangan!
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`.

---

## 📜 Daftar Skrip

Gunakan perintah ini untuk mempermudah alur kerja Anda:

- `npm run dev` : Menjalankan server pengembangan (*Vite & Express*).
- `npm run build` : Membangun bundel produksi.
- `npm run start` : Menjalankan server produksi dari bundel.
- `npm run lint` : Memeriksa masalah tipe TypeScript.

---

<div align="center">
  <p><b>© 2026 Jarot - All Rights Reserved</b></p>
</div>
