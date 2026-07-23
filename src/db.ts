import Dexie, { Table } from "dexie";
import { Project, InputTranscript, Act, PromptSentence, InstructionTemplate, ActAudio, PromptImage, VideoSyncConfig } from "./types";

class NarasiFlowDB extends Dexie {
  projects!: Table<Project, string>;
  transcripts!: Table<InputTranscript, string>;
  acts!: Table<Act, string>;
  prompts!: Table<PromptSentence, string>;
  instructions!: Table<InstructionTemplate, string>;
  actAudio!: Table<ActAudio, string>;
  promptImages!: Table<PromptImage, string>;
  videoSyncConfig!: Table<VideoSyncConfig, string>;

  constructor() {
    super("NarasiFlowDB");

    this.version(1).stores({
      projects: "id, createdAt, status",
      transcripts: "projectId",
      acts: "id, projectId, actNumber",
      prompts: "id, actId, projectId, sequenceNumber",
      instructions: "id"
    });

    this.version(2).stores({
      projects: "id, createdAt, status",
      transcripts: "projectId",
      acts: "id, projectId, actNumber",
      prompts: "id, actId, projectId, sequenceNumber",
      instructions: "id",
      youtubeMetadata: "projectId"
    });

    this.version(3).stores({
      projects: "id, createdAt, status",
      transcripts: "projectId",
      acts: "id, projectId, actNumber",
      prompts: "id, actId, projectId, sequenceNumber",
      instructions: "id",
      youtubeMetadata: "projectId",
      actAudio: "id, projectId, actId, actNumber",
      promptImages: "id, projectId, actId, promptId, sequenceNumber",
      videoSyncConfig: "projectId"
    });

    this.version(4).stores({
      youtubeMetadata: null
    });
  }
}

export const db = new NarasiFlowDB();

export const DEFAULT_INSTRUCTIONS: Record<string, string> = {
  stage1: `You are an expert story editor. I will provide a transcript or story.
Please logically divide it into exactly 6 acts.
DO NOT summarize or alter the original words.
Only return a JSON object with keys "babak_1" to "babak_6" containing the raw text for each act.`,
  
  stage2: `Anda adalah pencerita ahli. Saya akan memberikan babak mentah dari sebuah transkrip.
Tugas Anda adalah menulis ulang teks tersebut menjadi sebuah narasi cerita yang mendetail, mengalir, dan menarik dalam Bahasa Indonesia.

ATURAN UTAMA:
1. DILARANG MERANGKUM ATAU MEMENDEKKAN: Tuliskan kembali seluruh alur, ide, detail, fakta, dan contoh dari babak tersebut secara lengkap dan menyeluruh. JANGAN memotong cerita menjadi ringkasan singkat atau hanya beberapa kata.
2. PANJANG TEKS: Panjang narasi harus sebanding dan setara dengan panjang teks mentah aslinya (detail dan kaya konteks).
3. BENTUK CERITA: Ubah teks menjadi paragraf-paragraf narasi yang rapi, mengalir, dan enak dibaca/didengar.
4. JANGAN gunakan format poin (bullet points) atau penomoran.
5. DILARANG menggunakan karakter em-dash (—). Gunakan tanda hubung biasa (-) jika memerlukan pemisah.
6. Tulis sepenuhnya dalam Bahasa Indonesia.

Hanya kembalikan teks narasinya saja tanpa komentar atau teks tambahan.`,

  stage3: `Anda adalah ahli prompt gambar AI.
Saya akan memberikan beberapa kalimat cerita.
Tugas Anda adalah merubah setiap kalimat menjadi prompt gambar visual dalam bahasa Inggris yang sangat deskriptif dan detail untuk generator gambar AI (seperti Midjourney atau Stable Diffusion).
Fokus pada elemen visual, subjek utama, suasana/mood, pencahayaan, dan komposisi.

Hasilkan output HANYA dalam format JSON valid:
{
  "prompts": [
    { "index": 1, "prompt": "An English visual prompt for sentence 1..." },
    { "index": 2, "prompt": "An English visual prompt for sentence 2..." }
  ]
}`
};

export async function initializeInstructions() {
  const existing = await db.instructions.toArray();
  
  const validIds = Object.keys(DEFAULT_INSTRUCTIONS);
  for (const inst of existing) {
    if (!validIds.includes(inst.id)) {
      await db.instructions.delete(inst.id);
    }
  }

  for (const [id, content] of Object.entries(DEFAULT_INSTRUCTIONS)) {
    const existingInst = existing.find(e => e.id === id);
    if (!existingInst) {
      await db.instructions.put({ id: id as "stage1" | "stage2" | "stage3", content, isDefault: true });
    } else if (existingInst.isDefault && existingInst.content !== content) {

      await db.instructions.update(id, { content });
    }
  }
}
