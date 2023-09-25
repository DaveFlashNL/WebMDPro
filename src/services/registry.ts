import { MinidiscSpec, NetMDFactoryService, NetMDService } from './interfaces/netmd';
import { AudioExportService } from './audio/audio-export';
import { MediaRecorderService } from './browserintegration/mediarecorder';
import { MediaSessionService } from './browserintegration/media-session';

interface ServiceRegistry {
    netmdService?: NetMDService;
    netmdSpec?: MinidiscSpec;
    netmdFactoryService?: NetMDFactoryService;
    audioExportService?: AudioExportService;
    mediaRecorderService?: MediaRecorderService;
    mediaSessionService?: MediaSessionService;
}

const ServiceRegistry: ServiceRegistry = {};

export default ServiceRegistry;
