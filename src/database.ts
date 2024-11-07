import { createClient, SupabaseClient } from '@supabase/supabase-js'

import { PresenceType, ParticipantType } from './types/database';


export default class Database {
  url: string;
  key: string;
  client: SupabaseClient;
  constructor(
    url: string,
    key: string,
  ){
    this.url = url;
    this.key = key;
    this.client = this.init();
  };

  init (): SupabaseClient {
    if (!this.url) throw Error('URL missing')
    if (!this.key) throw Error('KEY missing')
    return createClient(this.url!, this.key!);
  };

  async auth (
    email: string | undefined,
    password: string | undefined,
  ): Promise<any> {
    if (!email) throw Error('EMail missing');
    if (!password) throw Error('Password missing');
    try {
      const { data, error } =  await this.client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.toString());
  
    } catch (error) {
      console.error(error);
    }
  }

  async getUserByRfid (
    rfid: string,
  ): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('teilnehmer')
        .select()
        .ilike('tn_rfid', `%${rfid}%`)
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(error);
    }
  }

  async fetchPresenceByUidAndDate (
    uid: number,
    date: string,
  ): Promise<PresenceType | null> {
    try{
      const { data, error } = await this.client
        .from('anwesenheiten')
        .select()
        .eq('anw_tn_id', uid)
        .eq('anw_datum', date);

      if (error) throw error;
      if (data.length === 1) return data[0];
    } catch (error) {
      console.error(error);
    }
    return null;
  }

  async insertPresence (
    userId: number,
    date: string,
    arrival: number,
    timeMod: number,
  ): Promise<any> {
    try {
      const { error } = await this.client
        .from('anwesenheiten')
        .insert({
          anw_tn_id: userId,
          anw_datum: date,
          anw_von_uhrzeit: arrival,
          anw_modifikator: timeMod,
          anw_client_id: process.env.DB_CLIENT_ID,
        })

      if (error) throw error;
    } catch (error) {
      console.error(error);
    }
  }

  async updatePresenceWithDeparture (
    userId: number,
    date: string,
    departure: number,
  ): Promise<any> {
    try {
      const { error } = await this.client
        .from('anwesenheiten')
        .update({
          anw_bis_uhrzeit: departure,
        })
        .eq('anw_tn_id', userId)
        .eq('anw_datum', date)

      if (error) throw error;
    } catch (error) {
      console.error(error);
    }
  }

  async getTimeDifferenceInMin (
    uid: number,
    date: string,
  ): Promise<any> {
    try{
      const presence = await this.fetchPresenceByUidAndDate(uid, date);
      if (!presence || !presence.anw_bis_uhrzeit || !presence.anw_von_uhrzeit) throw Error;
      return presence.anw_bis_uhrzeit - presence.anw_von_uhrzeit - (8 * 60 + 30);

    } catch (error) {
      console.error(error);
    }
  }

  async getParticipantsListWithNamesAndIds (): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('teilnehmer')
        .select('tn_vorname, tn_nachname, tn_id, tn_rfid');
  
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(error);
    }
  }

  async updateParticipantWithRfid (
    tagId: string,
    participantId: string,
  ): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('teilnehmer')
        .update({
          tn_rfid: [tagId]
        })
        .eq('tn_id', participantId)
        .select('tn_id, tn_vorname, tn_nachname, tn_rfid')
  
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(error);
    }
  }

  async removeRfid (
    participantId: string,
  ): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('teilnehmer')
        .update({
          tn_rfid: null
        })
        .eq('tn_id', participantId)
        .select('tn_id, tn_vorname, tn_nachname, tn_rfid')
  
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(error);
    }
  }
}
