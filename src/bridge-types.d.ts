import { NetMDService } from './services/interfaces/netmd';

declare global {
    interface Window {
        // ElectronWMD bridge
        native?: {
            interface?: NetMDService;
            himdFullInterface?: NetMDService;
            unrestrictedFetchJSON: (url: string, parameters?: any) => any;
        };
    }
}
