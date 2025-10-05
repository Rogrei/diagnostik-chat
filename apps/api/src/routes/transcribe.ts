// apps/api/src/routes/transcribe.ts
// apps/api/src/routes/transcribe.ts
import fs from "fs";
import OpenAI from "openai";
import { query } from "../db.js";
import { env } from "../config/env.js";
import { FastifyInstance, FastifyRequest } from "fastify";
import os from "os";
import path from "path";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

interface TranscribeQuery {
  interviewId: string;
}

export async function registerTranscribeRoutes(app: FastifyInstance) {
  const OFFSET_SECONDS = 2; // 🕐 kompensation för naturlig fördröjning

  // 🔹 1. Realtidsdel (chunk) — korta inspelningar under intervjun
  app.post(
    "/api/transcribe/chunk",
    async (req: FastifyRequest<{ Querystring: TranscribeQuery }>, reply) => {
      const data = await req.file();
      if (!data) return reply.code(400).send({ error: "No audio file uploaded" });

      const { interviewId } = req.query;
      if (!interviewId) return reply.code(400).send({ error: "Missing interviewId" });

      const buffer = await data.toBuffer();
      const tempDir = path.join(os.tmpdir(), "chunks");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const filePath = path.join(tempDir, `${Date.now()}_${data.filename}`);
      fs.writeFileSync(filePath, buffer);

      try {
        // 🧠 Skicka till Whisper med segment
        const transcription: any = await client.audio.transcriptions.create({
          file: fs.createReadStream(filePath),
          model: "whisper-1",
          language: "sv",
          response_format: "verbose_json",
        });

        const publicUrl = `/uploads/audio/${path.basename(filePath)}`;

        if (Array.isArray(transcription.segments)) {
          console.log(`📋 ${transcription.segments.length} segment hittades (chunk)`);

          for (const seg of transcription.segments) {
            const segText = seg.text?.trim();
            if (!segText) continue;

            const segStart = Math.max(0, Math.round(seg.start - OFFSET_SECONDS));
            const segEnd = Math.max(segStart, Math.round(seg.end - OFFSET_SECONDS));

            await query(
              `INSERT INTO turns (
                interview_id,
                speaker,
                text,
                audio_url,
                started_at,
                ended_at,
                created_at
              )
              VALUES (
                $1,
                'user',
                $2,
                $3,
                (SELECT started_at FROM interviews WHERE id = $1) + interval '${segStart} seconds',
                (SELECT started_at FROM interviews WHERE id = $1) + interval '${segEnd} seconds',
                now()
              )`,
              [interviewId, segText, publicUrl]
            );
          }
        } else {
          const text = transcription.text?.trim() || null;
          if (text) {
            await query(
              `INSERT INTO turns (interview_id, speaker, text, audio_url, started_at, created_at)
              VALUES ($1, 'user', $2, $3, now(), now())`,
              [interviewId, text, publicUrl]
            );
          }
        }

        console.log("📁 Fil sparad:", filePath);

        // 🧹 Rensa temporär fil
        fs.unlinkSync(filePath);

        return reply.code(201).send({
          success: true,
          audio_url: publicUrl,
          segments: transcription.segments?.length ?? 0,
        });
      } catch (err: any) {
        req.log.error(err);
        return reply.code(500).send({ error: err.message });
      }
    }
  );

 // 🔹 2. Full ljudfil efter avslutad intervju — hela inspelningen
  app.post(
    "/api/transcribe/full",
    async (req: FastifyRequest<{ Querystring: TranscribeQuery }>, reply) => {
      const data = await req.file();
      if (!data) return reply.code(400).send({ error: "No audio file uploaded" });

      const { interviewId } = req.query;
      if (!interviewId) return reply.code(400).send({ error: "Missing interviewId" });

      // 🧠 Hämta intervjuns verkliga starttid från databasen
      const [interview] = await query<{ started_at: string }>(
        "SELECT started_at FROM interviews WHERE id = $1",
        [interviewId]
      );
      if (!interview) {
        return reply.code(404).send({ error: "Interview not found" });
      }

      // 🔹 Nollpunkt: intervjuens starttid (inte recorderns)
      const recordingBase = new Date(interview.started_at);

      const buffer = await data.toBuffer();
      const uploadDir = path.join(os.tmpdir(), "interviews");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const fileName = `${interviewId}_${Date.now()}.webm`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/audio/${fileName}`;

      try {
        const transcription: any = await client.audio.transcriptions.create({
          file: fs.createReadStream(filePath),
          model: "whisper-1",
          language: "sv",
          response_format: "verbose_json",
        });

        console.log(`🎧 Whisper-resultat (full): ${transcription.text?.slice(0, 120)}...`);

        // 🔹 Segmentbaserad lagring med exakt tidsreferens
        if (Array.isArray(transcription.segments)) {
          for (const seg of transcription.segments) {
            let segText = seg.text?.trim();
            if (!segText) continue;

            // 🧹 Ta bort markörer som "[sätter en kort paus]"
            segText = segText.replace(/\[sätter en kort paus\]/gi, "").trim();
            if (!segText) continue;

            // 🕓 Beräkna absoluta start/slut baserat på intervju-starttid
            let segStartAbs = new Date(recordingBase.getTime() + seg.start * 1000);
            let segEndAbs = new Date(recordingBase.getTime() + seg.end * 1000);

            // ⏱️ 2 sekunders synkjustering — anpassa användarens segment till samma tidslinje
            segStartAbs = new Date(segStartAbs.getTime() + 2000);
            segEndAbs = new Date(segEndAbs.getTime() + 2000);

            // 🧩 Skydda mot negativa eller noll-värden
            if (segStartAbs < recordingBase) segStartAbs = new Date(recordingBase.getTime() + 500);

            await query(
              `INSERT INTO turns (
                interview_id,
                speaker,
                text,
                audio_url,
                started_at,
                ended_at,
                created_at
              )
              VALUES ($1, 'user', $2, $3, $4, $5, now())`,
              [interviewId, segText, publicUrl, segStartAbs.toISOString(), segEndAbs.toISOString()]
            );
          }

          console.log(`✅ Sparade ${transcription.segments.length} segment för intervju ${interviewId}`);
        } else {
          // 🔹 fallback – om Whisper inte ger segment
          const text = transcription.text?.trim() || "";
          const cleanText = text.replace(/\[sätter en kort paus\]/gi, "").trim();
          await query(
            `INSERT INTO turns (interview_id, speaker, text, audio_url, started_at, created_at)
            VALUES ($1, 'user', $2, $3, (SELECT started_at FROM interviews WHERE id = $1), now())`,
            [interviewId, cleanText, publicUrl]
          );
        }

        fs.unlinkSync(filePath);
        return reply.code(201).send({
          success: true,
          audio_url: publicUrl,
          segments: transcription.segments?.length ?? 0,
        });
      } catch (err: any) {
        req.log.error(err);
        return reply.code(500).send({ error: err.message });
      }
    }
  );

  // 🔹 3. Retry — transkribera om en tidigare ljudfil
  app.post(
    "/api/transcribe/retry/:turnId",
    async (req: FastifyRequest<{ Params: { turnId: string } }>, reply) => {
      const { turnId } = req.params;
      if (!turnId) return reply.code(400).send({ error: "Missing turnId" });

      try {
        const rows = await query(
          `SELECT audio_url, interview_id FROM turns WHERE id = $1`,
          [turnId]
        );

        if (rows.length === 0)
          return reply.code(404).send({ error: "Turn not found" });

        const { audio_url: audioUrl, interview_id: interviewId } = rows[0];
        if (!audioUrl)
          return reply.code(400).send({ error: "No audio file attached" });

        const filePath = audioUrl.startsWith("/uploads")
          ? path.join(os.tmpdir(), "interviews", path.basename(audioUrl))
          : audioUrl;

        if (!fs.existsSync(filePath)) {
          return reply.code(404).send({
            error: "Audio file not found on server",
            filePath,
          });
        }

        const transcription: any = await client.audio.transcriptions.create({
          file: fs.createReadStream(filePath),
          model: "whisper-1",
          language: "sv",
          response_format: "verbose_json",
        });

        console.log(
          `🎧 Whisper retry-resultat: ${transcription.text?.slice(0, 120)}...`
        );

        await query(
          `DELETE FROM turns
          WHERE interview_id = $1 AND audio_url = $2`,
          [interviewId, audioUrl]
        );

        if (Array.isArray(transcription.segments)) {
          for (const seg of transcription.segments) {
            const segText = seg.text?.trim();
            if (!segText) continue;

            const segStart = Math.max(0, Math.round(seg.start - OFFSET_SECONDS));
            const segEnd = Math.max(segStart, Math.round(seg.end - OFFSET_SECONDS));

            await query(
              `INSERT INTO turns (
                interview_id,
                speaker,
                text,
                audio_url,
                started_at,
                ended_at,
                created_at
              )
              VALUES (
                $1,
                'user',
                $2,
                $3,
                (SELECT started_at FROM interviews WHERE id = $1) + interval '${segStart} seconds',
                (SELECT started_at FROM interviews WHERE id = $1) + interval '${segEnd} seconds',
                now()
              )`,
              [interviewId, segText, audioUrl]
            );
          }

          console.log(
            `✅ Retry: sparade ${transcription.segments.length} segment för intervju ${interviewId}`
          );
        } else {
          const text = transcription.text?.trim() || "";
          await query(
            `INSERT INTO turns (interview_id, speaker, text, audio_url, started_at, created_at)
            VALUES ($1, 'user', $2, $3, now(), now())`,
            [interviewId, text, audioUrl]
          );
        }

        return reply.send({
          success: true,
          message: "Transkribering uppdaterad med segment",
          segments: transcription.segments?.length ?? 0,
        });
      } catch (err: any) {
        req.log.error(err);
        return reply.code(500).send({ error: err.message });
      }
    }
  );
}