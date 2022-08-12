import { NetMDFactoryService, NetMDService } from './netmd';
import { AudioExportService } from './audio-export';
import { MediaRecorderService } from './mediarecorder';
import { MediaSessionService } from './media-session';

interface ServiceRegistry {
    netmdService?: NetMDService;
    netmdFactoryService?: NetMDFactoryService;
    audioExportService?: AudioExportService;
    mediaRecorderService?: MediaRecorderService;
    mediaSessionService?: MediaSessionService;
}

const ServiceRegistry: ServiceRegistry = {};

export default ServiceRegistry;
