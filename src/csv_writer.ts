import {createObjectCsvWriter} from 'csv-writer';
import csvParser from 'csv-parser';
import * as fs from 'fs';
import * as path from 'path';

export default class MyCsvWriter {
  name;
  tagId;
  filePath;
	csvWriter;

	constructor(name :string, tagId :string) {
    this.name = name;
    this.tagId = tagId;
    this.filePath = path.join(__dirname, `../logs/${this.name.replaceAll(' ', '_')}.csv`)
		this.csvWriter = createObjectCsvWriter({
			path: this.filePath,
			header: [
				{id: 'date', title: 'date'},
				{id: 'time', title: 'time'},
				{id: 'name', title: 'name'},
				{id: 'tagId', title: 'tagId'},
			],
			append: true,
		});
    if (!fs.existsSync(this.filePath)
      || fs.existsSync(this.filePath) && fs.statSync(this.filePath).size === 0
    ) {
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

	async logWithTimestamp() :Promise<string> {
    const logCount = await this.checkLogCount();
    if(logCount > 1) {
      const message = `Log skipped: ${this.name} is already logged for today.`
      console.error(message);
      return 'ERROR done';
    }
    const wasRecently = await this.checkRecentLogs();
    if(wasRecently) {
      const message = `Log skipped: ${this.name} was already logged within the last 5min.`;
      console.error(message);
      return 'ERROR recent';
    }
    const date = new Date().toLocaleDateString('de-DE', {});
    const time = new Date().toLocaleTimeString('de-DE', {});

    try{
      await this.csvWriter.writeRecords([{
        date,
        time,
        name: this.name,
        tagId: this.tagId,
      }])

      if(logCount == 0){
        console.log(`${this.name}'s arrival logged to CSV file.`);
      }
      if(logCount == 1){
        console.log(`${this.name}'s departure logged to CSV file.`);
      }
      return 'SUCCESS';
    } catch (error) {
      console.error('Error writing to CSV:', error);
      return 'ERROR writing';
    }
	}

  async getExistingLogs(): Promise<Array<{ date: string, time: string, name: string, tagId: string }>> {
    return new Promise((resolve, reject) => {
      const logs :any[] = [];
      fs.createReadStream(this.filePath)
        .pipe(csvParser())
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

  convertToISO(date :string, time :string): Date {
    date = date.split('.').map(num => num.padStart(2, '0')).reverse().join('-');
    return new Date(`${date}T${time}`);
  }

  async checkRecentLogs(): Promise<boolean> {
    const logs = await this.getExistingLogs();
    if (logs.length === 0) return false;
    
    const lastLog = logs[logs.length - 1];
    const lastLogTime = this.convertToISO(lastLog.date, lastLog.time);

    return (new Date().getTime() - lastLogTime.getTime()) < 5 * 60 * 1000;
  }
}
