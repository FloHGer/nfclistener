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
const readline_1 = __importDefault(require("readline"));
const nfcpcsc = __importStar(require("nfc-pcsc"));
const { NFC, Reader, CONNECT_MODE_DIRECT, ACR122 } = nfcpcsc;
const database_1 = __importDefault(require("./database"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const userInput = (prompt) => {
    const input = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => input.question(prompt, answer => {
        input.close();
        resolve(answer);
    }));
};
(async function main() {
    try {
        const DB_URL = process.env.DB_URL;
        const DB_KEY = process.env.DB_KEY;
        const DB_EMAIL = process.env.DB_EMAIL;
        const DB_PASS = process.env.DB_PASS;
        if (!DB_URL || !DB_KEY)
            throw Error('DB parameter missing');
        const db = new database_1.default(DB_URL, DB_KEY);
        if (!db)
            throw Error('DB init ERROR');
        await db.auth(DB_EMAIL, DB_PASS);
        const nfc = new NFC();
        console.info('NFC listener initialized. Waiting to detect reader...');
        nfc.on('reader', async (reader) => {
            console.info(`NFC Reader detected: ${reader.name}`);
            console.info('Ready to READ.');
            reader.on('card', async (card) => {
                const participantList = await db.getParticipantsListWithNamesAndIds();
                if (!participantList)
                    throw Error('Participants list not fetched.');
                for (const participant of participantList) {
                    if (participant.tn_rfid === `["${card.uid}"]`) {
                        console.info(`Tag is already assigned to ${participant.tn_vorname} ${participant.tn_nachname}`);
                        let answer;
                        do {
                            answer = (await userInput('Do you want to [r]emove the tag or [a]pply it to another participant?\n')).toLowerCase();
                        } while (answer != 'r' && answer != 'a');
                        if (answer === 'r') {
                            await db.removeRfid(participant.tn_id);
                            console.warn(`Tag ${card.uid} detached from ${participant.tn_vorname} ${participant.tn_nachname}`);
                            console.info('\nReady to WRITE.');
                            return;
                        }
                        break;
                    }
                }
                for (const index in participantList) {
                    const participant = participantList[parseInt(index)];
                    console.info(`${index}: ${participant.tn_vorname} ${participant.tn_nachname}`);
                }
                let selectedParticipantId;
                do {
                    selectedParticipantId = parseInt(await userInput('----\nSelect index of the user to attach the tag to:'));
                } while (!participantList.find((participant) => participant.tn_id === selectedParticipantId));
                const selectedUser = participantList[selectedParticipantId];
                const updatedParticipant = await db.updateParticipantWithRfid(card.uid, selectedUser.tn_id);
                console.warn(`Tag added to ${selectedUser.tn_vorname} ${selectedUser.tn_nachname}`);
                console.info(updatedParticipant);
                console.info('\nReady to WRITE.');
            });
            reader.on('error', (error) => {
                console.error(`Error occurred on reader ${reader.name}:`, error);
            });
            reader.on('end', () => {
                console.info(`Reader disconnected: ${reader.name}`);
            });
        });
    }
    catch (error) {
        console.error(error);
    }
})();
