import HumanBrowser from '../Utils/HumanBrowser';
import { Tiktok } from "../types/client.type";
import { useTdsService } from '../services/tdsServices';
import { BrowserWindow } from 'electron';
import * as path from "path";

interface IWorker {
    start(type: "tiktok_like" | "tiktok_follow", tsdid: string, tiktok: Tiktok): Promise<void>;
    stop(): void;
}

interface TdsWorkerArgs {
    browserArgs?: string[];
    maincontent?: BrowserWindow;
}

export class TdsWorker implements IWorker {
    private headMode: boolean = false;
    private browserArgs: string[];
    private cancel: boolean = false;
    private locked: boolean = false;

    private defaultPauseOptions = {
        maxPause: 3,
        minPause: 1,
        hesitationBeforeClick: true,
    };

    private jitterDefault = {
        jitterMin: 5,
        jitterMax: 30,
        jitterCount: 5,
        debug: false,
    };

    private browser: HumanBrowser;
    private maincontent: BrowserWindow | undefined;

    constructor(args: TdsWorkerArgs) {
        this.browser = new HumanBrowser();
        this.browserArgs = ['--no-zygote'];
        if (args.browserArgs) {
            this.browserArgs = [...this.browserArgs, ...args.browserArgs];
        }
        this.maincontent = args.maincontent;
    }

    // Hàm thực hiện hành động di chuyển và jitter
    private async performAction(selector: string) {
        await this.browser.humanMove(selector, this.defaultPauseOptions);
        await this.browser.jitterMouse(this.jitterDefault);
    }

    // Hàm cập nhật cookie
    private async updateCookie(tiktok: Tiktok) {
        if (tiktok.sid) {
            await this.browser.page?.setCookie({
                name: 'sessionid',
                value: tiktok.sid,
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
    private async performWork(type: "tiktok_like" | "tiktok_follow", tsdid: string, tiktok: Tiktok) {
        const { getTiktokTasks } = useTdsService(tiktok.sid);
        while (!this.cancel) {
            const tiktokTasks = await getTiktokTasks(type);

            if (!tiktokTasks || tiktokTasks.length === 0) {
                return;
            }

            for (let i = tiktokTasks.length - 1; i >= 0; i--) {
                const task = tiktokTasks[i];
                await this.performTiktokTask(type, task);
            }
        }
    }

    // Hàm bắt đầu worker
    async start(type: "tiktok_like" | "tiktok_follow", tsdid: string, tiktok: Tiktok): Promise<void> {
        this.locked = true;

        if (!tsdid || !tiktok || !tiktok.username || tiktok.sid) {
            return;
        }

        try {
            await this.browser.launch({
                headless: this.headMode,
                userDataDir: path.join(__dirname, '/user-data-dir/', tiktok.username),
                args: this.browserArgs
            });

            await this.updateCookie(tiktok);

            await this.performWork(type, tsdid, tiktok);
        } catch (error) {
            // Log error
        } finally {
            this.locked = false;
        }
    }

    // Hàm dừng worker
    async stop() {
        this.cancel = true;

        const turnoffInterval = setInterval(() => {
            if (!this.locked) {
                clearInterval(turnoffInterval);

                if (this.browser) {
                    this.browser.close();
                }
            }
        }, 5000);
    }
}
