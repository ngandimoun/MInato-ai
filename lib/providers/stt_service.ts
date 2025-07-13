// FILE: lib/providers/stt_service.ts
import OpenAI from "openai";
import fs from "fs"; // For fs.createReadStream and fs.promises
import path from "path";
import { Readable } from "stream";
import { appConfig } from "../config"; // appConfig est la config unifiée
import { rawOpenAiClient as openai } from "./llm_clients"; // Utilise le client OpenAI partagé
import { OpenAISttModel } from "@/lib/types/index";
import { logger } from "../../memory-framework/config"; // Utilise le logger unifié
import { MAX_AUDIO_SIZE_BYTES } from "../constants";

// --- Vérification de la configuration au démarrage (côté serveur) ---
if (typeof window === "undefined") {
  if (!appConfig || !appConfig.llm) {
    logger.error(
      "CRITICAL: appConfig or appConfig.llm is undefined in stt_service. STT Service may not function."
    );
    // En production, tu pourrais vouloir lever une erreur ici pour arrêter le démarrage
    // throw new Error("STT Service configuration is missing.");
  } else if (!appConfig.llm.sttModel) {
    logger.warn("WARN: appConfig.llm.sttModel is undefined. STT will use a fallback or fail.");
  }
}

// Use the STT model configured in appConfig (defaults to gpt-4o-mini-transcribe)
const STT_MODEL: OpenAISttModel = "gpt-4o-mini-transcribe";
const DEFAULT_RESPONSE_FORMAT: "json" | "text" = "json";

export interface TranscriptionResult {
  text: string | null;
  language?: string | null;
  error?: string | null;
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

async function createSdkFileObject(
  source: string | Buffer | Readable,
  defaultName: string = "audio.bin",
  defaultType: string = "application/octet-stream",
  mimeTypeOverride?: string
): Promise<File> {
  const logPrefix = "[STT File Prep]";
  let fileBuffer: Buffer;
  let filename: string = defaultName;
  let mimeType: string = defaultType;

  const mimeMap: { [key: string]: string } = {
    ".mp3": "audio/mpeg", ".mp4": "audio/mp4", ".m4a": "audio/mp4",
    ".mpga": "audio/mpeg", ".mpeg": "audio/mpeg", ".wav": "audio/wav",
    ".webm": "audio/webm", ".ogg": "audio/ogg", ".opus": "audio/opus",
    ".flac": "audio/flac", ".aac": "audio/aac",
  };

  if (typeof source === "string") {
    try {
      await fs.promises.stat(source);
    } catch (err) {
      logger.error(`${logPrefix} Audio file not found: ${source}`);
      throw new Error(`Audio file not found: ${source}`);
    }
    logger.debug(`${logPrefix} Reading file from path: ${source}`);
    fileBuffer = await fs.promises.readFile(source);
    filename = path.basename(source);
    const ext = path.extname(filename).toLowerCase();
    mimeType = mimeMap[ext] || defaultType;
  } else if (source instanceof Buffer) {
    logger.debug(`${logPrefix} Using provided Buffer (size: ${source.length})`);
    fileBuffer = source;
    if (mimeTypeOverride) {
      mimeType = mimeTypeOverride;
      const extMap: Record<string,string> = {"audio/webm":"webm","audio/webm;codecs=opus":"webm","audio/mp4":"m4a"};
      const mapped = extMap[mimeTypeOverride];
      if (mapped) filename = `audio.${mapped}`;
    }
  } else if (source instanceof Readable) {
    logger.debug(`${logPrefix} Buffering readable stream...`);
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of source) {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      }
    } catch (streamError: any) {
      logger.error(`${logPrefix} Error reading stream: ${streamError.message}`);
      throw new Error(`Failed to read audio stream: ${streamError.message}`);
    }
    fileBuffer = Buffer.concat(chunks);
    logger.debug(`${logPrefix} Stream buffered (size: ${fileBuffer.length})`);
    if (
      (source as fs.ReadStream).path &&
      typeof (source as fs.ReadStream).path === "string"
    ) {
      filename = path.basename((source as fs.ReadStream).path as string);
      const ext = path.extname(filename).toLowerCase();
      mimeType = mimeMap[ext] || defaultType;
    }
  } else {
    logger.error(`${logPrefix} Invalid audio source type provided.`);
    throw new Error(
      "Invalid audio source type. Must be file path, Buffer, or Readable stream."
    );
  }

  logger.debug(
    `${logPrefix} Prepared file: Name: ${filename}, Type: ${mimeType}, Size: ${fileBuffer.length}`
  );
  const arrayBuffer = toArrayBuffer(fileBuffer);
  return new File([arrayBuffer], filename, { type: mimeType });
}

