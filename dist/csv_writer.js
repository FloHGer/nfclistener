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
exports.MyCsvWriter = void 0;
const csv_writer_1 = require("csv-writer");
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MyCsvWriter {
    name;
    tagId;
    filePath;
    csvWriter;
    constructor(name, tagId) {
        this.name = name;
        this.tagId = tagId;
        this.filePath = path.join(__dirname, `../logs/${this.name.replaceAll(' ', '_')}.csv`);
        this.csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
            path: this.filePath,
            header: [
                { id: 'date', title: 'date' },
                { id: 'time', title: 'time' },
                { id: 'name', title: 'name' },
                { id: 'tagId', title: 'tagId' },
            ],
            append: true,
        });
        if (!fs.existsSync(this.filePath)
            || fs.existsSync(this.filePath) && fs.statSync(this.filePath).size === 0) {
            this.writeHeader();
        }
    }
    writeHeader() {
        this.csvWriter
            .writeRecords([{
                date: 'date',
                time: 'time',
                name: 'name',
                tagId: 'tagId',
            }])
            .then(() => {
            console.log('Header written to CSV file.');
        })
            .catch(err => {
            console.error('Error writing header to CSV:', err);
        });
    }
    async logWithTimestamp() {
        const logCount = await this.checkLogCount();
        if (logCount > 1) {
            const message = `Log skipped: ${this.name} is already logged for today.`;
            console.error(message);
            return 'ERROR done';
        }
        const wasRecently = await this.checkRecentLogs();
        if (wasRecently) {
            const message = `Log skipped: ${this.name} was already logged within the last 5min.`;
            console.error(message);
            return 'ERROR recent';
        }
        const date = new Date().toLocaleDateString('de-DE', {});
        const time = new Date().toLocaleTimeString('de-DE', {});
        try {
            await this.csvWriter.writeRecords([{
                    date,
                    time,
                    name: this.name,
                    tagId: this.tagId,
                }]);
            if (logCount == 0) {
                console.log(`${this.name}'s arrival logged to CSV file.`);
            }
            if (logCount == 1) {
                console.log(`${this.name}'s departure logged to CSV file.`);
            }
            return 'SUCCESS';
        }
        catch (error) {
            console.error('Error writing to CSV:', error);
            return 'ERROR writing';
        }
    }
    async getExistingLogs() {
        return new Promise((resolve, reject) => {
            const logs = [];
            fs.createReadStream(this.filePath)
                .pipe((0, csv_parser_1.default)())
                .on('data', (row) => {
                if (row.date === new Date().toLocaleDateString('de-DE')) {
                    logs.push(row);
                }
            })
                .on('end', () => {
                resolve(logs);
            })
                .on('error', (err) => {
                reject(err);
            });
        });
    }
    async checkLogCount() {
        const logs = await this.getExistingLogs();
        return logs.length;
    }
    convertToISO(date, time) {
        date = date.split('.').map(num => num.padStart(2, '0')).reverse().join('-');
        return new Date(`${date}T${time}`);
    }
    async checkRecentLogs() {
        const logs = await this.getExistingLogs();
        if (logs.length === 0)
            return false;
        const lastLog = logs[logs.length - 1];
        const lastLogTime = this.convertToISO(lastLog.date, lastLog.time);
        return (new Date().getTime() - lastLogTime.getTime()) < 5 * 60 * 1000;
    }
}
exports.MyCsvWriter = MyCsvWriter;
