import { CustomParameters } from '../../custom-parameters';
import { getATRACWAVEncoding } from '../../utils';
import { CodecFamily } from '../interfaces/netmd';
import { DefaultFfmpegAudioExportService, ExportParams } from './audio-export';

export class RemoteAtracExportService extends DefaultFfmpegAudioExportService {
    public address: string;
    public originalFileName: string = '';

    constructor(parameters: CustomParameters) {
        super();
        this.address = parameters.address as string;
    }

    async prepare(file: File): Promise<void> {
        await super.prepare(file);
        this.originalFileName = file.name;
    }

    async encodeATRAC3({ format, loudnessTarget, enableReplayGain }: ExportParams): Promise<ArrayBuffer> {
        let { data } = await this.ffmpegProcess.read(this.inFileName);

        const payload = new FormData();
        payload.append('file', new Blob([data.buffer]), this.originalFileName);
        const encodingURL = new URL(this.address);
        if (!encodingURL.pathname.endsWith('/')) encodingURL.pathname += '/';
        encodingURL.pathname += 'transcode';
        let encoderFormat: string;
        switch (format.codec) {
            case 'A3+':
                if (![48, 64, 96, 128, 160, 192, 256, 320, 352].includes(format.bitrate ?? 0)) {
                    throw new Error('Invalid bitrate given to encoder');
                }
                encoderFormat = `PLUS${format.bitrate!}`;
                break;
            case 'AT3':
                // AT3@105kbps
                if (format.bitrate === 105) {
                    encoderFormat = 'LP105';
                    break;
                } else if (format.bitrate === 132) {
                    encoderFormat = 'LP2';
                    break;
                } else if (format.bitrate === 66) {
                    encoderFormat = 'LP4';
                    break;
                } // else fall through
            default:
                throw new Error('Invalid format given to encoder');
        }
        encodingURL.searchParams.set('type', encoderFormat);
        if (loudnessTarget !== undefined) encodingURL.searchParams.set('loudnessTarget', loudnessTarget.toString());
        if (enableReplayGain !== undefined) encodingURL.searchParams.set('applyReplaygain', enableReplayGain.toString());
        let response = await fetch(encodingURL.href, {
            method: 'POST',
            body: payload,
        });
        const source = await response.arrayBuffer();
        const content = new Uint8Array(source);
        const file = new File([content], 'test.at3');
        let headerLength = (await getATRACWAVEncoding(file))!.headerLength;
        return source.slice(headerLength);
    }
    async encodeATRAC3Plus(parameters: ExportParams): Promise<ArrayBuffer> {
        return await this.encodeATRAC3(parameters);
    }

    getSupport(codec: CodecFamily): 'perfect' {
        return 'perfect';
    }
}
