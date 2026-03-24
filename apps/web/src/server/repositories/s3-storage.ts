import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Redacted } from "effect";

type TransformableBody = {
  readonly transformToByteArray: () => Promise<Uint8Array>;
};

const collectAsyncIterableBytes = async (
  source: AsyncIterable<Uint8Array | string>,
): Promise<Uint8Array> => {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for await (const chunk of source) {
    const bytes = typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    chunks.push(bytes);
    totalLength += bytes.byteLength;
  }

  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
};

const readBodyAsBytes = async (body: unknown): Promise<Uint8Array> => {
  if (body instanceof Uint8Array) {
    return body;
  }

  if (body instanceof Blob) {
    return new Uint8Array(await body.arrayBuffer());
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToByteArray" in body &&
    typeof body.transformToByteArray === "function"
  ) {
    return (body as TransformableBody).transformToByteArray();
  }

  if (
    typeof body === "object" &&
    body !== null &&
    Symbol.asyncIterator in body
  ) {
    return collectAsyncIterableBytes(body as AsyncIterable<Uint8Array | string>);
  }

  if (body instanceof ReadableStream) {
    return collectAsyncIterableBytes(body as AsyncIterable<Uint8Array | string>);
  }

  throw new Error("Unsupported S3 response body");
};

type S3StorageFile = {
  readonly write: (value: string | Uint8Array) => Promise<void>;
  readonly text: () => Promise<string>;
  readonly delete: () => Promise<void>;
  readonly arrayBuffer: () => Promise<ArrayBuffer>;
  readonly signedUrl: (options?: {
    readonly contentDisposition?: string;
    readonly contentType?: string;
    readonly expiresInSeconds?: number;
  }) => Promise<string>;
};

type S3StorageClient = {
  readonly file: (key: string) => S3StorageFile;
};

export const makeS3StorageClient = (config: {
  readonly accessKeyId: Redacted.Redacted<string>;
  readonly secretAccessKey: Redacted.Redacted<string>;
  readonly bucket: string;
  readonly endpoint: URL;
  readonly region: string;
}): S3StorageClient => {
  const client = new S3Client({
    bucketEndpoint: false,
    credentials: {
      accessKeyId: Redacted.value(config.accessKeyId),
      secretAccessKey: Redacted.value(config.secretAccessKey),
    },
    endpoint: config.endpoint.toString(),
    forcePathStyle: true,
    region: config.region,
  });

  return {
    file: (key) => ({
      write: async (value) => {
        await client.send(
          new PutObjectCommand({
            Body: value,
            Bucket: config.bucket,
            Key: key,
          }),
        );
      },
      text: async () => {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }),
        );

        if (response.Body == null) {
          throw new Error("S3 object body missing");
        }

        return new TextDecoder().decode(await readBodyAsBytes(response.Body));
      },
      delete: async () => {
        await client.send(
          new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }),
        );
      },
      arrayBuffer: async () => {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }),
        );

        if (response.Body == null) {
          throw new Error("S3 object body missing");
        }

        const bytes = await readBodyAsBytes(response.Body);
        return new Uint8Array(bytes).buffer as ArrayBuffer;
      },
      signedUrl: async (options) =>
        getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
            ResponseContentDisposition: options?.contentDisposition,
            ResponseContentType: options?.contentType,
          }),
          {
            expiresIn: options?.expiresInSeconds ?? 300,
          },
        ),
    }),
  };
};
