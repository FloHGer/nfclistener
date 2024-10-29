declare module 'nfc-pcsc' {
  export class NFC {
      on(event: string, callback: (reader: Reader) => void): void;
  }

  export class Reader {
      name: string;
      on(event: string, callback: (data: any) => void): void;
      atexit(callback: () => void): void;
      transmit(data: Buffer, len: number): Promise<Buffer>;
  }

  export class ACR122 {
    ledControl(pattern: string): void;
  }
}
