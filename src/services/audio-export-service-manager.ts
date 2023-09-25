import { CustomParameterInfo, CustomParameters } from '../custom-parameters';
import { AtracdencAudioExportService } from './audio/atracdenc-export';
import { AudioExportService } from './audio/audio-export';
import { RemoteAtracExportService } from './audio/remote-atrac-export';

interface AudioServicePrototype<T extends AudioExportService> {
    create: new (parameters: CustomParameters) => T;
    customParameters?: CustomParameterInfo[];
    name: string;
    description?: string;
}

export const AudioServices: AudioServicePrototype<AudioExportService>[] = [
    {
        name: 'Atracdenc',
        create: AtracdencAudioExportService,
        description: 'A mediocre  open-source ATRAC encoder. It\'s ATRAC3 support is incomplete',
    },
    {
        name: 'Remote ATRAC Encoder',
        create: RemoteAtracExportService,
        customParameters: [
            {
                userFriendlyName: 'Server Address',
                varName: 'address',
                type: 'string',
                defaultValue: 'https://atrac.minidisc.wiki/',
                validator: content => {
                    try {
                        new URL(content);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
            },
        ],
        description:
            'A separate high-quality ATRAC encoder hosted on another server (as defined by https://github.com/thinkbrown/atrac-api)',
    },
];
