declare module "qrcode" {
  export type QrToStringOptions = {
    readonly margin?: number;
    readonly type?: "svg";
    readonly width?: number;
  };

  const QRCode: {
    readonly toString: (text: string, options?: QrToStringOptions) => Promise<string>;
  };

  export default QRCode;
}
