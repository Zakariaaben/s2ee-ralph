import { Schema } from "effect";

export class CompanyCompletedInterviewExportFile extends Schema.Class<CompanyCompletedInterviewExportFile>(
  "CompanyCompletedInterviewExportFile",
)({
  fileName: Schema.String,
  contentType: Schema.String,
  contentsBase64: Schema.String,
}) {}
