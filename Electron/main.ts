import { app, BrowserWindow, ipcMain, IpcMainEvent, screen } from "electron";
import * as path from "path";
import { isDev } from "./config";
import { appConfig } from "./ElectronStore/Configuration";
import AppUpdater from "./AutoUpdate";
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'
const os = require('os');
import { useInfomationSystem } from './Utils/infomationSystem'
import { Tiktok } from "./types/client.type";
import { TdsWorker } from "./worker/tdsworker";
import { IWorkerBrowser } from "./types/workerState.type";
import { IClientBrowser } from "./types/clientbrowser.type";
import { downloadAndExtract } from './Utils/downloadChrome'

// Hàm tạo cửa sổ chính và trả về promise chứa cửa sổ
async function createWindow(): Promise<BrowserWindow> {
    // Lấy các tùy chọn cho BrowserWindow từ cấu hình và màn hình
    const BrowserWindowOptions = getBrowserWindowOptions();

    // Tạo cửa sổ chính với các tùy chọn đã được lấy
    const mainWindow = createMainWindow(BrowserWindowOptions);

    // Kiểm tra và thực hiện auto update (tự động cập nhật ứng dụng)
    if (!isDev) AppUpdater();

    // Load URL cho cửa sổ chính
    await loadMainWindowURL(mainWindow);

    // Trả về cửa sổ chính để có thể sử dụng ở ngoài
    return mainWindow;
}

// Hàm lấy các tùy chọn của BrowserWindow
function getBrowserWindowOptions(): Electron.BrowserWindowConstructorOptions {
    const appBounds = appConfig.get("setting.appBounds");
    const defaultOptions: Electron.BrowserWindowConstructorOptions = {
        width: 1024,
        height: 768,
        minWidth: 400,
        minHeight: 300,
        maxWidth: 1920,
        maxHeight: 1080,
        webPreferences: {
            preload: path.join(__dirname, "/preload.js"),
            devTools: isDev,
        },
        show: false,
        alwaysOnTop: true,
        frame: true,
        center: true,
        autoHideMenuBar: true
    };

    // Nếu có tùy chọn từ cấu hình, gộp chúng vào tùy chọn mặc định
    return appBounds !== undefined && appBounds !== null ? Object.assign(defaultOptions, appBounds) : defaultOptions;
}

// Hàm tạo cửa sổ mới dựa trên các tùy chọn đã được xác định
function createMainWindow(options: Electron.BrowserWindowConstructorOptions): BrowserWindow {
    const mainWindow = new BrowserWindow(options);
    // ... (các cài đặt khác của cửa sổ)
    return mainWindow;
}

// Hàm load URL cho cửa sổ chính, kiểm tra và thực hiện maximize nếu cần
async function loadMainWindowURL(mainWindow: BrowserWindow): Promise<void> {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const appBounds: any = appConfig.get("setting.appBounds");

    // Nếu có tùy chọn từ cấu hình, gộp chúng vào cửa sổ chính
    if (appBounds !== undefined && appBounds !== null) Object.assign(mainWindow, appBounds);

    // Load URL tùy thuộc vào môi trường
    await mainWindow.loadURL(isDev ? "http://localhost:3000" : `file://${path.join(__dirname, "./index.html")}`);

    // Maximize nếu cửa sổ đã được lưu trữ trong cấu hình và có kích thước lớn hơn màn hình
    if (appBounds !== undefined && appBounds !== null && appBounds.width > width && appBounds.height > height) mainWindow.maximize();
    else mainWindow.show();

    // Tắt chế độ always on top sau 1 giây
    setTimeout(() => {
        mainWindow.setAlwaysOnTop(false);
    }, 1000);

    // Nếu là môi trường phát triển, mở DevTools
    if (isDev) mainWindow.webContents.openDevTools();
}

// Hàm đọc hoặc tạo UUID và trả về giá trị UUID
async function readOrCreateUUID(): Promise<string> {
    let savedUuid: string;
    try {
        const data = await fs.readFileSync('uuid.txt', 'utf8');
        savedUuid = data.trim();
    } catch (err) {
        savedUuid = uuidv4();
       await fs.writeFileSync('uuid.txt', savedUuid);
    }
    return savedUuid;
}

