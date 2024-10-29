"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { NFC, Reader } from 'nfc-pcsc';
const nfcpcsc = __importStar(require("nfc-pcsc"));
const { NFC, Reader, CONNECT_MODE_DIRECT, ACR122 } = nfcpcsc;
const fs = __importStar(require("fs"));
const csv_writer_1 = require("./csv_writer");
try {
    console.log('NFC listener initialized. Waiting to detect reader...');
    const nfc = new NFC();
    nfc.on('reader', async (reader) => {
        console.log(`NFC Reader detected: ${reader.name}`);
        // try {
        //   await reader.connect(CONNECT_MODE_DIRECT);
        //   // await reader.setBuzzerOutput(false);
        //   // await reader.led(0b01011101, [0xFF, 0xFF, 0xFF, 0xFF]);
        //   await reader.disconnect();
        // } catch (err) {
        //   console.info(`initial sequence error`, reader, err);
        // }
        reader.on('card', async (card) => {
            console.log(`UID: ${card.uid}`);
            console.log('la');
            try {
                const AID = '1'; // Replace with the actual AID
                await reader.transmit(Buffer.from(`00A40400${AID.length.toString(16).padStart(2, '0')}${AID}`, 'hex'), 256);
                console.log('le');
            }
            catch (error) {
                console.log('lu');
                console.error(`Error: ${error}`);
            }
            if (card.type === 'ISO_14443_4') {
                console.log('Smartphone detected. UID:', card.uid);
            }
            if (card.type != 'ISO_14443_4') {
                console.log('Non-smartphone NFC tag detected. UID:', card.uid);
            }
            const nameToUidMap = JSON.parse(fs.readFileSync('participants.json', 'utf-8'));
            let participant = null;
            for (const name in nameToUidMap) {
                if (nameToUidMap[name] === card.uid) {
                    participant = name;
                    break;
                }
            }
            if (participant) {
                const csvWriter = new csv_writer_1.MyCsvWriter(participant, card.uid);
                const result = await csvWriter.logWithTimestamp();
                if (result == 'SUCCESS') {
                    // console.log('before ledcontrol')
                    // ACR122.ledControl("SUCCESS_MULTIPLE");
                }
            }
        });
        reader.on('error', (error) => {
            console.error(`Error occurred on reader ${reader.name}:`, error);
        });
        reader.on('end', () => {
            console.log(`Reader disconnected: ${reader.name}`);
        });
    });
    nfc.on('error', (error) => {
        console.error('NFC error:', error);
    });
}
catch (error) {
    console.error('Error initializing NFC listener:', error);
}
