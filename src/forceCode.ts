import * as vscode from 'vscode';
import jsforce = require('jsforce');

declare module 'vscode' {
    export namespace window {
        export let forceCode: IForceService;
    }
}

export interface Config {
    pollTimeout?: number;
    username?: string;
    password?: string;
    token?: string;
    url?: string;
    autoCompile?: boolean;
}

export interface IForceService {
    config?: Config;
    containerId?: string;
    containerAsyncRequestId?: string;
    conn?: jsforce.Connection;
    userInfo?: jsforce.UserInfo;
    username?: string;
    outputChannel: vscode.OutputChannel;
    connect(context: vscode.ExtensionContext): Promise<IForceService>;
    newContainer(): Promise<IForceService>;
    clearLog(): void;
}