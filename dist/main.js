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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nfcpcsc = __importStar(require("nfc-pcsc"));
const { NFC, Reader, CONNECT_MODE_DIRECT, ACR122 } = nfcpcsc;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const database_1 = __importDefault(require("./database"));
(async function main() {
    try {
        const DB_URL = process.env.DB_URL;
        const DB_KEY = process.env.DB_KEY;
        const DB_EMAIL = process.env.DB_EMAIL;
        const DB_PASS = process.env.DB_PASS;
        const db = new database_1.default(DB_URL, DB_KEY);
        if (!db)
            throw Error('DB init ERROR');
        await db.auth(DB_EMAIL, DB_PASS);
        // show all 
        // console.log(await db.client
        //   .from('teilnehmer')
        //   .select()
        // )
        // get current days presence for floh
        // console.log(await db.client
        // .from('anwesenheiten')
        // .select()
        // .eq('anw_tn_id', 40)
        // .eq('anw_datum', '20241029'));
        // delete current days presence for floh
        // console.log(await db.client
        //   .from('anwesenheiten')
        //   .delete()
        //   .eq('anw_tn_id', 40)
        //   .eq('anw_datum', '20241029'));
        // get floh data
        // console.log(await db.client
        //   .from('teilnehmer')
        //   .select()
        //   .eq('tn_id', 40))
        // db.getUserByRfid('e8101c3e')
        // set floh rfid
        // console.log(await db.client
        // .from('teilnehmer')
        // .update({
        //   tn_rfid: null
        // })
        // .eq('tn_id', 40))
        const nfc = new NFC();
        console.info('NFC listener initialized. Waiting to detect reader...');
        nfc.on('reader', async (reader) => {
            console.info(`NFC Reader detected: ${reader.name}`);
            console.info('Ready to READ.');
            reader.on('card', async (card) => {
                if (card.type === 'TAG_ISO_14443_4') {
                    console.info('Smartphone detected.');
                }
                if (card.type != 'TAG_ISO_14443_4') {
                    console.info('Non-Smartphone NFC tag detected. UID:', card.uid);
                }
                const participant = await db.getUserByRfid(card.uid);
                if (participant) {
                    const now = new Date();
                    const currentDate = now.toLocaleDateString('en-CA').replaceAll('-', '');
                    const currentTime = now.getHours() * 60 + now.getMinutes();
                    const blockingPeriodInMinutes = 5;
                    const todaysPresence = await db.fetchPresenceByUidAndDate(participant.tn_id, currentDate);
                    if (todaysPresence) {
                        if (todaysPresence.anw_bis_uhrzeit) {
                            console.error(`${participant.tn_vorname} ${participant.tn_nachname} already logged for today.`);
                            return;
                        }
                        if (todaysPresence.anw_von_uhrzeit) {
                            if (todaysPresence.anw_von_uhrzeit + blockingPeriodInMinutes > currentTime) {
                                console.info(`${participant.tn_vorname} ${participant.tn_nachname} was logged within the last ${blockingPeriodInMinutes} minutes`);
                                return;
                            }
                            db.updatePresenceWithDeparture(participant.tn_id, currentDate, currentTime);
                            console.info(`${participant.tn_vorname} ${participant.tn_nachname}'s departure logged`);
                            return;
                        }
                    }
                    db.insertPresence(participant.tn_id, currentDate, currentTime, participant.tn_modifikator);
                    console.info(`${participant.tn_vorname} ${participant.tn_nachname}'s arrival logged`);
                    return;
                }
            });
            reader.on('error', (error) => {
                console.error(`Error occurred on reader ${reader.name}:`, error);
            });
            reader.on('end', () => {
                console.info(`Reader disconnected: ${reader.name}`);
            });
        });
        nfc.on('error', (error) => {
            console.error('NFC error:', error);
        });
    }
    catch (error) {
        console.error('Error initializing NFC listener:', error);
    }
})();
