import HumanBrowser from '../Utils/HumanBrowser';
import { useTdsService } from '../services/tdsServices';
import { BrowserWindow } from 'electron';
import * as path from "path";
import { IWorker } from '../types/worker.type';
import Logger from '../Utils/logger';
import { IClientBrowser } from '../types/clientbrowser.type';

interface TdsWorkerArgs {
    browserArgs?: string[];
    maincontent: BrowserWindow;
    profileName: string;
}

export class TdsWorker implements IWorker {
    private headMode: boolean = false;
    private browserArgs: string[];
    private cancel: boolean = false;
    private locked: boolean = false;
    private profileName: string;

    private defaultPauseOptions = {
        maxPause: 2,
        minPause: 0,
        hesitationBeforeClick: true,
    };

    private jitterDefault = {
        jitterMin: 3,
        jitterMax: 30,
        jitterCount: 3,
        debug: false,
    };

    private browser: HumanBrowser;
    private maincontent: BrowserWindow;

    constructor(args: TdsWorkerArgs) {
        this.browser = new HumanBrowser();
        this.browserArgs = ['--no-zygote'];
        if (args.browserArgs) {
            this.browserArgs = [...this.browserArgs, ...args.browserArgs];
        }
        this.maincontent = args.maincontent;
        this.profileName = args.profileName;
    }

    // Hàm thực hiện hành động di chuyển và jitter
    private async performAction(selector: string) {
        await this.browser.humanMove(selector, this.defaultPauseOptions);
        await this.browser.jitterMouse(this.jitterDefault);
    }

    // Hàm cập nhật cookie
    private async updateCookie(sid: string) {
        if (sid) {
            await this.browser.page?.setCookie({
                name: 'sessionid',
                value: sid,
                domain: '.tiktok.com',
                path: '/',
                secure: true,
                httpOnly: true
            });
        }
    }

    // Hàm thực hiện nhiệm vụ TikTok
    private async performTiktokTask(type: "tiktok_like" | "tiktok_follow", task: any) {
        await this.browser.wait(2000, 5000);
        await this.browser?.navigate(task.link);
        await this.performAction(type === 'tiktok_follow' ? 'data-e2e="follow-button"' : '[data-e2e="like-icon"]');
        await this.browser.wait(9000, 19000);
    }

    // Hàm thực hiện công việc chính
    private async performWork(clientbrowser: IClientBrowser) {
        const { getTiktokTasks, confirmAndSendQuest } = useTdsService(clientbrowser.tdsid);
        let numTasks = 0;
        while (!this.cancel) {
            const tiktokTasks = await getTiktokTasks(clientbrowser.action);
            this.sendLogs(`[Worker] Đang lấy nhiệm vụ ${clientbrowser.action} từ server: ${tiktokTasks.length} nhiệm vụ`, clientbrowser.profileName);
            if (!tiktokTasks || tiktokTasks.length === 0) {
                return;
            }
            let i = tiktokTasks.length;
            while (i--) {
                try {

                    if (this.cancel) {
                        return;
                    }
                    if (numTasks >= 8) {
                        numTasks = 0;

                    } else {
                        numTasks++;
                    }
                    this.sendLogs(`[Worker] Đang thực hiện nhiệm vụ ${clientbrowser.action} thứ ${i + 1} / ${tiktokTasks.length}`, clientbrowser.profileName);
                    const task = tiktokTasks[i];
                    await this.performTiktokTask(clientbrowser.action, task);
                    this.sendLogs(`[Worker] Hoàn thành nhiệm vụ ${clientbrowser.action} thứ ${i + 1} / ${tiktokTasks.length}`, clientbrowser.profileName);

                    const result = await confirmAndSendQuest(clientbrowser.action, task.id);
                    if (result.success) {
                        this.sendLogs(`[Worker] Gửi duyệt nhiệm vụ thành công`, clientbrowser.profileName);
                        if (result.message) {
                            this.sendLogs(`[Worker] ${result.message}`, clientbrowser.profileName);
                        }
                    } else {
                        this.sendLogs(`[Worker] Gửi duyệt nhiệm vụ thất bại`, clientbrowser.profileName);
                    }
                } catch (error) {
                    this.sendLogs(`[Worker] Lỗi: ${error}`, clientbrowser.profileName);
                }
            }
        }
    }

    /**
     * Gửi thông tin logs tới cửa sổ chính
     * @param logs 
     */
    sendLogs(logs: string, username: string) {
        // console.log(logs);
        Logger.info(logs);
        this.maincontent.webContents.send('worker-logs', logs, username);
    }

    // Hàm bắt đầu worker
    async start(clientbrowser: IClientBrowser, browserDisconnectCallback: () => void): Promise<void> {
        this.locked = true;
        this.sendLogs(`[Worker] Bắt đầu worker ${clientbrowser.action} cho tài khoản ${clientbrowser.profileName}`, clientbrowser.profileName);
        if (!clientbrowser.tdsid || !clientbrowser.profileName || !clientbrowser.sid) {
            return;
        }

        try {
            await this.browser.launch({
                headless: this.headMode,
                userDataDir: path.join(__dirname, '/user-data-dir/', clientbrowser.profileName),
                args: this.browserArgs
            }, () => {
                this.sendLogs(`[Worker] Browser disconnected`, clientbrowser.profileName);
                this.stop();
                browserDisconnectCallback();
            });
            this.sendLogs(`[Worker] Khởi động trình duyệt thành công`, clientbrowser.profileName);
            await this.updateCookie(clientbrowser.sid);
            this.sendLogs(`[Worker] Cập nhật cookie thành công`, clientbrowser.profileName);
            await this.performWork(clientbrowser);
        } catch (error: any) {
            // Log error
            this.sendLogs(`[Worker] Lỗi: ${error}`, clientbrowser.profileName);
        } finally {
            this.locked = false;
            this.sendLogs(`[Worker] Kết thúc worker ${clientbrowser.action} cho tài khoản ${clientbrowser.profileName}`, clientbrowser.profileName);
        }
    }

    // Hàm dừng worker
    async stop() {
        this.cancel = true;
        this.sendLogs(`[Worker] Nhận lệnh dừng worker`, this.profileName);
        const turnoffInterval = setInterval(() => {
            if (!this.locked) {
                clearInterval(turnoffInterval);
                this.sendLogs(`[Worker] Dừng worker`, this.profileName);
                if (this.browser) {
                    this.browser.close();
                }
            }
        }, 5000);
    }
}
