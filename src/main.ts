import * as nfcpcsc from 'nfc-pcsc';
const { NFC, Reader, CONNECT_MODE_DIRECT, ACR122 }: any = nfcpcsc;
import dotenv from "dotenv";
dotenv.config();

import Database from './database';
import { UserType } from './types/database';





(async function main () {
  try {
    const DB_URL = process.env.DB_URL;
    const DB_KEY = process.env.DB_KEY;
    const DB_EMAIL = process.env.DB_EMAIL;
    const DB_PASS = process.env.DB_PASS;

    const db = new Database(DB_URL!, DB_KEY!);
    if (!db) throw Error('DB init ERROR');
    await db.auth(DB_EMAIL, DB_PASS);

    // get current days presence for floh
    const x = await db.client
    .from('anwesenheiten')
    .select()
    .eq('anw_tn_id', 40)
    .eq('anw_datum', '20241029');
    console.log(x.data)

    // delete current days presence for floh
    // const x = await db.client
    //   .from('anwesenheiten')
    //   .delete()
    //   .eq('anw_tn_id', 40)
    //   .eq('anw_datum', '20241029');
    //   console.log(x.data)

    // get floh data
    // const x = await db.client
    //   .from('teilnehmer')
    //   .select()
    //   .eq('tn_id', 40)
    //   console.log(x.data)

    // db.getUserByRfid('e8101c3e')

    // set floh rfid
    // const x = await db.client
    // .from('teilnehmer')
    // .update({
    //   tn_rfid: ['e8101c3e']
    // })
    // .eq('tn_id', 40)
    // console.log(x.data)

    const nfc = new NFC();
    console.info('NFC listener initialized. Waiting to detect reader...');

    nfc.on('reader', async (reader: InstanceType<typeof Reader>) => {
      console.info(`NFC Reader detected: ${reader.name}`);

      reader.on('card', async (card :any) => {

        if (card.type === 'ISO_14443_4') {
          console.info('Smartphone detected. UID:', card.uid);
        } 
        if (card.type != 'ISO_14443_4') {
          console.info('Non-smartphone NFC tag detected. UID:', card.uid);
        }

        const user: UserType = await db.getUserByRfid(card.uid);

        if(user) {
          const now = new Date();
          const currentDate = now.toLocaleDateString('en-CA').replaceAll('-', '');
          const currentTime = now.getHours() * 60 + now.getMinutes();
          const blockingPeriodInMinutes = 5;
          const todaysPresence = await db.fetchPresenceByUidAndDate(user.tn_id, currentDate);

          if (todaysPresence) {
            if (todaysPresence.anw_bis_uhrzeit) {
              console.error(`${user.tn_vorname} ${user.tn_nachname} already logged for today.`);
              return;
            }
            if (todaysPresence.anw_von_uhrzeit) {
              if (todaysPresence.anw_von_uhrzeit + blockingPeriodInMinutes > currentTime) {
                console.info(`${user.tn_vorname} ${user.tn_nachname} was logged within the last ${blockingPeriodInMinutes} minutes`);
                return;
              }

              db.updatePresenceWithDeparture(
                user.tn_id,
                currentDate,
                currentTime,
              )
              console.info(`${user.tn_vorname} ${user.tn_nachname}'s departure logged`);
              return;
            }
          }
          db.insertPresence(
            user.tn_id,
            currentDate,
            currentTime,
            user.tn_modifikator,
          )
          console.info(`${user.tn_vorname} ${user.tn_nachname}'s arrival logged`);
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