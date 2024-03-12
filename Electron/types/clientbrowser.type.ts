export interface IClientBrowser {
    profileName: string;
    tdsid: string;
    sid:string;
    action: "tiktok_like" | "tiktok_follow";
    status:string
}