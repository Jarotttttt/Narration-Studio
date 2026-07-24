<div align="center">

# 🎙️ Narration Studio

**Platform produksi video faceless bertenaga AI — dari skrip sampai siap unggah, dalam satu tempat.**

[![React](https://img.shields.io/badge/React-19.0.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[Demo Langsung](https://narasi-flow.ai.studio) · [Fitur](#-fitur-utama) · [Instalasi](#-cara-instalasi) · [Tech Stack](#-tech-stack) · [Lisensi](#-lisensi)

</div>

---

## 📖 Tentang Proyek

**Narration Studio** adalah aplikasi web *all-in-one* untuk memproduksi video — terutama konten *faceless* (tanpa wajah) — secara otomatis dan efisien. Alur kerjanya dirancang menyatukan seluruh tahap produksi konten dalam satu platform: mulai dari **penulisan skrip berbasis AI**, **pengambilan referensi dari YouTube**, **pengelolaan proyek**, hingga **ekspor hasil akhir** — tanpa perlu berpindah-pindah aplikasi.

Cocok untuk kreator konten, tim produksi video, maupun siapa pun yang ingin mempercepat proses menulis dan menyusun narasi video dengan bantuan AI.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 🚀 **AI-Powered Generation** | Hasilkan skrip narasi berkualitas tinggi lewat integrasi AI kustom — biarkan AI membantu menemukan kata-kata yang tepat. |
| 📺 **YouTube Transcript Import** | Tarik transkrip langsung dari video YouTube sebagai referensi atau bahan dasar, lalu dibersihkan otomatis. |
| 📂 **Manajemen Proyek** | Buat, edit, dan kelola banyak proyek narasi sekaligus — semua tersimpan aman secara lokal di browser. |
| 📝 **Rich Text Editor** | Pengalaman menulis mulus dengan editor teks kaya fitur berbasis komponen React modern. |
| 📦 **Ekspor Instan** | Simpan dan bagikan hasil kerja langsung dari browser dengan dukungan ekspor JSZip. |
| 🎨 **UI Premium** | Antarmuka modern, responsif, dan mendukung *dark mode* berkat Tailwind CSS v4. |

---

## 🛠 Tech Stack

<div align="center">

| Lapisan | Teknologi | Peran |
|---|---|---|
| **Frontend** | React 19 · TypeScript · Vite | Fondasi aplikasi yang cepat & interaktif |
| **Styling** | Tailwind CSS v4 | Desain konsisten dan modern |
| **Backend** | Express · tsx | Server ringan untuk menangani request API |
| **Penyimpanan** | Dexie (IndexedDB) | Database lokal di sisi browser |
| **Integrasi AI** | Custom AI API | Endpoint untuk generasi & pemrosesan teks |

</div>

---

## 🚀 Cara Instalasi

### Prasyarat
- Node.js versi terbaru (LTS direkomendasikan)
- npm

### 1. Klon repositori & instal dependensi

```bash
git clone https://github.com/Jarotttttt/Narration-Studio.git
cd Narration-Studio
npm install
```

### 2. Konfigurasi environment

```bash
cp .env.example .env.local
```

Buka `.env.local` dan lengkapi variabel berikut:

| Variabel | Keterangan |
|---|---|
| `AI_API_KEY` | Kunci API untuk generator konten AI |
| `AI_BASE_URL` | URL dasar endpoint API AI |
| `YOUTUBE_TRANSCRIPT_API_URL` | Endpoint API untuk mengambil transkrip YouTube |

### 3. Jalankan server pengembangan

```bash
npm run dev
```

Aplikasi akan berjalan di **http://localhost:3000**

---

## 📜 Daftar Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server pengembangan (Vite & Express) |
| `npm run build` | Membangun bundel untuk produksi |
| `npm run start` | Menjalankan server produksi dari hasil build |
| `npm run lint` | Memeriksa tipe & masalah TypeScript |

---

## 🗂️ Struktur Proyek

```
Narration-Studio/
├── src/                  # Kode sumber utama aplikasi (komponen, logic, halaman)
├── .env.example          # Template environment variable
├── index.html            # Entry point aplikasi
├── server.ts             # Server Express untuk API
├── vite.config.ts        # Konfigurasi Vite
├── tsconfig.json         # Konfigurasi TypeScript
└── package.json          # Daftar dependensi & skrip proyek
```

---

## 🤝 Kontribusi

Kontribusi, laporan bug, dan permintaan fitur sangat diterima!
Silakan buka [Issue](https://github.com/Jarotttttt/Narration-Studio/issues) atau ajukan Pull Request.

1. Fork repositori ini
2. Buat branch fitur (`git checkout -b fitur/nama-fitur`)
3. Commit perubahan (`git commit -m 'Menambahkan fitur X'`)
4. Push ke branch (`git push origin fitur/nama-fitur`)
5. Buka Pull Request

---

## 📜 Lisensi

**© 2026 Jarot — All Rights Reserved**

<div align="center">

Dibuat dengan ❤️ oleh **[Jarot](https://github.com/Jarotttttt)**

</div>
