import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { ParsedDataObject, DataParsedOutput } from "@/lib/types";
import { logger } from "@/memory-framework/config";
import { supabaseAdmin } from "../supabaseClient";
import { MEDIA_UPLOAD_BUCKET } from "../constants";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface DataParsingInput extends ToolInput {
  fileId: string;
  fileType: string;
  fileName?: string | null; // Allow null
}

export class DataParsingTool extends BaseTool {
  name = "DataParsingTool";
  description =
    "Parses uploaded data files (CSV, XLSX) from storage into a structured table format. This is usually the first step in data analysis workflows initiated by Minato.";
  argsSchema = {
    type: "object" as const,
    properties: {
      fileId: { type: "string" as const, description: "Path identifier for the uploaded file in cloud storage." },
      fileType: { type: "string" as const, description: "The MIME type of the file (e.g., 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')." },
      fileName: { type: ["string", "null"], description: "Optional: Original name of the file for context." },
    },
    required: ["fileId", "fileType", "fileName"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = undefined;

  private async parseCsv(buffer: Buffer): Promise<ParsedDataObject> {
    return new Promise((resolve, reject) => {
      Papa.parse(buffer.toString("utf8"), {
        header: true, skipEmptyLines: true, dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) logger.error("[DataParsingTool CSV] PapaParse errors:", results.errors);
          if (!results.meta.fields || results.meta.fields.length === 0) {
            if (results.data.length === 0) {
              logger.warn("[DataParsingTool CSV] CSV appears empty.");
              return resolve({ headers: [], rows: [], rowCount: 0, columnCount: 0 });
            }
            const firstRow = results.data[0] as any;
            const numCols = Array.isArray(firstRow) ? firstRow.length : Object.keys(firstRow).length;
            const generatedHeaders = Array.from({ length: numCols }, (_, i) => `Column${i + 1}`);
            logger.warn(`[DataParsingTool CSV] No headers found. Generated defaults: ${generatedHeaders.join(", ")}`);
            const rows = results.data as Array<Record<string, any> | any[]>;
            const formattedRows = rows.map(rowObject => {
                const rowArray: (string | number | null)[] = [];
                if (Array.isArray(rowObject)) {
                    return rowObject.map(value => (value === undefined || (typeof value !== 'string' && typeof value !== 'number' && value !== null && typeof value !== 'boolean')) ? null : (typeof value === 'boolean' ? String(value) : value));
                } else {
                    for (let i = 0; i < generatedHeaders.length; i++) {
                        const value = (rowObject as any)[generatedHeaders[i]] ?? (rowObject as any)[i];
                        rowArray.push((value === undefined || (typeof value !== 'string' && typeof value !== 'number' && value !== null && typeof value !== 'boolean')) ? null : (typeof value === 'boolean' ? String(value) : value));
                    }
                    return rowArray;
                }
            });
            return resolve({ headers: generatedHeaders, rows: formattedRows as (string | number | null)[][], rowCount: formattedRows.length, columnCount: generatedHeaders.length });
          }
          const headers = results.meta.fields as string[];
          const rows = results.data as Array<Record<string, any>>;
          const formattedRows = rows.map(row => headers.map(header => {
            const value = row[header];
            return (value === undefined || (typeof value !== 'string' && typeof value !== 'number' && value !== null && typeof value !== 'boolean')) ? null : (typeof value === 'boolean' ? String(value) : value);
          }));
          resolve({ headers, rows: formattedRows as (string | number | null)[][], rowCount: formattedRows.length, columnCount: headers.length });
        },
        error: (error: Error) => {
          logger.error("[DataParsingTool CSV] PapaParse fatal error:", error);
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  }

  private async parseXlsx(buffer: Buffer): Promise<ParsedDataObject> {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer", cellNF: false, cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("Excel file contains no sheets.");
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false }) as (string | number | Date | boolean | null)[][];
      if (jsonData.length === 0) {
        return { headers: [], rows: [], rowCount: 0, columnCount: 0 };
      }
      const headers = jsonData[0]!.map(header => String(header ?? `Column${jsonData[0]!.indexOf(header) + 1}`));
      const rowsData = jsonData.slice(1);
      const formattedRows = rowsData.map(rowArray => rowArray.map(cellValue => {
        if (cellValue instanceof Date) {
          try { return cellValue.toISOString().split('T')[0]; } catch (e) { return cellValue.toString(); }
        }
        if (typeof cellValue === 'boolean') { return cellValue.toString(); }
        if (cellValue === undefined || (typeof cellValue !== 'string' && typeof cellValue !== 'number' && cellValue !== null)) { return null; }
        return cellValue;
      }));
      return { headers, rows: formattedRows as (string | number | null)[][], rowCount: formattedRows.length, columnCount: headers.length };
    } catch (error: any) {
      logger.error("[DataParsingTool XLSX] Error parsing Excel:", error);
      throw new Error(`Excel parsing failed: ${error.message}`);
    }
  }

  async execute(input: DataParsingInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { userId: contextUserId, fileId, fileType, fileName } = input;
    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[DataParsingTool User:${userId?.substring(0,8) || "N/A"} File:${fileId}]`;
    logger.info(`${logPrefix} Starting parsing for ${fileType} file: ${fileName || fileId}`);

    const queryInputForStructuredData = { ...input };

    if (!userId) return { error: "User ID is required for file operations.", result: "Minato cannot parse data without knowing who it's for.", structuredData: {result_type: "parsed_data_internal", source_api:"internal_parser", query: queryInputForStructuredData, data: null, error: "User ID required"} };
    if (!fileId || !fileType) return { error: "Missing fileId or fileType.", result: "Minato needs file details to parse.", structuredData: {result_type: "parsed_data_internal", source_api:"internal_parser", query: queryInputForStructuredData, data: null, error: "Missing fileId or fileType"} };
    if (!supabaseAdmin) {
      logger.error(`${logPrefix} Supabase admin client not available.`);
      return { error: "Storage service misconfiguration.", result: "Minato's storage connection isn't working right now.", structuredData: {result_type: "parsed_data_internal", source_api:"internal_parser", query: queryInputForStructuredData, data: null, error: "Storage service misconfiguration"} };
    }

    let parsedData: ParsedDataObject;
    const effectiveFileName = fileName || fileId.split("/").pop() || "Uploaded File";
    let outputStructuredData: DataParsedOutput = {
      result_type: "parsed_data_internal",
      source_api: "internal_parser",
      data: { headers: [], rows: [], rowCount: 0, columnCount: 0, fileName: effectiveFileName, fileType },
      error: undefined,
    };

    try {
      logger.debug(`${logPrefix} Downloading file from Supabase Storage: ${MEDIA_UPLOAD_BUCKET}/${fileId}`);
      const { data: fileDataBlob, error: downloadError } = await supabaseAdmin.storage.from(MEDIA_UPLOAD_BUCKET).download(fileId);
      if (downloadError) {
        logger.error(`${logPrefix} Supabase download error:`, downloadError);
        throw new Error(`Failed to download file '${effectiveFileName}' from storage: ${downloadError.message}`);
      }
      if (!fileDataBlob) {
        throw new Error(`Downloaded file data for '${effectiveFileName}' is null or undefined.`);
      }
      const fileBuffer = Buffer.from(await fileDataBlob.arrayBuffer());

      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Parsing aborted after download for '${effectiveFileName}'.`);
        return { error: "Data parsing cancelled.", result: "Cancelled.", structuredData: {result_type: "parsed_data_internal", source_api:"internal_parser", query: queryInputForStructuredData, data: null, error: "Cancelled"} };
      }

      const mimeTypeLower = fileType.toLowerCase();
      const fileIdLower = fileId.toLowerCase();
      if (mimeTypeLower === "text/csv" || fileIdLower.endsWith(".csv")) {
        parsedData = await this.parseCsv(fileBuffer);
      } else if (
        mimeTypeLower === "application/vnd.ms-excel" ||
        mimeTypeLower === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        fileIdLower.endsWith(".xlsx") || fileIdLower.endsWith(".xls")
      ) {
        parsedData = await this.parseXlsx(fileBuffer);
      } else {
        throw new Error(`Unsupported file type for parsing: ${fileType} (File: '${effectiveFileName}')`);
      }

      parsedData.fileName = effectiveFileName;
      parsedData.fileType = fileType;
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Parsing aborted after processing for '${effectiveFileName}'.`);
        return { error: "Data parsing cancelled.", result: "Cancelled.", structuredData: {result_type: "parsed_data_internal", source_api:"internal_parser", query: queryInputForStructuredData, data: null, error: "Cancelled"} };
      }

      outputStructuredData.data = parsedData;
      outputStructuredData.error = undefined;

      if (parsedData.rowCount === 0 && parsedData.headers.length === 0) {
        logger.warn(`${logPrefix} Parsed file '${effectiveFileName}' but it appears to be empty or unparsable.`);
        const emptyResultMessage = `Minato parsed your file '${parsedData.fileName}', ${input.context?.userName || "User"}, but it seems to be empty or doesn't contain tabular data. Please check the file content.`;
        outputStructuredData.error = "File is empty or not in a parsable table format.";
        return { result: emptyResultMessage, structuredData: outputStructuredData, error: outputStructuredData.error };
      }

      logger.info(`${logPrefix} Successfully parsed '${parsedData.fileName}'. Rows: ${parsedData.rowCount}, Cols: ${parsedData.columnCount}`);
      return {
        result: `Minato successfully parsed your file '${parsedData.fileName}', ${input.context?.userName || "User"}. It contains ${parsedData.rowCount} rows and ${parsedData.columnCount} columns. Minato is ready to help you analyze it!`,
        structuredData: outputStructuredData,
      };
    } catch (error: any) {
      logger.error(`${logPrefix} Parsing failed for '${effectiveFileName}': ${error.message}`, error.stack);
      const userErrorMessage = `Sorry, ${input.context?.userName || "User"}, Minato had trouble parsing your file '${effectiveFileName}'. The error was: ${error.message.substring(0,100)}`;
      outputStructuredData.error = `Data parsing failed for '${effectiveFileName}': ${error.message}`;
      return { error: `Data parsing failed: ${error.message}`, result: userErrorMessage, structuredData: outputStructuredData };
    }
  }
}