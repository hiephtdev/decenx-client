import { Tiktok } from "../types/client.type";
import { IClientBrowser } from "./clientbrowser.type";
export interface IWorker {
    start(clientbrowser: IClientBrowser, browserDisconnectCallback: () => void): Promise<void>;
    stop(): void;
}