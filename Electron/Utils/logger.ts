const { app } = require('electron');
const log = require('electron-log');

export default class Logger {
    static log = log;
    static info(message: string) : void {
        log.info(message);
    }
    static error(message: string) : void {
        log.error(message);
    }
    static warn(message: string) : void {
        log.warn(message);
    }
}