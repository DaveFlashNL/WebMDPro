import React, { ReactHTMLElement } from 'react';
import { NetMDService, NetMDUSBService } from './netmd';
// import { NetMDMockService } from './netmd-mock';
import { NetMDRemoteService } from './remote-netmd';

export type CustomParameters = { [key: string]: string | number | boolean };
export type CustomParameterType = 'string' | 'number' | 'boolean';
export type CustomParameterInfo = {
    userFriendlyName: string;
    varName: string;
    type: CustomParameterType;
    defaultValue?: string;
    validator?: (content: string) => boolean;
};

type ServicePrototype = {
    create: (parameters?: CustomParameters) => NetMDService;
    getConnectName: (parameters?: CustomParameters) => string;
    name: string;
    customParameters?: CustomParameterInfo[];
    description?: ReactHTMLElement<any>;
};

export type ServiceConstructionInfo = {
    name: string;
    parameters?: CustomParameters;
};

export const Services: ServicePrototype[] = [
    {
        name: 'USB NetMD',
        getConnectName: () => 'Connect',
        create: () => (window as any).native?.interface ?? new NetMDUSBService({ debug: true }),
    },
    {
        name: 'Remote NetMD',
        getConnectName: parameters => `Connect to ${parameters!.friendlyName || parameters!.serverAddress}`,
        description: React.createElement(
            'p',
            null,
            'Connect to a remote NetMD device with the help of ',
            React.createElement('a', { href: 'https://github.com/asivery/remote-netmd-server' }, 'Remote NetMD')
        ),
        create: parameters => new NetMDRemoteService({ debug: true, ...parameters } as any),
        customParameters: [
            {
                userFriendlyName: 'Server Address',
                varName: 'serverAddress',
                type: 'string',
                validator: content => {
                    try {
                        const asURL = new URL(content);
                        return asURL.pathname === '/';
                    } catch (e) {
                        return false;
                    }
                },
            },
            {
                userFriendlyName: 'Friendly Name',
                varName: 'friendlyName',
                type: 'string',
            },
        ],
    },
    /*{
        name: "MockMD",
        getConnectName: () => "Connect to MockMD",
        description: React.createElement("p", null, "Test NetMD interface. It does nothing"),
        create: (parameters) => {
            console.log(`Given parameters: ${JSON.stringify(parameters)}`);
            return new NetMDMockService(parameters);
        },
        customParameters: [
            {
                userFriendlyName: 'Test Number',
                type: 'number',
                varName: 'number',
            },
            {
                userFriendlyName: 'Override disc title',
                type: 'string',
                varName: 'overrideTitle',
            },
            {
                userFriendlyName: 'Override full-width disc title',
                type: 'string',
                varName: 'overrideFWTitle',
            },
            {
                userFriendlyName: 'capabilityContentList',
                type: 'boolean',
                varName: 'capabilityContentList',
            },
            {
                userFriendlyName: 'capabilityPlaybackControl',
                type: 'boolean',
                varName: 'capabilityPlaybackControl',
            },
            {
                userFriendlyName: 'capabilityMetadataEdit',
                type: 'boolean',
                varName: 'capabilityMetadataEdit',
            },
            {
                userFriendlyName: 'capabilityTrackUpload',
                type: 'boolean',
                varName: 'capabilityTrackUpload',
            },
            {
                userFriendlyName: 'capabilityTrackDownload',
                type: 'boolean',
                varName: 'capabilityTrackDownload',
            },
            {
                userFriendlyName: 'capabilityDiscEject',
                type: 'boolean',
                varName: 'capabilityDiscEject',
            },
            {
                userFriendlyName: 'capabilityFactoryMode',
                type: 'boolean',
                varName: 'capabilityFactoryMode',
            }
        ]
    },*/
];

function getDefaultForType(type: CustomParameterType) {
    switch (type) {
        case 'boolean':
            return false;
        case 'string':
            return '';
        case 'number':
            return 0;
    }
}

export function initializeParameters(service: ServicePrototype) {
    let emptyParameters: CustomParameters = {};
    let parametersDefinition = service.customParameters!;
    for (let param of parametersDefinition) {
        emptyParameters[param.varName] = param.defaultValue || getDefaultForType(param.type);
    }
    return emptyParameters;
}

export function getSimpleServices() {
    return Services.filter(n => !n.customParameters).map(n => ({
        name: n.name,
    }));
}

function getPrototypeByName(name: string) {
    return Services.find(n => n.name === name) || null;
}

export function filterOutCorrupted(savedCustomServices: ServiceConstructionInfo[]) {
    const legalCustomServices: ServiceConstructionInfo[] = [];
    for (const info of savedCustomServices) {
        const prototype = getPrototypeByName(info.name);
        if (!prototype) continue; // No such service - remove.
        const requiredParameters = prototype.customParameters;
        const parameterKeys = Object.keys(info.parameters!);
        if (!requiredParameters) continue; // The service cannot be a custom service - no props to set.
        if (requiredParameters.length !== parameterKeys.length) continue; // Invalid config.
        if (
            requiredParameters.filter(n => parameterKeys.includes(n.varName) && typeof info.parameters![n.varName] === n.type).length !==
            requiredParameters.length
        )
            continue; // The service's parameters differ from the prototype's declaration.
        legalCustomServices.push(info);
    }
    return legalCustomServices;
}

export function createService(info: ServiceConstructionInfo) {
    return getPrototypeByName(info.name)?.create(info.parameters);
}

export function getConnectButtonName(service: ServiceConstructionInfo) {
    return getPrototypeByName(service.name)!.getConnectName(service.parameters);
}
