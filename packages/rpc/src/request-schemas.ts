import {
  Effect,
  Option,
  Schema,
  SchemaIssue,
  SchemaTransformation,
} from "effect";

export const RequiredText = Schema.Trim.pipe(
  Schema.check(Schema.isNonEmpty()),
);

export const RoomCode = RequiredText.pipe(
  Schema.decode(SchemaTransformation.toUpperCase()),
);

export const PositiveInteger = Schema.Number.check(Schema.isInt()).pipe(
  Schema.check(Schema.isGreaterThan(0)),
);

const validInterviewScore = Schema.makeFilter<number>((value) => {
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    return "Expected an interview score between 1 and 5";
  }

  return true;
});

export const InterviewScore = Schema.Number.pipe(
  Schema.check(validInterviewScore),
);

export const VocabularyEntryId = RequiredText;

export const VocabularyEntryLabel = RequiredText;

export const InterviewCompanyTagLabel = RequiredText;

export const InterviewNotes = Schema.Trim;

const base64ContentsPattern =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const invalidBase64ContentsMessage = "Expected non-empty base64-encoded file contents";

const validBase64Contents = Schema.makeFilter<string>((value) => {
  if (!base64ContentsPattern.test(value)) {
    return invalidBase64ContentsMessage;
  }

  return Buffer.from(value, "base64").byteLength > 0 || invalidBase64ContentsMessage;
});

export const Base64FileContents = RequiredText.pipe(
  Schema.check(validBase64Contents),
);

const uniqueIds = Schema.makeFilter<ReadonlyArray<{ readonly id: string }>>(
  (entries) => {
    const seenIds = new Set<string>();

    for (const entry of entries) {
      if (seenIds.has(entry.id)) {
        return "Expected vocabulary entry ids to be unique";
      }

      seenIds.add(entry.id);
    }

    return true;
  },
);

export const UniqueIdArray = <S extends Schema.Schema<{ readonly id: string }>>(
  item: S,
) => Schema.Array(item).check(uniqueIds);

const studentQrIdentityPrefix = "student:v1:";
const invalidStudentQrIdentityMessage = "Expected a student QR identity";

export const StudentQrIdentity = Schema.Trim.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformOrFail({
      decode: (qrIdentity) => {
        if (!qrIdentity.startsWith(studentQrIdentityPrefix)) {
          return Effect.fail(
            new SchemaIssue.InvalidValue(Option.some(qrIdentity), {
              message: invalidStudentQrIdentityMessage,
            }),
          );
        }

        const studentId = qrIdentity.slice(studentQrIdentityPrefix.length).trim();

        if (studentId.length === 0) {
          return Effect.fail(
            new SchemaIssue.InvalidValue(Option.some(qrIdentity), {
              message: invalidStudentQrIdentityMessage,
            }),
          );
        }

        return Effect.succeed(studentId);
      },
      encode: (studentId) =>
        Effect.succeed(`${studentQrIdentityPrefix}${studentId}`),
    }),
  ),
);
