import * as nfcpcsc from 'nfc-pcsc';
const { NFC, Reader }: any = nfcpcsc;
import dotenv from "dotenv";
dotenv.config();

import Database from './database';
import { ParticipantType } from './types/database';


const ledSuccess = [0b00101110, [0x05, 0x01, 0x01, 0x01]];
const ledWarning = [0b11111111, [0x03, 0x01, 0x03, 0x01]];
const ledError = [0b01001101, [0x01, 0x01, 0x05, 0x01]];
// a) led settings: "0b" + 8 bool settings
// 1) green will blink
// 2) red will blink
// 3) green state at start
// 4) red state at start
// 5) green state will be updated
// 6) red state will be updated
// 7) green on / off at the end (short amount)
// 8) red on / off at the end (short amount)

// b) blinking behaviour 4 settings each with "0x" + hex
// 1) odd phased time x * 100ms
// 2) even phased time x * 100ms
// 3) number of repetitions
// 4) buzzer setting:
// 00 no sound
// 01 sound if led on
// 02 sound if led off
// 03 always sound



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
        try{
          await db.auth(DB_EMAIL, DB_PASS);
          const participant: ParticipantType = await db.getUserByRfid(card.uid);

          if(!participant) {
            await reader.led(...ledError);
            return console.error('This Tag is not registered.');
          }

          const now = new Date();
          const currentDateForDb = now.toLocaleDateString('en-CA').replaceAll('-', '');
          const currentTimeForDb = now.getHours() * 60 + now.getMinutes();
          const currentDateForHumans = now.toLocaleDateString('de-DE');
          const currentTimeForHumans = `${now.getHours()}:${now.getMinutes()}`;
          const blockingPeriodInMinutes = 5;
          const todaysPresence = await db.fetchPresenceByUidAndDate(participant.tn_id, currentDateForDb);

          if (todaysPresence) {
            if (todaysPresence.anw_bis_uhrzeit) {
              await reader.led(...ledWarning);
              console.error(`${participant.tn_vorname} ${participant.tn_nachname} already logged for today.`);
              console.info('Ready to READ.');
              return;
            }
            if (todaysPresence.anw_von_uhrzeit) {
              if (todaysPresence.anw_von_uhrzeit + blockingPeriodInMinutes > currentTimeForDb) {
                await reader.led(...ledWarning);
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
              await reader.led(...ledSuccess);
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
          await reader.led(...ledSuccess);
          console.warn(`${participant.tn_vorname} ${participant.tn_nachname}'s arrival logged on ${currentDateForHumans} at ${currentTimeForHumans}`);
          console.info('Ready to READ.');
          return;
        } catch(error) {
          console.error(error);
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