export class STTService {
  // Simple language detection based on common words and patterns
  private detectLanguageFromText(text: string): string | null {
    if (!text || text.trim().length === 0) return null;
    
    const lowerText = text.toLowerCase();
    
    // Spanish indicators
    if (/\b(el|la|los|las|un|una|de|en|con|por|para|que|no|se|es|son|fue|ser|estar|tener|hacer|ver|dar|saber|querer|llegar|pasar|deber|poner|parecer|quedar|creer|hablar|llevar|dejar|seguir|encontrar|llamar|venir|pensar|salir|volver|tomar|conocer|vivir|sentir|tratar|mirar|contar|empezar|esperar|buscar|existir|entrar|trabajar|escribir|perder|producir|ocurrir|entender|pedir|recibir|recordar|terminar|permitir|aparecer|conseguir|comenzar|servir|sacar|necesitar|mantener|resultar|leer|caer|cambiar|presentar|crear|abrir|considerar|oír|acabar|convertir|ganar|formar|traer|partir|morir|aceptar|realizar|suponer|comprender|lograr|explicar|preguntar|tocar|reconocer|estudiar|alcanzar|nacer|dirigir|correr|utilizar|pagar|ayudar|gustar|jugar|escuchar|cumplir|ofrecer|descubrir|levantar|intentar|usar|decidir|desarrollar|incluir|continuar|construir|establecer|aprender|romper|aplicar|representar|organizar|indicar|desaparecer|gastar|mostrar|determinar|comer|vender|imaginar|preparar)\b/.test(lowerText)) {
      return 'es';
    }
    
    // French indicators  
    if (/\b(le|la|les|un|une|des|de|du|dans|sur|avec|pour|par|sans|sous|vers|chez|entre|pendant|avant|après|depuis|jusqu|contre|malgré|selon|parmi|outre|hormis|sauf|concernant|moyennant|nonobstant|touchant|suivant|voici|voilà|être|avoir|faire|dire|aller|voir|savoir|prendre|venir|vouloir|pouvoir|falloir|devoir|croire|trouver|donner|parler|aimer|passer|mettre|demander|tenir|sembler|laisser|rester|partir|sortir|arriver|entrer|monter|descendre|naître|mourir|devenir|revenir|retourner|rentrer|tomber|repartir|ressortir|remonter|redescendre)\b/.test(lowerText)) {
      return 'fr';
    }
    
    // German indicators
    if (/\b(der|die|das|ein|eine|eines|einem|einen|einer|und|oder|aber|denn|sondern|in|an|auf|bei|mit|nach|von|zu|vor|über|unter|zwischen|durch|für|gegen|ohne|um|während|wegen|trotz|statt|außer|bis|seit|ab|aus|hinter|neben|entlang|gemäß|laut|zufolge|binnen|kraft|mangels|mittels|seitens|ungeachtet|zwecks|sein|haben|werden|können|müssen|sollen|wollen|dürfen|mögen|lassen|gehen|kommen|sehen|wissen|sagen|machen|geben|nehmen|finden|denken|sprechen|leben|arbeiten|spielen|lernen|fahren|laufen|essen|trinken|schlafen|wachen|lieben|hassen|kaufen|verkaufen|helfen|brauchen|verstehen|erklären|zeigen|hören|fühlen|riechen|schmecken|schauen|lesen|schreiben|rechnen|zählen|messen|wiegen)\b/.test(lowerText)) {
      return 'de';
    }
    
    // Italian indicators
    if (/\b(il|lo|la|i|gli|le|un|uno|una|di|a|da|in|con|su|per|tra|fra|e|o|ma|però|anche|ancora|già|più|molto|poco|tanto|quanto|come|quando|dove|perché|se|che|chi|cosa|cui|quale|essere|avere|fare|dire|andare|vedere|sapere|dare|stare|venire|dovere|potere|volere|uscire|partire|tornare|rimanere|diventare|sembrare|parere|piacere|servire|bastare|occorrere|bisognare|mancare|restare|riuscire|succedere|capitare|accadere|nascere|morire|vivere|crescere|invecchiare)\b/.test(lowerText)) {
      return 'it';
    }
    
    // Portuguese indicators
    if (/\b(o|a|os|as|um|uma|de|da|do|das|dos|em|na|no|nas|nos|com|por|para|sem|sob|sobre|entre|contra|durante|antes|depois|desde|até|através|mediante|conforme|segundo|perante|ante|após|ser|estar|ter|haver|fazer|dizer|ir|ver|saber|dar|ficar|vir|querer|poder|dever|conseguir|parecer|deixar|encontrar|falar|chegar|passar|trazer|levar|colocar|pôr|sair|voltar|entrar|nascer|morrer|viver|crescer|envelhecer)\b/.test(lowerText)) {
      return 'pt';
    }
    
    // Russian indicators (Cyrillic script)
    if (/[а-яё]/i.test(text)) {
      return 'ru';
    }
    
    // Chinese indicators
    if (/[\u4e00-\u9fff]/.test(text)) {
      return 'zh';
    }
    
    // Japanese indicators
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
      return 'ja';
    }
    
