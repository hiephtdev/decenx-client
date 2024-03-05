export interface Tiktok {
    username: string;
    password: string;
    sid: string;
    authen: string;
}
export interface Client {
    tdsid: string[];
    tiktoks: Tiktok[];
}