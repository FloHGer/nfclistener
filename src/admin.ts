import readline from 'readline';
import * as nfcpcsc from 'nfc-pcsc';
const { NFC, Reader, CONNECT_MODE_DIRECT, ACR122 }: any = nfcpcsc;
import Database from './database';
import { PresenceType, ParticipantType } from './types/database';
import dotenv from "dotenv";
dotenv.config();

type Participant = {
  tn_vorname: string,
  tn_nachname: string,
  tn_id: string,
  tn_rfid: string,
};

const userInput = (prompt: string): Promise<string> => {
  const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => input.question(prompt, answer => {
    input.close();
    resolve(answer);
  }));
};


(async function main () {
  try {
    const DB_URL = process.env.DB_URL;
    const DB_KEY = process.env.DB_KEY;
    const DB_EMAIL = process.env.DB_EMAIL;
    const DB_PASS = process.env.DB_PASS;

    if (!DB_URL || !DB_KEY) throw Error('DB parameter missing');
    const db = new Database(DB_URL, DB_KEY);
    if (!db) throw Error('DB init ERROR');
    await db.auth(DB_EMAIL, DB_PASS);

    const nfc = new NFC();
    console.info('NFC listener initialized. Waiting to detect reader...');

    nfc.on('reader', async (reader: InstanceType<typeof Reader>) => {
      console.info(`NFC Reader detected: ${reader.name}`);
      console.info('Ready to READ.');

      reader.on('card', async (card :any) => {
        const participantList = await db.getParticipantsListWithNamesAndIds();
        if (!participantList) throw Error('Participants list not fetched.');

        for (const participant of participantList) {
          if (participant.tn_rfid === `["${card.uid}"]`) {
            console.info(`Tag is already assigned to ${participant.tn_vorname} ${participant.tn_nachname}`)
            let answer: string;
            do {
              answer = (await userInput('Do you want to [r]emove the tag or [a]pply it to another participant?\n')).toLowerCase();
            } while (answer != 'r' &&  answer != 'a');

            await db.removeRfid(participant.tn_id);
            console.warn(`Tag ${card.uid} detached from ${participant.tn_vorname} ${participant.tn_nachname}`);

            if (answer === 'r') {
              console.info('\nReady to READ.');
              return;
            }
            break;
          }
        }

        for (const index in participantList) {
          const participant: Participant = participantList[parseInt(index)];
          console.info(`${index}: ${participant.tn_vorname} ${participant.tn_nachname}`)
        }

        let selectedParticipantIndex :number;
        do {
          selectedParticipantIndex = parseInt(await userInput('----\nSelect index of the user to attach the tag to:'));
        } while(!participantList.find((participant : ParticipantType) => {
          return participant.tn_id === participantList[selectedParticipantIndex].tn_id;
        }
        ));
        const selectedUser: Participant = participantList[selectedParticipantIndex];

        const updatedParticipant: ParticipantType = await db.updateParticipantWithRfid(card.uid, selectedUser.tn_id);
        
        console.warn(`Tag added to ${selectedUser.tn_vorname} ${selectedUser.tn_nachname}`);
        console.info(updatedParticipant);
        console.info('\nReady to READ.');
      });

      reader.on('error', (error :Error) => {
        console.error(`Error occurred on reader ${reader.name}:`, error);
      });

      reader.on('end', () => {
        console.info(`Reader disconnected: ${reader.name}`);
      });
    });

  } catch (error) {
    console.error(error)
  }
})()
