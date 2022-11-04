import { NetMDService } from './services/netmd';

declare global {
    interface Window {
        // ElectronWMD bridge
        native?: {
            interface: NetMDService;
            unrestrictedFetchJSON: (url: string, parameters?: any) => any;
        };
    }
}
