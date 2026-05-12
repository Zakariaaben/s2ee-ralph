import {
  type CompanyActiveInterviewDetail,
  CompanyCompletedInterviewExportFile,
  type AuthenticatedActor,
  type CompanyCompletedInterviewLedgerEntry,
  type CvProfileFile,
  type CvProfileDownloadUrl,
  type Interview,
} from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { CompanyRepository } from "../repositories/company-repository";
import { CvProfileRepository } from "../repositories/cv-profile-repository";
import { InterviewRepository } from "../repositories/interview-repository";

const requireCompanyActor = (actor: AuthenticatedActor) =>
  Effect.gen(function* () {
    if (actor.role !== "company") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

const uniqueValues = <Value>(values: ReadonlyArray<Value>) => {
  const seen = new Set<Value>();
  const unique: Array<Value> = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    unique.push(value);
  }

  return unique;
};

const toFileNameSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "company";

const toReadableFileNameSegment = (value: string) =>
  value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "candidat";

const extensionFromFileName = (fileName: string) => {
  const dotIndex = fileName.lastIndexOf(".");

  return dotIndex > 0 ? fileName.slice(dotIndex) : "";
};

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

const crc32 = (contents: Uint8Array): number => {
  let crc = 0xffffffff;

  for (const byte of contents) {
    crc = crc32Table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
};

const writeUInt16 = (value: number): Uint8Array => {
  const bytes = new Uint8Array(2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, value, true);
  return bytes;
};

const writeUInt32 = (value: number): Uint8Array => {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value, true);
  return bytes;
};

const concatBytes = (chunks: ReadonlyArray<Uint8Array>): Uint8Array => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
};

const textBytes = (value: string): Uint8Array => new TextEncoder().encode(value);

const makeStoredZip = (
  files: ReadonlyArray<{
    readonly path: string;
    readonly contents: Uint8Array;
  }>,
): Uint8Array => {
  const localFileChunks: Array<Uint8Array> = [];
  const centralDirectoryChunks: Array<Uint8Array> = [];
  let offset = 0;

  for (const file of files) {
    const pathBytes = textBytes(file.path);
    const checksum = crc32(file.contents);
    const localHeader = concatBytes([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0x0800),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(checksum),
      writeUInt32(file.contents.byteLength),
      writeUInt32(file.contents.byteLength),
      writeUInt16(pathBytes.byteLength),
      writeUInt16(0),
      pathBytes,
    ]);
    const centralHeader = concatBytes([
      writeUInt32(0x02014b50),
      writeUInt16(20),
      writeUInt16(20),
      writeUInt16(0x0800),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(checksum),
      writeUInt32(file.contents.byteLength),
      writeUInt32(file.contents.byteLength),
      writeUInt16(pathBytes.byteLength),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(0),
      writeUInt32(offset),
      pathBytes,
    ]);

    localFileChunks.push(localHeader, file.contents);
    centralDirectoryChunks.push(centralHeader);
    offset += localHeader.byteLength + file.contents.byteLength;
  }

  const centralDirectory = concatBytes(centralDirectoryChunks);
  const endOfCentralDirectory = concatBytes([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(files.length),
    writeUInt16(files.length),
    writeUInt32(centralDirectory.byteLength),
    writeUInt32(offset),
    writeUInt16(0),
  ]);

  return concatBytes([...localFileChunks, centralDirectory, endOfCentralDirectory]);
};

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const columnName = (index: number): string => {
  let value = index + 1;
  let name = "";

  while (value > 0) {
    const modulo = (value - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    value = Math.floor((value - modulo) / 26);
  }

  return name;
};

const makeWorksheetXml = (rows: ReadonlyArray<ReadonlyArray<string | number | null>>): string =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<sheetData>` +
  rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;

      return (
        `<row r="${rowNumber}">` +
        row
          .map((value, columnIndex) => {
            const cellRef = `${columnName(columnIndex)}${rowNumber}`;

            if (typeof value === "number") {
              return `<c r="${cellRef}"><v>${value}</v></c>`;
            }

            return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(value ?? "")}</t></is></c>`;
          })
          .join("") +
        `</row>`
      );
    })
    .join("") +
  `</sheetData></worksheet>`;

