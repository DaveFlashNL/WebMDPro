import { Mutex } from 'async-mutex';
import { Group, Wireformat } from 'netmd-js';
import { Logger } from 'netmd-js/dist/logger';
import { asyncMutex } from '../utils';
import { Capability, NetMDService } from './netmd';

export class NetMDRemoteService implements NetMDService {
    private logger?: Logger;
    private server: string;
    public mutex = new Mutex();
    private capabilities: Capability[] | null = null;
    private friendlyName: string;

    constructor({ debug = false, serverAddress, friendlyName }: { debug: boolean; serverAddress: string; friendlyName: string }) {
        if (debug) {
            // Logging a few methods that have been causing issues with some units
            const _fn = (...args: any) => {
                if (args && args[0] && args[0].method) {
                    console.log(...args);
                }
            };
            this.logger = {
                debug: _fn,
                info: _fn,
                warn: _fn,
                error: _fn,
                child: () => this.logger!,
            };
        }
        this.server = serverAddress.endsWith('/') ? serverAddress.substring(0, serverAddress.length - 1) : serverAddress;
        this.friendlyName = friendlyName;
    }

    private async fetchServerCapabilities() {
        const serverInfo = await this.getFromServer('');
        if (!serverInfo) throw new Error('Not ready.');
        if (serverInfo.version !== '1.0') {
            this.logger?.error({
                method: 'fetchServerCapabilities',
                info: `Server is on a different version than the service. (1.0 != ${serverInfo.version})`,
            });
            return;
        }
        this.capabilities = serverInfo.capabilities.map((n: any) => Capability[n]);
    }

    async getServiceCapabilities() {
        if (this.capabilities === null) {
            await this.fetchServerCapabilities();
        }
        return this.capabilities!;
    }

    async pair() {
        await this.fetchServerCapabilities();
        return true;
    }

    async connect() {
        return false;
    }

    private async getFromServer(path: string, parameters?: { [key: string]: any }, method: string = 'GET') {
        try {
            let url = new URL(`${this.server}/${path}`);
            let body = undefined;
            let headers = {};
            if (parameters) {
                for (let key in parameters) {
                    if (parameters[key] === undefined) delete parameters[key];
                }
            }
            if (method === 'GET') {
                url.search = new URLSearchParams(parameters).toString();
            } else {
                body = JSON.stringify(parameters);
                headers = {
                    'Content-Type': 'application/json',
                };
            }
            const jsonData = await (await fetch(url.toString(), { method, body, headers })).json();
            if (jsonData.ok) {
                return jsonData.value;
            } else {
                this.logger?.error({ method: path, jsonData });
                return null;
            }
        } catch (ex) {
            this.logger?.error({ method: 'GENERIC', ex });
            return null;
        }
    }

    @asyncMutex
    async listContent() {
        return await this.getFromServer('listContent');
    }

    @asyncMutex
    async getDeviceStatus() {
        return await this.getFromServer('deviceStatus');
    }

    @asyncMutex
    async getDeviceName() {
        return (await this.getFromServer('deviceName')) + (this.friendlyName && ` (${this.friendlyName})`);
    }

    @asyncMutex
    async finalize() {
        window.alert('NOT COMPLETE YET');
    }

    @asyncMutex
    async rewriteGroups(groups: Group[]) {
        return await this.getFromServer('rewriteGroups', { groups }, 'POST');
    }

    @asyncMutex
    async renameTrack(index: number, title: string, fullWidthTitle?: string) {
        return await this.getFromServer('renameTrack', { index, title, fullWidthTitle });
    }

    @asyncMutex
    async renameGroup(groupIndex: number, title: string, fullWidthTitle?: string) {
        return await this.getFromServer('renameGroup', { groupIndex, title, fullWidthTitle });
    }

    @asyncMutex
    async addGroup(groupBegin: number, groupLength: number, title: string) {
        return await this.getFromServer('addGroup', { groupBegin, groupLength, title });
    }

    @asyncMutex
    async deleteGroup(index: number) {
        return await this.getFromServer('deleteGroup', { index });
    }

    @asyncMutex
    async renameDisc(title: string, fullWidthTitle?: string) {
        return await this.getFromServer('renameDisc', { title, fullWidthTitle });
    }

    @asyncMutex
    async deleteTracks(indexes: number[]) {
        return await this.getFromServer('deleteTracks', { indexes }, 'POST');
    }

    @asyncMutex
    async wipeDisc() {
        return await this.getFromServer('wipeDisc');
    }

    @asyncMutex
    async ejectDisc() {
        await this.getFromServer('eject');
    }

    @asyncMutex
    async wipeDiscTitleInfo() {
        window.alert('Not complete yet');
    }

    @asyncMutex
    async moveTrack(src: number, dst: number, updateGroups?: boolean) {
        return await this.getFromServer('moveTrack', { src, dst });
    }

    async prepareUpload() {}
    async finalizeUpload() {}

    @asyncMutex
    upload(
        title: string,
        fullWidthTitle: string,
        data: ArrayBuffer,
        format: Wireformat,
        progressCallback: (progress: { written: number; encrypted: number; total: number }) => void
    ) {
        return new Promise<void>((res, rej) => {
            const servURL = new URL(this.server);
            const wsURL = new URL(`${servURL.protocol === 'https:' ? 'wss:' : 'ws:'}//${servURL.host}/upload`);
            wsURL.search = new URLSearchParams({
                title,
                fullWidthTitle,
                format: format.toString(),
            }).toString();
            const ws = new WebSocket(wsURL.toString());

            //Send file

            ws.addEventListener('message', event => {
                const progress = JSON.parse(event.data);
                progressCallback(progress);
            });
            ws.addEventListener('open', () => {
                ws.send(data);
                console.log('Ok sent file');
            });

            ws.addEventListener('close', () => res());
        });
    }

    @asyncMutex
    async download(index: number, progressCallback: (progress: { read: number; total: number }) => void) {
        return null;
    }

    @asyncMutex
    async play() {
        return await this.getFromServer('play');
    }
    @asyncMutex
    async pause() {
        return await this.getFromServer('pause');
    }
    @asyncMutex
    async stop() {
        return await this.getFromServer('stop');
    }
    @asyncMutex
    async next() {
        return await this.getFromServer('next');
    }
    @asyncMutex
    async prev() {
        return await this.getFromServer('prev');
    }

    @asyncMutex
    async gotoTrack(index: number) {
        return await this.getFromServer('goto', { index });
    }

    @asyncMutex
    async gotoTime(index: number, h: number, m: number, s: number, f: number) {
        return await this.getFromServer('gotoTime', { index, hour: h, minute: m, second: s, frame: f });
    }

    @asyncMutex
    async getPosition() {
        return await this.getFromServer('getPosition');
    }

    async factory() {
        return null;
    }
}
