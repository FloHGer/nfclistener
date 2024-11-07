"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
class Database {
    url;
    key;
    client;
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.client = this.init();
    }
    ;
    init() {
        if (!this.url)
            throw Error('URL missing');
        if (!this.key)
            throw Error('KEY missing');
        return (0, supabase_js_1.createClient)(this.url, this.key);
    }
    ;
    async auth(email, password) {
        if (!email)
            throw Error('EMail missing');
        if (!password)
            throw Error('Password missing');
        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password,
            });
            if (error)
                throw new Error(error.toString());
        }
        catch (error) {
            console.error(error);
        }
    }
    async getUserByRfid(rfid) {
        try {
            const { data, error } = await this.client
                .from('teilnehmer')
                .select()
                .ilike('tn_rfid', `%${rfid}%`);
            if (error)
                throw error;
            return data[0];
        }
        catch (error) {
            console.error(error);
        }
    }
    async fetchPresenceByUidAndDate(uid, date) {
        try {
            const { data, error } = await this.client
                .from('anwesenheiten')
                .select()
                .eq('anw_tn_id', uid)
                .eq('anw_datum', date);
            if (error)
                throw error;
            if (data.length === 1)
                return data[0];
        }
        catch (error) {
            console.error(error);
        }
        return null;
    }
    async insertPresence(userId, date, arrival, timeMod) {
        try {
            const { error } = await this.client
                .from('anwesenheiten')
                .insert({
                anw_tn_id: userId,
                anw_datum: date,
                anw_von_uhrzeit: arrival,
                anw_modifikator: timeMod,
                anw_client_id: process.env.DB_CLIENT_ID,
            });
            if (error)
                throw error;
        }
        catch (error) {
            console.error(error);
        }
    }
    async updatePresenceWithDeparture(userId, date, departure) {
        try {
            const { error } = await this.client
                .from('anwesenheiten')
                .update({
                anw_bis_uhrzeit: departure,
            })
                .eq('anw_tn_id', userId)
                .eq('anw_datum', date);
            if (error)
                throw error;
        }
        catch (error) {
            console.error(error);
        }
    }
    async getParticipantsListWithNamesAndIds() {
        try {
            const { data, error } = await this.client
                .from('teilnehmer')
                .select('tn_vorname, tn_nachname, tn_id, tn_rfid');
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error(error);
        }
    }
    async updateParticipantWithRfid(tagId, participantId) {
        try {
            const { data, error } = await this.client
                .from('teilnehmer')
                .update({
                tn_rfid: [tagId]
            })
                .eq('tn_id', participantId)
                .select('tn_id, tn_vorname, tn_nachname, tn_rfid');
            if (error)
                throw error;
            return data[0];
        }
        catch (error) {
            console.error(error);
        }
    }
    async removeRfid(participantId) {
        try {
            const { data, error } = await this.client
                .from('teilnehmer')
                .update({
                tn_rfid: null
            })
                .eq('tn_id', participantId)
                .select('tn_id, tn_vorname, tn_nachname, tn_rfid');
            if (error)
                throw error;
            return data[0];
        }
        catch (error) {
            console.error(error);
        }
    }
}
exports.default = Database;
