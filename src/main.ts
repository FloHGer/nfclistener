import * as nfcpcsc from 'nfc-pcsc';
const { NFC, Reader, CONNECT_MODE_DIRECT, ACR122 }: any = nfcpcsc;
import dotenv from "dotenv";
dotenv.config();

import Database from './database';
import { ParticipantType } from './types/database';


(async function main () {
  try {
    const DB_URL = process.env.DB_URL;
    const DB_KEY = process.env.DB_KEY;
    const DB_EMAIL = process.env.DB_EMAIL;
    const DB_PASS = process.env.DB_PASS;

    const db = new Database(DB_URL!, DB_KEY!);
    if (!db) throw Error('DB init ERROR');
    await db.auth(DB_EMAIL, DB_PASS);

    const nfc = new NFC();
    console.info('NFC listener initialized. Waiting to detect reader...');


    nfc.on('reader', async (reader: InstanceType<typeof Reader>) => {
      console.info(`NFC Reader detected: ${reader.name}`);
      console.info('Ready to READ.');

      reader.on('card', async (card :any) => {
        if (card.type === 'TAG_ISO_14443_4') {
          console.info('Smartphone detected.');
        } 
        if (card.type != 'TAG_ISO_14443_4') {
          console.info('Non-Smartphone NFC tag detected. UID:', card.uid);
        }

        const participant: ParticipantType = await db.getUserByRfid(card.uid);

        if(participant) {
          const now = new Date();
          const currentDateForDb = now.toLocaleDateString('en-CA').replaceAll('-', '');
          const currentTimeForDb = now.getHours() * 60 + now.getMinutes();
          const currentDateForHumans = now.toLocaleDateString('de-DE');
          const currentTimeForHumans = `${now.getHours()}:${now.getMinutes()}`;
          const blockingPeriodInMinutes = 5;
          const todaysPresence = await db.fetchPresenceByUidAndDate(participant.tn_id, currentDateForDb);

          if (todaysPresence) {
            if (todaysPresence.anw_bis_uhrzeit) {
              console.error(`${participant.tn_vorname} ${participant.tn_nachname} already logged for today.`);
              console.info('Ready to READ.');
              return;
            }
            if (todaysPresence.anw_von_uhrzeit) {
              if (todaysPresence.anw_von_uhrzeit + blockingPeriodInMinutes > currentTimeForDb) {
                console.warn(`${
                  participant.tn_vorname} ${participant.tn_nachname
                } was logged within the last ${blockingPeriodInMinutes} minutes`);
                console.info('Ready to READ.');
                return;
              }

              await db.updatePresenceWithDeparture(
                participant.tn_id,
                currentDateForDb,
                currentTimeForDb,
              )
              console.warn(`${participant.tn_vorname} ${participant.tn_nachname}'s departure logged on ${currentDateForHumans} at ${currentTimeForHumans}`);
              console.warn(`Time difference today: ${await db.getTimeDifferenceInMin(participant.tn_id, currentDateForDb)}min`)
              console.info('Ready to READ.');
              return;
            }
          }

          await db.insertPresence(
            participant.tn_id,
            currentDateForDb,
            currentTimeForDb,
            participant.tn_modifikator,
          )
          console.warn(`${participant.tn_vorname} ${participant.tn_nachname}'s arrival logged on ${currentDateForHumans} at ${currentTimeForHumans}`);
          console.info('Ready to READ.');
          return;
        }
      });

      reader.on('error', (error :Error) => {
        console.error(`Error occurred on reader ${reader.name}:`, error);
      });

      reader.on('end', () => {
        console.info(`Reader disconnected: ${reader.name}`);
      });
    });

    nfc.on('error', (error :Error) => {
      console.error('NFC error:', error);
    });

  } catch (error) {
    console.error('Error initializing NFC listener:', error);
  }
})()