    // Korean indicators
    if (/[\uac00-\ud7af]/.test(text)) {
      return 'ko';
    }
    
    // Arabic indicators
    if (/[\u0600-\u06ff]/.test(text)) {
      return 'ar';
    }
    
    // Hindi indicators
    if (/[\u0900-\u097f]/.test(text)) {
      return 'hi';
    }
    
    // Default to null if no clear indicators
    return null;
  }

  async transcribeAudio(
    audioSource: string | Buffer | Readable,
    language?: string,
    prompt?: string,
    mimeTypeOverride?: string
  ): Promise<TranscriptionResult> {
    if (!openai) {
      logger.error("[STTService] OpenAI client unavailable.");
      return { text: null, error: "STT service not configured (OpenAI client)." };
    }
    // Vérification supplémentaire que le modèle STT est configuré
    if (!appConfig?.llm?.sttModel) {
        logger.error("[STTService] STT model not configured in appConfig.llm.");
        return { text: null, error: "STT service not configured (model missing)." };
    }

    const sttModelToUse = STT_MODEL;

    let fileInputForApi: fs.ReadStream | File;
    let filenameForLogging = "unknown_source";
    let fileSizeForLogging: number | string = "unknown";

    try {
      if (typeof audioSource === "string") {
        try {
          await fs.promises.stat(audioSource);
        } catch (err) {
          logger.error(
            `[STTService File Prep] Audio file (path) not found: ${audioSource}`
          );
          throw new Error(`Audio file not found: ${audioSource}`);
        }
        fileInputForApi = fs.createReadStream(audioSource);
        filenameForLogging = path.basename(audioSource);
        try {
          const stats = await fs.promises.stat(audioSource);
          fileSizeForLogging = stats.size;
        } catch { /* ignore */ }
      } else {
        fileInputForApi = await createSdkFileObject(
          audioSource,
          "audio.mp3", // Default name if source is Buffer/Stream without path
          "audio/mpeg", // Default type
          mimeTypeOverride
        );
        filenameForLogging = fileInputForApi.name;
        fileSizeForLogging = fileInputForApi.size;
      }

      if (typeof fileSizeForLogging === "number") {
        if (fileSizeForLogging === 0) {
          logger.warn(
            `[STTService] Input audio source is empty (0 bytes). Source: ${filenameForLogging}`
          );
          return { text: null, error: "Audio input is empty." };
        }
        const maxSize = MAX_AUDIO_SIZE_BYTES;
        if (fileSizeForLogging > maxSize) {
          const sizeMB = (fileSizeForLogging / (1024 * 1024)).toFixed(1);
          const maxMB = maxSize / (1024 * 1024);
          logger.warn(
            `[STTService] Audio file too large: ${sizeMB}MB. Max: ${maxMB}MB. Source: ${filenameForLogging}`
          );
          return {
            text: null,
            error: `Audio too large (${sizeMB}MB). Max ${maxMB}MB.`,
          };
        }
      }

      logger.info(
        `[STTService] Calling OpenAI Transcription (${sttModelToUse}). File: ${filenameForLogging.substring(
          0,
          50
        )}... (${fileSizeForLogging} bytes), Format: ${DEFAULT_RESPONSE_FORMAT}, Lang: ${
          language || "auto-detect"
        }, Prompt: ${prompt ? "Yes" : "No"}`
      );

      const transcriptionParams: OpenAI.Audio.TranscriptionCreateParams = {
        file: fileInputForApi,
        model: sttModelToUse,
        response_format: DEFAULT_RESPONSE_FORMAT,
        ...(language && { language }),
        ...(prompt && { prompt }),
      };

      const start = Date.now();
      const transcriptionResponse = await openai.audio.transcriptions.create(
        transcriptionParams
      );
      const duration = Date.now() - start;
      logger.debug(
        `[STTService] Transcription API OK (${duration}ms) for: ${filenameForLogging.substring(
          0,
          50
        )}...`
      );

      let resultText: string | null = null;
      let resultLang: string | null = language || null;

      if (DEFAULT_RESPONSE_FORMAT === "json") {
        if (
          typeof transcriptionResponse === "object" &&
          transcriptionResponse !== null &&
          "text" in transcriptionResponse
        ) {
          resultText = (transcriptionResponse as { text: string }).text ?? null;
          // Langue n'est pas retournée par l'API de transcription standard json, sauf si `verbose_json`
          // Si tu utilises `verbose_json`, tu pourrais extraire `language` de la réponse.
        } else {
          logger.warn(
            "[STTService] Unexpected 'json' transcription response format:",
            transcriptionResponse
          );
          return {
            text: null,
            error: "Unexpected 'json' response format from transcription API.",
          };
        }
      } else { // 'text' format
        if (typeof transcriptionResponse === "string") {
          resultText = transcriptionResponse;
        } else if (typeof (transcriptionResponse as any).text === "string") {
          resultText = (transcriptionResponse as any).text;
        } else {
          logger.warn(
            "[STTService] Expected plain text or object with text for 'text' format, got:",
            transcriptionResponse
          );
          resultText = String(transcriptionResponse);
        }
      }

      if (resultText && resultLang) { // language n'est pas toujours retourné
        logger.info(
          `[STTService] Transcription language detected/provided: ${resultLang}`
        );
      } else if (resultText) {
        // Try to detect language from the transcribed text if not provided by API
        const detectedLang = this.detectLanguageFromText(resultText);
        if (detectedLang) {
          resultLang = detectedLang;
          logger.info(`[STTService] Language detected from transcription text: ${resultLang}`);
        }
      }

      return {
        text: resultText,
        language: resultLang || undefined, // Retourner undefined si null pour correspondre au type
        error: null,
      };
    } catch (error: any) {
      let errorMessage = "Unknown STT error.";
      if (error instanceof OpenAI.APIError) {
        errorMessage = `OpenAI STT API Error (${error.status || "N/A"} ${
          error.code || "N/A"
        }): ${error.message}`;
        logger.error(
          `[STTService] OpenAI API Error details:`,
          JSON.stringify(error.error || error)
        );
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      logger.error(
        `[STTService] Error during transcription (Input: ${filenameForLogging.substring(
          0,
          50
        )}...):`,
        errorMessage,
        error
      );
      return { text: null, error: errorMessage };
    }
  }
}