// Hàm gửi thông tin hệ thống tới cửa sổ chính
function sendSystemInfoToWindow(mainWindow: BrowserWindow): void {
    const macAddress = getMacAddress();
    const pcName = os.hostname();
    const { getinfomationSystem } = useInfomationSystem();
    getinfomationSystem();
    if (mainWindow) {
        mainWindow.webContents.send('pcinfo', { macAddress, pcName });
    }
}

// Hàm lấy địa chỉ MAC của máy tính
function getMacAddress(): string {
    const networkInterfaces = os.networkInterfaces();

    for (const interfaceName in networkInterfaces) {
        const interfaceInfo = networkInterfaces[interfaceName];

        // Kiểm tra xem giao diện có địa chỉ MAC hay không
        if (interfaceInfo && interfaceInfo.length > 0 && interfaceInfo[0].mac) {
            return interfaceInfo[0].mac;
        }
    }

    return 'N/A';
}

// Khi ứng dụng sẵn sàng, tạo cửa sổ và gán sự kiện
app.whenReady().then(async () => {
    // Nếu đang ở môi trường phát triển, thử cài đặt extension
    if (isDev) {
        try {
            const { installExt } = await import("./installDevTool");
            await installExt();
        } catch (e) {
            console.log("Can not install extension!");
        }
    }

    // Tạo cửa sổ chính và lưu trữ nó để có thể sử dụng ở sau này
    const mainWindow = await createWindow();

    const url = 'https://cdn.decenx.io/files/120.zip';
    //download chrome
    downloadAndExtract(url).then((res) => {
        mainWindow.webContents.send('worker-logs', 'Tải chrome về máy thành công', '');
        mainWindow.webContents.send('download-drivers', 'success');
    }).catch((err) => {
        mainWindow.webContents.send('worker-logs', 'Tải chrome về máy thất bại', '');
        mainWindow.webContents.send('download-drivers', 'failed');
    });

    // Đọc hoặc tạo UUID và gửi nó tới cửa sổ chính
    const savedUuid = await readOrCreateUUID();
    // console.log('UUID:', savedUuid);
    mainWindow.webContents.send('genuuid', savedUuid);
    
    // Gửi thông tin hệ thống tới cửa sổ chính
    sendSystemInfoToWindow(mainWindow);
    // Sự kiện khi có yêu cầu chạy Browser (hoặc các sự kiện khác)
    const workerBrowser: IWorkerBrowser = {};
    ipcMain.on('woker-start', async (event: IpcMainEvent, clientbrowser: IClientBrowser) => {
        if (!clientbrowser) {
            mainWindow.webContents.send('worker-logs', 'Không có thông tin browser', '');
            return;
        }
        if (workerBrowser[clientbrowser.profileName]) {
            mainWindow.webContents.send('worker-logs', `${clientbrowser.profileName} đang chạy`, clientbrowser.profileName);
            return;
        }
        const worker = new TdsWorker({ maincontent: mainWindow, profileName: clientbrowser.profileName});
        workerBrowser[clientbrowser.profileName] = worker;
        worker.start(clientbrowser, () => {
            console.log('browser disconnected');
            if (workerBrowser[clientbrowser.profileName]) {
                delete workerBrowser[clientbrowser.profileName];
            }
        });
    });

    //stop worker
    ipcMain.on('woker-stop', async (event, name: string) => {
        if (!name) {
            mainWindow.webContents.send('worker-logs', 'Không có thông tin browser', '');
            return;
        }
        if (!workerBrowser[name]) {
            mainWindow.webContents.send('worker-logs', `${name} không chạy`, name);
            return;
        };
        workerBrowser[name].stop();
        delete workerBrowser[name];
    });

    // Sự kiện khi kích hoạt ứng dụng (chẳng hạn khi click vào biểu tượng trên Dock)
    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Sự kiện khi tất cả cửa sổ đều đã đóng
app.on("window-all-closed", () => {
    // Trong trường hợp không phải macOS, thoát ứng dụng
    if (process.platform !== "darwin") {
        app.quit();
    }
});