const makeXlsxWorkbook = (rows: ReadonlyArray<ReadonlyArray<string | number | null>>): Uint8Array =>
  makeStoredZip([
    {
      path: "[Content_Types].xml",
      contents: textBytes(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
          `</Types>`,
      ),
    },
    {
      path: "_rels/.rels",
      contents: textBytes(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      path: "xl/workbook.xml",
      contents: textBytes(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets><sheet name="Interviews" sheetId="1" r:id="rId1"/></sheets>` +
          `</workbook>`,
      ),
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      contents: textBytes(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      path: "xl/worksheets/sheet1.xml",
      contents: textBytes(makeWorksheetXml(rows)),
    },
  ]);

const uniqueExportPath = (input: {
  readonly existingPaths: Set<string>;
  readonly folder: string;
  readonly fileName: string;
}): string => {
  const cleanName = input.fileName.replace(/[\\/:*?"<>|]+/g, "-").trim() || "cv.pdf";
  const dotIndex = cleanName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? cleanName.slice(0, dotIndex) : cleanName;
  const extension = dotIndex > 0 ? cleanName.slice(dotIndex) : "";
  let path = `${input.folder}/${cleanName}`;
  let counter = 2;

  while (input.existingPaths.has(path)) {
    path = `${input.folder}/${baseName}-${counter}${extension}`;
    counter += 1;
  }

  input.existingPaths.add(path);
  return path;
};

const makeInterviewExportRows = (
  entries: ReadonlyArray<CompanyCompletedInterviewLedgerEntry>,
): ReadonlyArray<ReadonlyArray<string | number | null>> => [
  [
    "Interview ID",
    "Candidat",
    "Etablissement",
    "Parcours",
    "Recruteur",
    "Statut",
    "Note",
    "Tags entreprise",
    "Notes",
    "CV",
    "Code presentation",
  ],
  ...entries.map((entry) => [
    entry.interview.id,
    `${entry.student.firstName} ${entry.student.lastName}`,
    entry.student.institution,
    `${entry.student.academicYear} / ${entry.student.major}`,
    entry.interview.recruiterName,
    entry.interview.status,
    entry.interview.score,
    entry.interview.companyTags.map((tag) => tag.label).join(", "),
    entry.interview.notes,
    entry.cvProfile.fileName,
    entry.cvProfile.presentationCode,
  ]),
];

type CompletedInterviewCvExportFile = {
  readonly entry: CompanyCompletedInterviewLedgerEntry;
  readonly file: CvProfileFile;
};

const makeCandidateCvExportFileName = (input: {
  readonly entry: CompanyCompletedInterviewLedgerEntry;
  readonly file: CvProfileFile;
}) => {
  const candidateName = toReadableFileNameSegment(
    `${input.entry.student.firstName} ${input.entry.student.lastName}`,
  );
  const extension = extensionFromFileName(input.file.fileName) || ".pdf";

  return `${candidateName}${extension}`;
};

const makeCompletedInterviewsExport = (input: {
  readonly companyName: string;
  readonly entries: ReadonlyArray<CompanyCompletedInterviewLedgerEntry>;
  readonly cvFiles: ReadonlyArray<CompletedInterviewCvExportFile>;
}): CompanyCompletedInterviewExportFile => {
  const companySegment = toFileNameSegment(input.companyName);
  const existingPaths = new Set<string>(["interviews.xlsx"]);
  const files = [
    {
      path: "interviews.xlsx",
      contents: makeXlsxWorkbook(makeInterviewExportRows(input.entries)),
    },
    ...input.cvFiles.map((cvFile) => ({
      path: uniqueExportPath({
        existingPaths,
        folder: "cvs",
        fileName: makeCandidateCvExportFileName(cvFile),
      }),
      contents: Buffer.from(cvFile.file.contentsBase64, "base64"),
    })),
  ];

  return new CompanyCompletedInterviewExportFile({
    fileName: `${companySegment}-interviews-export.zip`,
    contentType: "application/zip",
    contentsBase64: Buffer.from(makeStoredZip(files)).toString("base64"),
  });
};

export class InterviewService extends ServiceMap.Service<
  InterviewService,
  {
    readonly listCurrentCompanyInterviews: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<Interview>, HttpApiError.Forbidden>;
    readonly listCurrentCompanyInterviewDetails: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<CompanyActiveInterviewDetail>, HttpApiError.Forbidden>;
    readonly listCurrentCompanyCompletedInterviews: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<CompanyCompletedInterviewLedgerEntry>, HttpApiError.Forbidden>;
    readonly getCurrentCompanyInterviewDetail: (input: {
      readonly actor: AuthenticatedActor;
      readonly interviewId: string;
    }) => Effect.Effect<
      CompanyActiveInterviewDetail,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly getCurrentCompanyInterviewCvDownloadUrl: (input: {
      readonly actor: AuthenticatedActor;
      readonly interviewId: string;
    }) => Effect.Effect<CvProfileDownloadUrl, HttpApiError.Forbidden | HttpApiError.NotFound>;
    readonly exportCurrentCompanyCompletedInterviews: (input: {
      readonly actor: AuthenticatedActor;
      readonly includeCvFiles: boolean;
    }) => Effect.Effect<
      CompanyCompletedInterviewExportFile,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly startInterview: (input: {
      readonly actor: AuthenticatedActor;
      readonly recruiterId: string;
      readonly presentationCode: string;
    }) => Effect.Effect<Interview, HttpApiError.Forbidden | HttpApiError.NotFound>;
    readonly completeInterview: (input: {
      readonly actor: AuthenticatedActor;
      readonly interviewId: string;
      readonly score: number;
      readonly globalTagIds: ReadonlyArray<string>;
      readonly companyTagLabels: ReadonlyArray<string>;
      readonly notes: string;
    }) => Effect.Effect<
      Interview,
      HttpApiError.Forbidden | HttpApiError.BadRequest | HttpApiError.NotFound
    >;
    readonly cancelInterview: (input: {
      readonly actor: AuthenticatedActor;
      readonly interviewId: string;
      readonly notes: string;
    }) => Effect.Effect<Interview, HttpApiError.Forbidden | HttpApiError.NotFound>;
  }
>()("@project/web/InterviewService") {
  static readonly layer = Layer.effect(
    InterviewService,
    Effect.gen(function* () {
      const companyRepository = yield* CompanyRepository;
      const cvProfileRepository = yield* CvProfileRepository;
      const interviewRepository = yield* InterviewRepository;

      const resolveStartInterviewContext = (input: {
        readonly actor: AuthenticatedActor;
        readonly recruiterId: string;
        readonly presentationCode: string;
      }) =>
        Effect.gen(function* () {
          const companyActor = yield* requireCompanyActor(input.actor);
          const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

          if (!company) {
            return yield* Effect.fail(new HttpApiError.NotFound({}));
          }

          const recruiter = company.recruiters.find(
            (currentRecruiter) => currentRecruiter.id === input.recruiterId,
          );

          if (!recruiter) {
            return yield* Effect.fail(new HttpApiError.NotFound({}));
          }

          const preview = yield* cvProfileRepository.resolvePresentedPreviewByPresentationCode(
            input.presentationCode,
          );

          if (!preview) {
            return yield* Effect.fail(new HttpApiError.NotFound({}));
          }

          return {
            company,
            recruiter,
            preview,
          };
        });

      const resolveCurrentCompanyInterviewDetail = (input: {
        readonly actor: AuthenticatedActor;
        readonly interviewId: string;
      }) =>
        Effect.gen(function* () {
          const companyActor = yield* requireCompanyActor(input.actor);
          const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

          if (!company) {
            return yield* Effect.fail(new HttpApiError.NotFound({}));
          }

          const detail = yield* interviewRepository.getDetailByCompanyId({
            companyId: company.id,
            interviewId: input.interviewId,
          });

          if (!detail) {
            return yield* Effect.fail(new HttpApiError.NotFound({}));
          }

          return detail;
        });

      return InterviewService.of({
        listCurrentCompanyInterviews: (actor) =>
          Effect.gen(function* () {
            const companyActor = yield* requireCompanyActor(actor);
            const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

            if (!company) {
              return [];
            }

            return yield* interviewRepository.listByCompanyId(company.id);
          }),
        listCurrentCompanyInterviewDetails: (actor) =>
          Effect.gen(function* () {
            const companyActor = yield* requireCompanyActor(actor);
            const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

            if (!company) {
              return [];
            }

            return yield* interviewRepository.listActiveDetailsByCompanyId(company.id);
          }),
        listCurrentCompanyCompletedInterviews: (actor) =>
          Effect.gen(function* () {
            const companyActor = yield* requireCompanyActor(actor);
            const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

            if (!company) {
              return [];
            }

            return yield* interviewRepository.listCompletedLedgerByCompanyId(company.id);
          }),
        getCurrentCompanyInterviewDetail: ({ actor, interviewId }) =>
          resolveCurrentCompanyInterviewDetail({
            actor,
            interviewId,
          }),
        getCurrentCompanyInterviewCvDownloadUrl: ({ actor, interviewId }) =>
          Effect.gen(function* () {
            const detail = yield* resolveCurrentCompanyInterviewDetail({
              actor,
              interviewId,
            });
            const downloadUrl = yield* cvProfileRepository.getDownloadUrlForStudent({
              studentId: detail.student.id,
              cvProfileId: detail.cvProfile.id,
            });

            if (!downloadUrl) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return downloadUrl;
          }),
        exportCurrentCompanyCompletedInterviews: ({ actor, includeCvFiles }) =>
          Effect.gen(function* () {
            const companyActor = yield* requireCompanyActor(actor);
            const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

            if (!company) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            const completedInterviews = yield* interviewRepository.listCompletedLedgerByCompanyId(
              company.id,
            );

            const cvFiles = includeCvFiles
              ? yield* Effect.forEach(completedInterviews, (entry) =>
                  Effect.gen(function* () {
                    const cvFileExit = yield* Effect.exit(
                      cvProfileRepository.downloadForStudent({
                        studentId: entry.student.id,
                        cvProfileId: entry.cvProfile.id,
                      }),
                    );

                    if (cvFileExit._tag === "Failure" || !cvFileExit.value) {
                      return null;
                    }

                    return {
                      entry,
                      file: cvFileExit.value,
                    };
                  }),
                ).pipe(Effect.map((files) => files.filter((file) => file != null)))
              : [];

            return makeCompletedInterviewsExport({
              companyName: company.name,
              entries: completedInterviews,
              cvFiles,
            });
          }),
        startInterview: ({ actor, recruiterId, presentationCode }) =>
          Effect.gen(function* () {
            const { company, recruiter, preview } = yield* resolveStartInterviewContext({
              actor,
              recruiterId,
              presentationCode,
            });

            return yield* interviewRepository.createStarted({
              companyId: company.id,
              studentId: preview.student.id,
              cvProfileId: preview.cvProfile.id,
              recruiterName: recruiter.name,
            });
          }),
        completeInterview: ({ actor, interviewId, score, globalTagIds, companyTagLabels, notes }) =>
          Effect.gen(function* () {
            const companyActor = yield* requireCompanyActor(actor);
            const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

            if (!company) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            const completedInterview = yield* interviewRepository.completeActive({
              companyId: company.id,
              interviewId,
              score,
              globalTagIds: uniqueValues(globalTagIds),
              companyTagLabels: uniqueValues(companyTagLabels),
              notes,
            });

            if (!completedInterview) {
              return yield* Effect.fail(new HttpApiError.BadRequest({}));
            }

            return completedInterview;
          }),
        cancelInterview: ({ actor, interviewId, notes }) =>
          Effect.gen(function* () {
            const companyActor = yield* requireCompanyActor(actor);
            const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

            if (!company) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            const cancelledInterview = yield* interviewRepository.cancelActive({
              companyId: company.id,
              interviewId,
              notes,
            });

            if (!cancelledInterview) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return cancelledInterview;
          }),
      });
    }),
  ).pipe(
    Layer.provide(CompanyRepository.layer),
    Layer.provideMerge(CvProfileRepository.layer),
    Layer.provideMerge(InterviewRepository.layer),
  );
}
